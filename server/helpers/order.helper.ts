import crypto from "crypto"
import path from "path"
import moment from "moment"
import slugify from "slugify"
import { Order } from "../models/order.model"
import { Product } from "../models/product.model"
import { Coupon } from "../models/coupon.model"
import {
  apishipAutoCreateShipment,
  apishipStatusSyncMinutes,
  orderStatusList,
  pathAdmin,
  shopUtcOffset
} from "../config/variable.config"
import { createRefund, getPayment, getPaymentProvider, PaymentInfo } from "./payment.helper"
import {
  cancelShipment,
  createShipment,
  getNextPickupDate,
  getShipmentStatus,
  getOrderProviderName,
  getShipmentStatuses,
  isApishipConfigured
} from "./apiship.helper"
import { formatNumber, formatPrice } from "./format.helper"
import { localizedName, translate } from "./language.helper"
import { sendMail } from "./mail.helper"
import { getSiteUrl } from "./site-url.helper"

const pug = require("pug") // dùng require vì thư viện pug không có sẵn khai báo kiểu cho TypeScript

// ===== Đơn hàng: tạo mã, giữ hàng, thanh toán, vận đơn, huỷ đơn =====
// Người thay đổi trạng thái ghi trong lịch sử đơn hàng
export const orderBySystem = "Hệ thống"
export const orderByCustomer = "Khách hàng"

// Mã đơn hàng cho khách: SF-năm tháng ngày (giờ Moscow)-4 số ngẫu nhiên, ví dụ SF-261105-4821
export const generateOrderCode = (): string => {
  const date = moment().utcOffset(shopUtcOffset).format("YYMMDD")
  const random = crypto.randomInt(0, 10000).toString().padStart(4, "0")
  return `SF-${date}-${random}`
}

// Mã bí mật trong link xem đơn hàng của khách (32 ký tự 0-9, a-f)
export const generateOrderAccessKey = (): string => {
  return crypto.randomBytes(16).toString("hex")
}

export const isValidOrderAccessKey = (key: any): key is string => {
  return typeof key === "string" && /^[a-f0-9]{32}$/.test(key)
}

// Tìm đơn hàng khách được xem: đúng mã bí mật trong link (?key=...), hoặc đơn của tài khoản đang đăng nhập
// Dùng ở trang đơn hàng và trang viết đánh giá sản phẩm
export const findCustomerOrder = async (code: any, key: any, account: any) => {
  const orderCode = `${code || ""}`
  if(!/^SF-\d{6}-\d{4}$/.test(orderCode)) return null

  const order: any = await Order.findOne({ code: orderCode })
  if(!order) return null

  const isOwner = account && order.userId && order.userId === account.id
  const hasKey = isValidOrderAccessKey(key) && key === order.accessKey

  return isOwner || hasKey ? order : null
}

// Link xem đơn hàng của khách (gửi trong email, Т-Банк chuyển khách về link này sau khi thanh toán)
export const getOrderUrl = (order: any, absolute: boolean = false): string => {
  return `${absolute ? getSiteUrl() : ""}/order/${order.code}?key=${order.accessKey}`
}

// Chuỗi tìm kiếm đơn hàng ở trang admin: mã đơn, họ tên, số điện thoại, email
// Lưu cả chữ gốc (tiếng Nga) và chữ đã bỏ dấu / chuyển sang chữ latin, gõ kiểu nào cũng tìm được
export const buildOrderSearch = (code: string, customer: { fullName: string, phone: string, email: string }): string => {
  const text = [code, customer.fullName, customer.phone, customer.email].join(" ").toLowerCase()
  return `${text} ${slugify(text, { replacement: " ", lower: true })}`
}

// Từ khoá tìm đơn hàng => điều kiện tìm (chữ gốc hoặc chữ đã chuyển sang latin)
export const buildOrderKeywordFind = (keyword: string): any => {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const raw = keyword.trim().toLowerCase()
  const slug = slugify(raw, { replacement: " ", lower: true })
  const orList: any[] = [{ search: new RegExp(escape(raw), "i") }]
  if(slug && slug !== raw) orList.push({ search: new RegExp(escape(slug), "i") })

  // Số điện thoại gõ có khoảng trắng, dấu gạch: tìm theo các chữ số
  const digits = raw.replace(/\D/g, "")
  if(digits.length >= 5 && /^[\d\s()+-]+$/.test(raw)){
    orList.push({ "customer.phone": new RegExp(digits.length >= 10 ? digits.slice(-10) : digits) })
  }
  return { $or: orList }
}

const historyEntry = (status: string, note: string, by: string) => ({
  status: status,
  note: note,
  by: by,
  at: new Date()
})

// ===== Giữ hàng trong kho =====
// Trừ tồn kho ngay lúc đặt hàng (giữ hàng cho khách trong lúc thanh toán)
// Mỗi sản phẩm trừ bằng 1 lệnh có điều kiện "tồn kho đủ", 2 khách cùng mua sản phẩm cuối cùng thì chỉ 1 người mua được
// Sản phẩm nào không đủ hàng thì trả lại các sản phẩm đã trừ trước đó, trả về sản phẩm bị thiếu
export const reserveStock = async (items: { productId: string, quantity: number, name: string }[]) => {
  const reservedList: { productId: string, quantity: number }[] = []

  for (const item of items) {
    const result = await Product.updateOne({
      _id: item.productId,
      deleted: false,
      status: "active",
      stock: { $gte: item.quantity }
    }, {
      $inc: { stock: -item.quantity }
    })

    if(result.modifiedCount === 0){
      for (const reserved of reservedList) {
        await Product.updateOne({ _id: reserved.productId }, { $inc: { stock: reserved.quantity } })
      }
      return { ok: false, failedItem: item }
    }

    reservedList.push({ productId: item.productId, quantity: item.quantity })
  }

  return { ok: true, failedItem: null }
}

// Trả lại hàng vào kho và lượt dùng mã giảm giá khi đơn bị huỷ
// Dùng cờ stockReleased để chỉ trả 1 lần (dù có nhiều yêu cầu huỷ cùng lúc)
// - wasPaid: đơn đã thanh toán (đã cộng số lượng đã bán) thì trừ lại số lượng đã bán
const releaseOrderResources = async (orderId: any, wasPaid: boolean) => {
  const order: any = await Order.findOneAndUpdate({
    _id: orderId,
    stockReleased: false
  }, {
    $set: { stockReleased: true }
  })
  if(!order) return

  for (const item of order.items) {
    await Product.updateOne({
      _id: item.productId
    }, {
      $inc: wasPaid
        ? { stock: item.quantity, sold: -item.quantity }
        : { stock: item.quantity }
    })
  }

  if(order.couponCode){
    await Coupon.updateOne({
      code: order.couponCode,
      usedCount: { $gt: 0 }
    }, {
      $inc: { usedCount: -1 }
    })
  }
}

// ===== Mã giảm giá =====
// Tăng lượt dùng của mã lúc đặt hàng, có điều kiện "chưa hết lượt" để 2 khách cùng dùng lượt cuối cùng thì chỉ 1 người dùng được
export const claimCouponUsage = async (couponId: string): Promise<boolean> => {
  const result = await Coupon.updateOne({
    _id: couponId,
    $or: [
      { usageLimit: null },
      { usageLimit: 0 },
      { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
    ]
  }, {
    $inc: { usedCount: 1 }
  })
  return result.modifiedCount > 0
}

export const releaseCouponUsage = async (couponId: string) => {
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
}

// Số đơn (chưa bị huỷ) khách đã dùng mã này, để kiểm tra "Số lần mỗi khách được dùng"
// Khách tính theo tài khoản, email hoặc số điện thoại (khách chưa đăng nhập cũng không dùng mã quá số lần)
export const countCustomerCouponUsage = async (couponCode: string, customer: { userId?: string, email: string, phone: string }) => {
  const customerFind: any[] = [
    { "customer.email": customer.email },
    { "customer.phone": customer.phone }
  ]
  if(customer.userId) customerFind.push({ userId: customer.userId })

  return await Order.countDocuments({
    couponCode: couponCode,
    status: { $ne: "cancelled" },
    $or: customerFind
  })
}

// ===== Thanh toán =====
// Cập nhật đơn hàng theo trạng thái thanh toán mới nhất
export const applyPaymentInfo = async (order: any, info: PaymentInfo | null) => {
  if(!info) return
  if(info.status === "succeeded"){
    await markOrderPaid(order, info)
  }
  else if(info.status === "canceled"){
    await markPaymentCanceled(order, info.cancelReason)
  }
}

// Hỏi trạng thái thanh toán (Т-Банк) rồi cập nhật đơn hàng
// Gọi khi khách quay lại trang đơn hàng sau khi thanh toán, và tự động mỗi phút (đơn đang chờ thanh toán)
export const syncOrderPayment = async (order: any) => {
  if(order.payment?.status !== "pending" || order.payment?.provider !== "tbank") return
  try {
    const info = await getPayment(order)
    await applyPaymentInfo(order, info)
  } catch (error) {
    console.log(`Không lấy được trạng thái thanh toán đơn ${order.code}:`, (error as Error).message)
  }
}

// Khách đã thanh toán
// - Đơn đang chờ thanh toán: chuyển sang "Đã thanh toán", cộng số lượng đã bán
// - Đơn đã tự huỷ vì quá hạn nhưng khách vẫn thanh toán xong (thanh toán chậm): mở lại đơn, trừ lại tồn kho
//   (có thể bị âm nếu hàng đã bán cho khách khác, ghi chú để nhân viên kiểm tra / hoàn tiền)
// Dùng lệnh cập nhật có điều kiện để chỉ xử lý 1 lần (Т-Банк báo về, khách mở trang đơn hàng, tự động kiểm tra cùng lúc)
export const markOrderPaid = async (order: any, info: PaymentInfo) => {
  const paymentSet = {
    "payment.status": "succeeded",
    "payment.paidAt": info.paidAt || new Date(),
    "payment.method": info.method || ""
  }

  let paidOrder: any = await Order.findOneAndUpdate({
    _id: order._id,
    status: "pending",
    "payment.status": { $in: ["pending", "canceled"] }
  }, {
    $set: { ...paymentSet, status: "paid" },
    $push: { statusHistory: historyEntry("paid", "Khách đã thanh toán", orderBySystem) }
  }, {
    new: true
  })

  if(paidOrder){
    for (const item of paidOrder.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { sold: item.quantity } })
    }
  }
  else {
    paidOrder = await Order.findOneAndUpdate({
      _id: order._id,
      status: "cancelled",
      stockReleased: true,
      "payment.status": { $in: ["pending", "canceled"] }
    }, {
      $set: { ...paymentSet, status: "paid", stockReleased: false },
      $push: {
        statusHistory: historyEntry(
          "paid",
          "Khách thanh toán sau khi đơn đã tự huỷ (quá hạn thanh toán): đơn được mở lại, kiểm tra tồn kho trước khi gửi hàng",
          orderBySystem
        )
      }
    }, {
      new: true
    })
    if(!paidOrder) return // đã xử lý trước đó

    for (const item of paidOrder.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity, sold: item.quantity } })
    }
    if(paidOrder.couponCode){
      await Coupon.updateOne({ code: paidOrder.couponCode }, { $inc: { usedCount: 1 } })
    }
  }

  sendOrderPaidEmails(paidOrder).catch(error => console.log("Gửi email đơn hàng đã thanh toán thất bại:", error))

  if(apishipAutoCreateShipment && isApishipConfigured()){
    try {
      await createOrderShipment(paidOrder, getNextPickupDate(), orderBySystem)
    } catch (error) {
      console.log(`Tự động tạo vận đơn cho đơn ${paidOrder.code} thất bại:`, (error as Error).message)
    }
  }
}

// Thanh toán bị huỷ / lỗi (khách bấm huỷ, thẻ bị từ chối, hết hạn link thanh toán của Т-Банк)
// Đơn vẫn giữ trạng thái "Chờ thanh toán" để khách bấm "Оплатить" thử lại, đến hạn thanh toán thì đơn tự huỷ
export const markPaymentCanceled = async (order: any, reason: string) => {
  await Order.updateOne({
    _id: order._id,
    "payment.status": "pending"
  }, {
    $set: {
      "payment.status": "canceled",
      "payment.cancelReason": reason || ""
    }
  })
}

// Huỷ đơn chưa thanh toán: trả hàng vào kho, trả lượt dùng mã giảm giá
export const cancelUnpaidOrder = async (order: any, reason: string, by: string): Promise<boolean> => {
  const cancelled = await Order.findOneAndUpdate({
    _id: order._id,
    status: "pending"
  }, {
    $set: { status: "cancelled", cancelReason: reason },
    $push: { statusHistory: historyEntry("cancelled", reason, by) }
  })
  if(!cancelled) return false

  await releaseOrderResources(order._id, false)
  return true
}

// ===== Vận đơn ApiShip =====
// Đơn được tạo vận đơn: đã thanh toán, chưa có vận đơn
export const canCreateShipment = (order: any): boolean => {
  return order.status === "paid" && order.payment?.status === "succeeded" && !order.shipment?.orderId
}

// Tạo vận đơn ApiShip cho đơn đã thanh toán (khách phải trả tiền trước mới gửi hàng)
// - pickupDate: ngày giao hàng cho hãng vận chuyển (YYYY-MM-DD)
// Lỗi thì ghi lỗi vào đơn (hiện ở trang admin) rồi báo lỗi cho người bấm
export const createOrderShipment = async (order: any, pickupDate: string, by: string) => {
  if(!canCreateShipment(order)){
    throw new Error("Chỉ tạo được vận đơn cho đơn đã thanh toán và chưa có vận đơn")
  }

  // Khoá đơn trong lúc tạo vận đơn (2 phút) để bấm 2 lần không tạo ra 2 vận đơn
  const now = new Date()
  const locked = await Order.findOneAndUpdate({
    _id: order._id,
    status: "paid",
    "payment.status": "succeeded",
    "shipment.orderId": null,
    $or: [
      { "shipment.lockedAt": null },
      { "shipment.lockedAt": { $lt: new Date(now.getTime() - 2 * 60 * 1000) } }
    ]
  }, {
    $set: { "shipment.lockedAt": now }
  })
  if(!locked){
    throw new Error("Đơn hàng đang được tạo vận đơn hoặc đã có vận đơn, vui lòng tải lại trang")
  }

  try {
    const { orderId } = await createShipment(order, pickupDate)

    await Order.updateOne({ _id: order._id }, {
      $set: {
        status: "shipping",
        "shipment.orderId": orderId,
        "shipment.pickupDate": pickupDate,
        "shipment.createdAt": new Date(),
        "shipment.error": "",
        "shipment.statusKey": "",
        "shipment.statusName": "",
        "shipment.providerNumber": "",
        "shipment.trackingUrl": ""
      },
      $unset: { "shipment.lockedAt": "" },
      $push: {
        statusHistory: historyEntry("shipping", `Tạo vận đơn ApiShip #${orderId} (${getOrderProviderName(order.delivery)}), ngày gửi hàng ${pickupDate}`, by)
      }
    })

    // Lấy luôn trạng thái, mã vận đơn của hãng (hãng có thể cần vài phút mới cấp mã, lần tự động cập nhật sau sẽ lấy tiếp)
    await refreshShipmentStatus(await Order.findById(order._id))
  } catch (error) {
    await Order.updateOne({ _id: order._id }, {
      $set: { "shipment.error": (error as Error).message },
      $unset: { "shipment.lockedAt": "" }
    })
    throw error
  }
}

// Cập nhật trạng thái vận đơn theo dữ liệu ApiShip: { orderInfo: { providerNumber, trackingUrl }, status: { key, name, description, created } }
// - delivered: đơn chuyển sang "Đã giao"
// - returned: đơn chuyển sang "Bị hoàn về"
// - uploadingError: hãng vận chuyển không nhận vận đơn (sai địa chỉ, sai kích thước,...): đơn trở lại "Đã thanh toán",
//   nhân viên xem lỗi, sửa rồi tạo lại vận đơn
export const applyShipmentStatus = async (order: any, data: any) => {
  if(!order?.shipment?.orderId || !data) return

  const info = data.orderInfo || {}
  const status = data.status || {}
  const key = `${status.key || ""}`
  const set: any = {
    "shipment.statusKey": key,
    "shipment.statusName": `${status.name || ""}`,
    "shipment.statusDescription": `${status.description || status.providerDescription || ""}`,
    "shipment.statusUpdatedAt": status.created ? new Date(status.created) : new Date()
  }
  if(info.providerNumber) set["shipment.providerNumber"] = `${info.providerNumber}`
  if(info.trackingUrl) set["shipment.trackingUrl"] = `${info.trackingUrl}`

  const update: any = { $set: set }
  const find: any = { _id: order._id, "shipment.orderId": order.shipment.orderId }

  if(key === "delivered" && order.status === "shipping"){
    set.status = "delivered"
    update.$push = { statusHistory: historyEntry("delivered", `${status.name || "Доставлен"}`, orderBySystem) }
    find.status = "shipping"
  }
  else if(key === "returned" && order.status === "shipping"){
    set.status = "returned"
    update.$push = { statusHistory: historyEntry("returned", `${status.name || "Возвращен отправителю"}`, orderBySystem) }
    find.status = "shipping"
  }
  else if(key === "uploadingError" && order.status === "shipping"){
    set.status = "paid"
    set["shipment.error"] = `${status.description || status.name || "Hãng vận chuyển không nhận vận đơn"}`
    set["shipment.orderId"] = null
    update.$push = {
      statusHistory: historyEntry(
        "paid",
        `Vận đơn ApiShip #${order.shipment.orderId} bị lỗi: ${set["shipment.error"]}. Sửa thông tin rồi tạo lại vận đơn`,
        orderBySystem
      )
    }
    find.status = "shipping"
  }

  await Order.updateOne(find, update)

  // Hãng vận chuyển đã cấp mã vận đơn: gửi email cho khách (1 lần)
  if(info.providerNumber && !order.shipment.notifiedAt && key !== "uploadingError"){
    const notified = await Order.findOneAndUpdate({
      _id: order._id,
      "shipment.notifiedAt": null
    }, {
      $set: { "shipment.notifiedAt": new Date() }
    }, {
      new: true
    })
    if(notified){
      sendOrderShippedEmail(notified).catch(error => console.log("Gửi email mã vận đơn thất bại:", error))
    }
  }
}

// Lấy trạng thái mới nhất của 1 vận đơn từ ApiShip
export const refreshShipmentStatus = async (order: any) => {
  if(!order?.shipment?.orderId) return
  const data = await getShipmentStatus(order.shipment.orderId)
  await applyShipmentStatus(order, data)
}

// Huỷ vận đơn ApiShip (hãng chưa nhận hàng): đơn trở lại "Đã thanh toán", tạo lại vận đơn được
export const cancelOrderShipment = async (order: any, by: string) => {
  if(!order.shipment?.orderId || order.status !== "shipping"){
    throw new Error("Đơn hàng không có vận đơn đang giao")
  }

  await cancelShipment(order.shipment.orderId)

  await Order.updateOne({
    _id: order._id,
    status: "shipping"
  }, {
    $set: {
      status: "paid",
      "shipment.orderId": null,
      "shipment.providerNumber": "",
      "shipment.trackingUrl": "",
      "shipment.statusKey": "",
      "shipment.statusName": "",
      "shipment.statusDescription": "",
      "shipment.error": ""
    },
    $unset: { "shipment.notifiedAt": "" },
    $push: { statusHistory: historyEntry("paid", `Huỷ vận đơn ApiShip #${order.shipment.orderId}`, by) }
  })
}

// ===== Huỷ đơn (trang admin) =====
// - Chưa thanh toán: huỷ, trả hàng vào kho
// - Đã thanh toán, chưa gửi hàng: hoàn tiền cho khách qua Т-Банк rồi huỷ
// - Đang giao: phải huỷ vận đơn trước; đã giao / bị hoàn về: không huỷ được (hoàn tiền trong trang Т-Бизнес nếu cần)
export const cancelOrderByAdmin = async (order: any, reason: string, by: string) => {
  if(order.status === "pending"){
    const ok = await cancelUnpaidOrder(order, reason || "Cửa hàng huỷ đơn", by)
    if(!ok) throw new Error("Đơn hàng đã thay đổi trạng thái, vui lòng tải lại trang")
    return "Đã huỷ đơn hàng"
  }

  if(order.status === "shipping"){
    throw new Error("Đơn đang giao: hãy huỷ vận đơn trước (nút \"Huỷ vận đơn\"), sau đó mới huỷ đơn và hoàn tiền")
  }

  if(order.status !== "paid" || order.payment?.status !== "succeeded"){
    throw new Error("Không huỷ được đơn hàng ở trạng thái này")
  }

  // Khoá đơn trong lúc hoàn tiền (chuyển trạng thái thanh toán sang "refunding"):
  // bấm 2 lần / 2 nhân viên cùng bấm thì chỉ 1 lần gửi yêu cầu hoàn tiền sang Т-Банк
  const locked = await Order.findOneAndUpdate({
    _id: order._id,
    status: "paid",
    "payment.status": "succeeded"
  }, {
    $set: { "payment.status": "refunding" }
  })
  if(!locked) throw new Error("Đơn hàng đã thay đổi trạng thái, vui lòng tải lại trang")

  let refund
  try {
    refund = await createRefund(order, reason)
  } catch (error) {
    await Order.updateOne({ _id: order._id, "payment.status": "refunding" }, { $set: { "payment.status": "succeeded" } })
    throw error
  }

  const cancelled = await Order.findOneAndUpdate({
    _id: order._id,
    status: "paid",
    "payment.status": "refunding"
  }, {
    $set: {
      status: "cancelled",
      cancelReason: reason,
      "payment.status": "refunded",
      "payment.refundId": refund.refundId,
      "payment.refundedAt": new Date()
    },
    $push: {
      statusHistory: historyEntry(
        "cancelled",
        `Huỷ đơn và hoàn ${formatPrice(order.total)} cho khách${refund.status === "pending" ? " (Т-Банк đang xử lý hoàn tiền)" : ""}${reason ? `. Lý do: ${reason}` : ""}`,
        by
      )
    }
  })
  if(!cancelled) throw new Error("Đơn hàng đã thay đổi trạng thái, vui lòng tải lại trang")

  await releaseOrderResources(order._id, true)
  return `Đã huỷ đơn và hoàn ${formatPrice(order.total)} cho khách`
}

// Nhân viên tự đánh dấu "Đã giao hàng" (ví dụ tự giao, hoặc hãng vận chuyển không cập nhật trạng thái)
export const markOrderDelivered = async (order: any, by: string) => {
  const result = await Order.updateOne({
    _id: order._id,
    status: { $in: ["paid", "shipping"] },
    "payment.status": "succeeded"
  }, {
    $set: { status: "delivered" },
    $push: { statusHistory: historyEntry("delivered", "Nhân viên đánh dấu đã giao hàng", by) }
  })
  if(result.modifiedCount === 0){
    throw new Error("Chỉ đánh dấu được đơn đã thanh toán, đang chờ gửi hoặc đang giao")
  }
}

// ===== Tự động chạy định kỳ =====
// Mỗi phút:
// - hỏi Т-Банк trạng thái các thanh toán đang chờ (phòng khi Т-Банк không gửi được thông báo về webhook,
//   ví dụ chạy trên máy cá nhân không có địa chỉ công khai)
// - huỷ đơn quá hạn thanh toán (orderPaymentTimeoutMinutes), trả hàng vào kho
export const checkPendingPayments = async () => {
  try {
    // Thanh toán đang chờ trong 2 ngày gần đây (kể cả đơn đã tự huỷ: khách có thể thanh toán chậm)
    if(getPaymentProvider() === "tbank"){
      const pendingList: any[] = await Order.find({
        "payment.provider": "tbank",
        "payment.status": "pending",
        "payment.paymentId": { $nin: [null, ""] },
        createdAt: {
          $gt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          $lt: new Date(Date.now() - 30 * 1000)
        }
      }).limit(100)

      for (const order of pendingList) {
        await syncOrderPayment(order)
      }
    }

    const expiredList: any[] = await Order.find({
      status: "pending",
      paymentExpireAt: { $lt: new Date() }
    }).limit(100)

    for (const order of expiredList) {
      // Hỏi lần cuối trước khi huỷ
      await syncOrderPayment(order)
      const fresh: any = await Order.findById(order._id)
      if(fresh && fresh.status === "pending"){
        await cancelUnpaidOrder(fresh, "Hết thời gian thanh toán", orderBySystem)
      }
    }
  } catch (error) {
    console.log("Kiểm tra thanh toán đơn hàng thất bại")
    console.log(error)
  }
}

// Cập nhật trạng thái các vận đơn đang giao từ ApiShip (mỗi apishipStatusSyncMinutes phút)
export const syncShipmentStatuses = async () => {
  if(!isApishipConfigured()) return

  try {
    const orderList: any[] = await Order.find({
      status: "shipping",
      "shipment.orderId": { $ne: null }
    }).select("code status shipment")

    for (let index = 0; index < orderList.length; index += 100) {
      const batch = orderList.slice(index, index + 100)
      const data = await getShipmentStatuses(batch.map(order => order.shipment.orderId))

      for (const item of data?.succeedOrders || []) {
        const order = batch.find(order => order.shipment.orderId === Number(item.orderInfo?.orderId))
        if(order) await applyShipmentStatus(order, item)
      }
    }
  } catch (error) {
    console.log("Cập nhật trạng thái vận đơn ApiShip thất bại:", (error as Error).message)
  }
}

export const scheduleOrderJobs = () => {
  checkPendingPayments()
  setInterval(checkPendingPayments, 60 * 1000)

  syncShipmentStatuses()
  setInterval(syncShipmentStatuses, Math.max(5, apishipStatusSyncMinutes) * 60 * 1000)
}

// ===== Email =====
// Email gửi từ việc chạy ngầm (không có res.render), nên tạo HTML bằng pug.renderFile, từ ngữ theo ngôn ngữ khách đặt hàng
const renderEmail = (order: any, type: "paid" | "shipped"): { subject: string, html: string, text: string } => {
  const lang = order.lang || "ru"
  const t = (key: string) => translate(lang, key)
  const orderUrl = getOrderUrl(order, true)
  const subject = `${t(type === "paid" ? "orderEmailPaidSubject" : "orderEmailShippedSubject")} ${order.code} — SFoodie`

  const html = pug.renderFile(path.join(__dirname, "../views/client/emails/order.pug"), {
    lang: lang,
    t: t,
    tName: (item: any) => localizedName(item, lang),
    formatPrice: formatPrice,
    formatNumber: formatNumber,
    order: order,
    type: type,
    orderUrl: orderUrl,
    providerName: getOrderProviderName(order.delivery),
    subject: subject
  })

  const lines = [
    `${t("hello")}, ${order.customer.fullName}!`,
    "",
    t(type === "paid" ? "orderEmailPaidText" : "orderEmailShippedText"),
    `${t("orderNumber")}: ${order.code}`
  ]
  if(type === "shipped"){
    lines.push(`${t("deliveryService")}: ${getOrderProviderName(order.delivery)}`)
    if(order.shipment?.providerNumber) lines.push(`${t("trackingNumber")}: ${order.shipment.providerNumber}`)
    if(order.shipment?.trackingUrl) lines.push(order.shipment.trackingUrl)
  }
  else {
    for (const item of order.items) {
      lines.push(`- ${localizedName(item, lang)} × ${item.quantity} = ${formatPrice(item.lineTotal)}`)
    }
    lines.push(`${t("total")}: ${formatPrice(order.total)}`)
  }
  lines.push("", `${t("orderEmailLink")}: ${orderUrl}`, "", "SFoodie")

  return { subject, html, text: lines.join("\n") }
}

// Khách đã thanh toán: email xác nhận cho khách + email báo đơn mới cho cửa hàng (ORDER_NOTIFY_EMAIL)
export const sendOrderPaidEmails = async (order: any) => {
  if(order.customer?.email){
    const mail = renderEmail(order, "paid")
    await sendMail({ to: order.customer.email, ...mail })
  }

  const notifyEmail = `${process.env.ORDER_NOTIFY_EMAIL || ""}`.trim()
  if(notifyEmail){
    const deliveryText = order.delivery.type === "point"
      ? `Điểm nhận hàng: ${order.delivery.point?.address || ""}`
      : `Địa chỉ: ${order.delivery.address || ""}`
    const lines = [
      `Đơn hàng mới đã thanh toán: ${order.code}`,
      `Khách hàng: ${order.customer.fullName}, ${order.customer.phone}, ${order.customer.email}`,
      `Tổng tiền: ${formatPrice(order.total)} (phí giao hàng ${formatPrice(order.deliveryCost)})`,
      `Giao hàng: ${getOrderProviderName(order.delivery)} — ${order.delivery.tariffName}`,
      deliveryText,
      "",
      ...order.items.map((item: any) => `- ${item.name} × ${item.quantity} = ${formatPrice(item.lineTotal)}`),
      "",
      `Xem đơn hàng: ${getSiteUrl()}/${pathAdmin}/order/detail/${order.id}`
    ]
    const text = lines.join("\n")
    await sendMail({
      to: notifyEmail,
      subject: `Đơn hàng mới ${order.code} — ${formatPrice(order.total)}`,
      text: text,
      html: `<pre style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(text)}</pre>`
    })
  }
}

// Hãng vận chuyển đã nhận vận đơn: email mã vận đơn (tra cứu hành trình) cho khách
export const sendOrderShippedEmail = async (order: any) => {
  if(!order.customer?.email) return
  const mail = renderEmail(order, "shipped")
  await sendMail({ to: order.customer.email, ...mail })
}

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ===== Hiển thị =====
// Tên trạng thái đơn hàng theo ngôn ngữ khách (trang khách hàng)
export const getOrderStatusInfo = (status: string) => {
  return orderStatusList.find(item => item.id === status) || orderStatusList[0]
}
