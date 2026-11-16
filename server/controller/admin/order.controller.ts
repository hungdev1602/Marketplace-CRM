import { Request, Response } from "express"
import mongoose from "mongoose"
import { Order } from "../../models/order.model"
import {
  orderDeliveryTypeList,
  orderPaymentStatusList,
  orderStatusList,
  pathAdmin,
  productUnitList
} from "../../config/variable.config"
import { formatPrice } from "../../helpers/format.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { writeLog } from "../../helpers/activity-log.helper"
import {
  getNextPickupDate,
  getOrderProviderName,
  getWaybills,
  isApishipConfigured,
  isApishipSenderMissing,
  isApishipTest
} from "../../helpers/apiship.helper"
import { getPaymentProvider } from "../../helpers/payment.helper"
import {
  buildOrderKeywordFind,
  canCreateShipment,
  cancelOrderByAdmin,
  cancelOrderShipment,
  createOrderShipment,
  getOrderUrl,
  markOrderDelivered,
  refreshShipmentStatus,
  syncOrderPayment
} from "../../helpers/order.helper"

// ===== Quản lý đơn hàng (trang admin) =====
// Quy trình xử lý 1 đơn: khách thanh toán (trạng thái "Đã thanh toán") => nhân viên đóng hàng, bấm "Tạo vận đơn ApiShip"
// => in phiếu gửi hàng, giao cho hãng vận chuyển => trạng thái tự cập nhật từ ApiShip (đang giao, đã giao)

const orderOptions = {
  statusList: orderStatusList,
  paymentStatusList: orderPaymentStatusList,
  deliveryTypeList: orderDeliveryTypeList
}

const sendError = (res: Response, message: string) => {
  res.json({ code: "error", message: message })
}

// Tên nhân viên ghi vào lịch sử đơn hàng
const getAdminName = (res: Response): string => {
  const account = res.locals.account
  return account ? `${account.fullName} (${account.email})` : "Admin"
}

const findOrder = async (id: any) => {
  if(!mongoose.isValidObjectId(id)) return null
  return await Order.findById(id)
}

// Nhãn trạng thái (tên + màu) của 1 đơn
const addOrderDisplayInfo = (order: any) => {
  order.statusInfo = orderStatusList.find(item => item.id === order.status) || orderStatusList[0]
  order.paymentStatusInfo = orderPaymentStatusList.find(item => item.id === order.payment?.status) || orderPaymentStatusList[0]
  order.deliveryTypeInfo = orderDeliveryTypeList.find(item => item.id === order.delivery?.type)
  order.providerNameText = getOrderProviderName(order.delivery)
  order.createdAtFormat = formatShopDateTime(order.createdAt)
  order.totalFormat = formatPrice(order.total)
}

export const list = async (req: Request, res: Response) => {
  const find: any = {}

  if(req.query.keyword){
    Object.assign(find, buildOrderKeywordFind(`${req.query.keyword}`))
  }

  if(req.query.status && orderStatusList.some(item => item.id === req.query.status)){
    find.status = `${req.query.status}`
  }

  if(req.query.paymentStatus && orderPaymentStatusList.some(item => item.id === req.query.paymentStatus)){
    find["payment.status"] = `${req.query.paymentStatus}`
  }

  if(req.query.deliveryType && orderDeliveryTypeList.some(item => item.id === req.query.deliveryType)){
    find["delivery.type"] = `${req.query.deliveryType}`
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Math.floor(Number(req.query.page))
  }
  const totalRecord = await Order.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const orderList: any[] = await Order
    .find(find)
    .sort({ createdAt: "desc", _id: "desc" })
    .limit(limitItem)
    .skip(skip)

  for (const order of orderList) {
    addOrderDisplayInfo(order)
  }

  // Số đơn đang chờ gửi hàng (đã thanh toán, chưa tạo vận đơn): hiện nổi bật đầu trang
  const waitingShipmentCount = await Order.countDocuments({ status: "paid" })

  res.render("admin/pages/order-list", {
    pageTitle: "Quản lý đơn hàng",
    orderList: orderList,
    options: orderOptions,
    waitingShipmentCount: waitingShipmentCount,
    filter: {
      keyword: req.query.keyword || "",
      status: req.query.status || "",
      paymentStatus: req.query.paymentStatus || "",
      deliveryType: req.query.deliveryType || ""
    },
    pagination: pagination,
    page: page
  })
}

export const detail = async (req: Request, res: Response) => {
  let order: any = await findOrder(req.params.id)
  if(!order){
    res.redirect(`/${pathAdmin}/order/list`)
    return
  }

  // Đơn đang chờ thanh toán Т-Банк: hỏi trạng thái mới nhất
  if(order.payment?.status === "pending" && order.payment?.provider === "tbank"){
    await syncOrderPayment(order)
    order = await Order.findById(order.id)
  }

  addOrderDisplayInfo(order)
  for (const item of order.items) {
    item.unitName = productUnitList.find(unit => unit.id === item.unit)?.name || ""
  }
  for (const history of order.statusHistory) {
    history.atFormat = formatShopDateTime(history.at)
    history.statusName = orderStatusList.find(item => item.id === history.status)?.name || history.status
  }

  res.render("admin/pages/order-detail", {
    pageTitle: `Đơn hàng ${order.code}`,
    order: order,
    canCreateShipment: canCreateShipment(order),
    apishipConfigured: isApishipConfigured(),
    apishipTest: isApishipTest(),
    senderMissing: isApishipSenderMissing(),
    defaultPickupDate: getNextPickupDate(),
    paymentProvider: getPaymentProvider(),
    paidAtFormat: formatShopDateTime(order.payment?.paidAt),
    refundedAtFormat: formatShopDateTime(order.payment?.refundedAt),
    paymentExpireFormat: formatShopDateTime(order.paymentExpireAt),
    shipmentStatusFormat: formatShopDateTime(order.shipment?.statusUpdatedAt),
    customerOrderUrl: getOrderUrl(order)
  })
}

// Tạo vận đơn ApiShip: POST /admin/order/shipment/:id { pickupDate }
export const shipmentPost = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    if(!isApishipConfigured()){
      sendError(res, "Chưa cấu hình ApiShip hoặc kết nối ApiShip đang tắt (Admin => Kết nối API => ApiShip)")
      return
    }

    const pickupDate = `${req.body?.pickupDate || ""}`
    if(!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)){
      sendError(res, "Vui lòng chọn ngày giao hàng cho hãng vận chuyển!")
      return
    }

    await createOrderShipment(order, pickupDate, getAdminName(res))

    await writeLog(req, res, {
      module: "order",
      action: "shipment",
      description: `Tạo vận đơn ApiShip cho đơn hàng ${order.code} (${getOrderProviderName(order.delivery)})`,
      targetId: order.id
    })

    res.json({ code: "success", message: "Đã tạo vận đơn ApiShip!" })
  } catch (error) {
    sendError(res, `Tạo vận đơn thất bại: ${(error as Error).message}`)
  }
}

// Cập nhật trạng thái thanh toán / giao hàng ngay (không chờ tự động): PATCH /admin/order/refresh/:id
export const refreshPatch = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    await syncOrderPayment(order)
    if(order.shipment?.orderId){
      await refreshShipmentStatus(await Order.findById(order.id))
    }

    res.json({ code: "success", message: "Đã cập nhật trạng thái mới nhất!" })
  } catch (error) {
    sendError(res, `Cập nhật thất bại: ${(error as Error).message}`)
  }
}

// Phiếu gửi hàng (накладная) để in: POST /admin/order/waybill/:id => { url }
export const waybillPost = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order?.shipment?.orderId){
      sendError(res, "Đơn hàng chưa có vận đơn!")
      return
    }

    const data = await getWaybills([order.shipment.orderId])
    const file = data?.waybillItems?.find((item: any) => item.file)?.file
    if(!file){
      const failed = data?.failedOrders?.[0]?.message
      sendError(res, `Chưa lấy được phiếu gửi hàng${failed ? `: ${failed}` : ""}. Hãng vận chuyển có thể cần vài phút sau khi tạo vận đơn, vui lòng thử lại sau.`)
      return
    }

    res.json({ code: "success", url: file })
  } catch (error) {
    sendError(res, `Lấy phiếu gửi hàng thất bại: ${(error as Error).message}`)
  }
}

// Huỷ vận đơn ApiShip: PATCH /admin/order/cancel-shipment/:id
export const cancelShipmentPatch = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    await cancelOrderShipment(order, getAdminName(res))

    await writeLog(req, res, {
      module: "order",
      action: "shipment",
      description: `Huỷ vận đơn ApiShip #${order.shipment.orderId} của đơn hàng ${order.code}`,
      targetId: order.id
    })

    res.json({ code: "success", message: "Đã huỷ vận đơn, đơn hàng trở lại trạng thái chờ gửi hàng!" })
  } catch (error) {
    sendError(res, `Huỷ vận đơn thất bại: ${(error as Error).message}`)
  }
}

// Đánh dấu đã giao hàng: PATCH /admin/order/delivered/:id
export const deliveredPatch = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    await markOrderDelivered(order, getAdminName(res))

    await writeLog(req, res, {
      module: "order",
      action: "change-status",
      description: `Đánh dấu đã giao đơn hàng ${order.code}`,
      targetId: order.id
    })

    res.json({ code: "success", message: "Đã chuyển đơn hàng sang \"Đã giao hàng\"!" })
  } catch (error) {
    sendError(res, (error as Error).message)
  }
}

// Huỷ đơn (đã thanh toán thì hoàn tiền qua Т-Банк): PATCH /admin/order/cancel/:id { reason }
export const cancelPatch = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    const reason = `${req.body?.reason || ""}`.trim().slice(0, 300)
    const message = await cancelOrderByAdmin(order, reason, getAdminName(res))

    await writeLog(req, res, {
      module: "order",
      action: "cancel",
      description: `Huỷ đơn hàng ${order.code} (${formatPrice(order.total)})${reason ? `, lý do: ${reason}` : ""}`,
      targetId: order.id
    })

    res.json({ code: "success", message: `${message}!` })
  } catch (error) {
    sendError(res, `Huỷ đơn thất bại: ${(error as Error).message}`)
  }
}

// Ghi chú nội bộ: PATCH /admin/order/note/:id { adminNote }
export const notePatch = async (req: Request, res: Response) => {
  try {
    const order: any = await findOrder(req.params.id)
    if(!order){
      sendError(res, "Đơn hàng không tồn tại!")
      return
    }

    await Order.updateOne({ _id: order.id }, {
      adminNote: `${req.body?.adminNote || ""}`.trim().slice(0, 2000)
    })

    await writeLog(req, res, {
      module: "order",
      action: "edit",
      description: `Sửa ghi chú đơn hàng ${order.code}`,
      targetId: order.id
    })

    res.json({ code: "success", message: "Đã lưu ghi chú!" })
  } catch (error) {
    sendError(res, "Lưu ghi chú thất bại!")
  }
}
