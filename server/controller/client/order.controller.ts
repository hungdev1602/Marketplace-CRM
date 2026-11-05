import { Request, Response } from "express"
import { Order } from "../../models/order.model"
import { orderDeliveryTypeList, orderPaymentStatusList, orderStatusList } from "../../config/variable.config"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { buildClientPagination } from "../../helpers/pagination.helper"
import { createPayment, getPaymentProvider, PaymentError } from "../../helpers/payment.helper"
import {
  getOrderUrl,
  isValidOrderAccessKey,
  markOrderPaid,
  markPaymentCanceled,
  syncOrderPayment
} from "../../helpers/order.helper"
import * as errorController from "./error.controller"

// ===== Đơn hàng của khách =====
// - Trang đơn hàng: /order/:code?key=... (link gửi trong email, YooKassa chuyển khách về đây sau khi thanh toán)
//   Khách chưa đăng nhập xem đơn bằng mã bí mật key trong link, khách đã đăng nhập xem được đơn của tài khoản
// - Danh sách đơn hàng của tài khoản: /account/orders

// Tìm đơn hàng khách được xem: đúng mã bí mật trong link, hoặc đơn của tài khoản đang đăng nhập
const findCustomerOrder = async (req: Request, res: Response, key: any) => {
  const code = `${req.params.code || ""}`
  if(!/^SF-\d{6}-\d{4}$/.test(code)) return null

  const order: any = await Order.findOne({ code: code })
  if(!order) return null

  const account = res.locals.clientAccount
  const isOwner = account && order.userId && order.userId === account.id
  const hasKey = isValidOrderAccessKey(key) && key === order.accessKey

  return isOwner || hasKey ? order : null
}

// Bước của đơn hàng (thanh tiến trình ở trang đơn hàng)
const orderStepList = ["pending", "paid", "shipping", "delivered"]

// Dữ liệu hiển thị 1 đơn hàng
const buildOrderView = (order: any, res: Response) => {
  const statusInfo = orderStatusList.find(item => item.id === order.status) || orderStatusList[0]
  const paymentStatusInfo = orderPaymentStatusList.find(item => item.id === order.payment?.status) || orderPaymentStatusList[0]
  const deliveryTypeInfo = orderDeliveryTypeList.find(item => item.id === order.delivery?.type)

  return {
    order: order,
    statusName: res.locals.tName(statusInfo),
    paymentStatusName: res.locals.tName(paymentStatusInfo),
    deliveryTypeName: deliveryTypeInfo ? res.locals.tName(deliveryTypeInfo) : "",
    stepIndex: orderStepList.indexOf(order.status),
    createdAtFormat: formatShopDateTime(order.createdAt, "DD.MM.YYYY HH:mm"),
    paymentExpireFormat: formatShopDateTime(order.paymentExpireAt, "DD.MM.YYYY HH:mm"),
    paidAtFormat: formatShopDateTime(order.payment?.paidAt, "DD.MM.YYYY HH:mm"),
    canPay: order.status === "pending" && order.paymentExpireAt > new Date() && !!getPaymentProvider(),
    orderUrl: getOrderUrl(order)
  }
}

// Trang đơn hàng: /order/:code?key=...
export const detail = async (req: Request, res: Response) => {
  // Link có mã bí mật: không gửi địa chỉ trang này cho trang web khác (header Referer)
  res.set("Referrer-Policy", "no-referrer")

  try {
    let order: any = await findCustomerOrder(req, res, req.query.key)
    if(!order){
      errorController.notFound(req, res)
      return
    }

    // Khách vừa thanh toán xong quay lại: hỏi YooKassa trạng thái mới nhất
    if(order.payment?.status === "pending" && order.payment?.provider === "yookassa"){
      await syncOrderPayment(order)
      order = await Order.findById(order.id)
    }

    res.render("client/pages/order-detail", {
      pageTitle: `${res.locals.t("orderTitle")} ${order.code} — SFoodie`,
      orderView: buildOrderView(order, res),
      accessKey: order.accessKey
    })
  } catch (error) {
    console.log(error)
    errorController.notFound(req, res)
  }
}

// Thanh toán (lần đầu chưa xong, hoặc thanh toán trước bị lỗi): POST /order/:code/pay { key }
// - Thanh toán YooKassa trước đó vẫn đang chờ: mở lại đúng trang thanh toán đó (không tạo thanh toán mới)
// - Thanh toán trước bị huỷ / lỗi: tạo thanh toán mới
export const payPost = async (req: Request, res: Response) => {
  try {
    let order: any = await findCustomerOrder(req, res, req.body?.key)
    if(!order){
      res.json({ code: "error", message: res.locals.t("orderNotFound") })
      return
    }

    if(order.payment?.status === "pending" && order.payment?.provider === "yookassa"){
      await syncOrderPayment(order)
      order = await Order.findById(order.id)
    }

    if(order.status !== "pending" || !(order.paymentExpireAt > new Date())){
      res.json({ code: "success", redirect: getOrderUrl(order) })
      return
    }

    if(order.payment?.status === "pending" && order.payment?.confirmationUrl && order.payment?.provider === getPaymentProvider()){
      res.json({ code: "success", redirect: order.payment.confirmationUrl })
      return
    }

    const payment = await createPayment(order)
    await Order.updateOne({ _id: order.id, status: "pending" }, {
      $set: {
        "payment.provider": getPaymentProvider(),
        "payment.paymentId": payment.paymentId,
        "payment.confirmationUrl": payment.confirmationUrl,
        "payment.status": "pending",
        "payment.cancelReason": ""
      }
    })

    res.json({ code: "success", redirect: payment.confirmationUrl })
  } catch (error) {
    console.log(error instanceof PaymentError ? error.message : error)
    res.json({ code: "error", message: res.locals.t("paymentCreateError") })
  }
}

// ===== Thanh toán giả (PAYMENT_TEST_MODE=true, chỉ để thử trên máy) =====
const findTestPaymentOrder = async (req: Request, res: Response, key: any) => {
  if(getPaymentProvider() !== "test") return null
  const order: any = await findCustomerOrder(req, res, key)
  if(!order || order.payment?.provider !== "test") return null
  return order
}

// Trang thanh toán giả: /order/:code/test-payment?key=...
export const testPayment = async (req: Request, res: Response) => {
  res.set("Referrer-Policy", "no-referrer")
  const order: any = await findTestPaymentOrder(req, res, req.query.key)
  if(!order){
    errorController.notFound(req, res)
    return
  }

  res.render("client/pages/order-test-payment", {
    pageTitle: `${res.locals.t("testPaymentTitle")} — SFoodie`,
    order: order,
    canPay: order.status === "pending" && order.payment?.status === "pending"
  })
}

// Bấm nút ở trang thanh toán giả: POST /order/:code/test-payment { key, result: "success" | "cancel" }
export const testPaymentPost = async (req: Request, res: Response) => {
  try {
    const order: any = await findTestPaymentOrder(req, res, req.body?.key)
    if(!order){
      res.json({ code: "error", message: res.locals.t("orderNotFound") })
      return
    }

    if(req.body.result === "success"){
      await markOrderPaid(order, { status: "succeeded", method: "test", cancelReason: "", paidAt: new Date() })
    }
    else {
      await markPaymentCanceled(order, "canceled_by_customer")
    }

    res.json({ code: "success", redirect: getOrderUrl(order) })
  } catch (error) {
    console.log(error)
    res.json({ code: "error", message: res.locals.t("errorGeneral") })
  }
}

// ===== Đơn hàng của tài khoản: /account/orders =====
const accountOrderPerPage = 10

export const accountOrders = async (req: Request, res: Response) => {
  const account = res.locals.clientAccount
  const find = { userId: account.id }

  const totalRecord = await Order.countDocuments(find)
  const pagination = buildClientPagination(req, totalRecord, accountOrderPerPage)

  const orderList: any[] = await Order
    .find(find)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(accountOrderPerPage)

  res.render("client/pages/account-orders", {
    pageTitle: `${res.locals.t("myOrders")} — SFoodie`,
    orderViewList: orderList.map(order => buildOrderView(order, res)),
    pagination: pagination
  })
}
