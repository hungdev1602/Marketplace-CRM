import axios, { AxiosError } from "axios"
import crypto from "crypto"
import {
  yookassaDeliveryVatCode,
  yookassaReceiptPaymentMode,
  yookassaSendReceipt,
  yookassaVatCodeMap
} from "../config/variable.config"
import { getSiteUrl } from "./site-url.helper"

// ===== Thanh toán online =====
// - YooKassa (https://yookassa.ru): điền YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY trong file .env
//   Tài liệu API: https://yookassa.ru/developers/api
// - Thanh toán giả (PAYMENT_TEST_MODE=true): chỉ để thử trên máy khi chưa có tài khoản YooKassa,
//   mở trang có nút "Оплатить" / "Отменить" thay cho trang thanh toán thật
// Lưu ý: đọc process.env trong hàm (không đọc lúc import file), vì file .env được nạp sau khi import (index.ts)

const yookassaApiUrl = "https://api.yookassa.ru/v3"

export type PaymentProvider = "yookassa" | "test" | ""

// Cách thanh toán đang dùng, "" là chưa cấu hình (khách không đặt hàng được)
export const getPaymentProvider = (): PaymentProvider => {
  if(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY) return "yookassa"
  if(process.env.PAYMENT_TEST_MODE === "true") return "test"
  return ""
}

// Trạng thái thanh toán (chung cho các cách thanh toán)
// - pending: đang chờ khách thanh toán
// - succeeded: đã thanh toán
// - canceled: khách huỷ / thanh toán lỗi / hết hạn
export type PaymentInfo = {
  status: "pending" | "succeeded" | "canceled",
  method: string,
  cancelReason: string,
  paidAt: Date | null
}

export class PaymentError extends Error {}

const getYookassaAuth = () => ({
  username: `${process.env.YOOKASSA_SHOP_ID}`.trim(),
  password: `${process.env.YOOKASSA_SECRET_KEY}`.trim()
})

const getYookassaErrorMessage = (error: any): string => {
  const data = (error as AxiosError<any>)?.response?.data
  if(data?.description) return `YooKassa: ${data.description}`
  return `YooKassa: ${(error as Error)?.message || "lỗi không xác định"}`
}

// Số tiền theo định dạng YooKassa: chuỗi có 2 chữ số thập phân, ví dụ 1250.5 => "1250.50"
const formatAmount = (value: number): string => {
  return (Math.round(value * 100) / 100).toFixed(2)
}

// Chuyển thông tin thanh toán của YooKassa sang PaymentInfo
// Trạng thái YooKassa: pending, waiting_for_capture, succeeded, canceled
// (tạo thanh toán với capture: true nên không có bước waiting_for_capture, gặp thì coi như đang chờ)
const formatYookassaPayment = (payment: any): PaymentInfo => {
  const status = payment?.status === "succeeded" ? "succeeded" : payment?.status === "canceled" ? "canceled" : "pending"
  return {
    status: status,
    method: `${payment?.payment_method?.type || ""}`,
    cancelReason: `${payment?.cancellation_details?.reason || ""}`,
    paidAt: status === "succeeded" ? new Date(payment.captured_at || payment.created_at || Date.now()) : null
  }
}

// ===== Hoá đơn điện tử (чек 54-ФЗ) gửi kèm thanh toán (yookassaSendReceipt) =====
// Tổng tiền các dòng trên hoá đơn phải đúng bằng số tiền thanh toán, nên tiền giảm của mã giảm giá
// được chia vào từng sản phẩm theo tỉ lệ tiền hàng; dòng nào chia không chẵn kopeck thì tách làm 2 dòng
export const buildReceipt = (order: any) => {
  const items: any[] = []
  const goodsTotal = Math.round(((order.subtotal || 0) - (order.couponDiscount || 0)) * 100)
  const subtotal = Math.round((order.subtotal || 0) * 100)
  let restTotal = goodsTotal

  order.items.forEach((item: any, index: number) => {
    const lineTotal = Math.round(item.lineTotal * 100)
    // Dòng cuối lấy phần còn lại để tổng luôn đúng
    const lineAfterDiscount = index === order.items.length - 1
      ? restTotal
      : Math.round(subtotal > 0 ? lineTotal * goodsTotal / subtotal : lineTotal)
    restTotal -= lineAfterDiscount

    const vatCode = yookassaVatCodeMap[item.vat] || yookassaVatCodeMap["none"] || 1
    const description = `${item.nameRu || item.name}`.slice(0, 128)
    const addLine = (quantity: number, unitPrice: number) => {
      if(quantity <= 0) return
      items.push({
        description: description,
        quantity: quantity,
        amount: { value: formatAmount(unitPrice / 100), currency: "RUB" },
        vat_code: vatCode,
        payment_mode: yookassaReceiptPaymentMode,
        payment_subject: "commodity"
      })
    }

    const unitPrice = Math.floor(lineAfterDiscount / item.quantity)
    const remainder = lineAfterDiscount - unitPrice * item.quantity
    if(remainder === 0){
      addLine(item.quantity, unitPrice)
    }
    else {
      // Ví dụ 3 sản phẩm tổng 100,00 ₽: 2 x 33,33 + 1 x 33,34
      addLine(item.quantity - 1, unitPrice)
      addLine(1, unitPrice + remainder)
    }
  })

  if(order.deliveryCost > 0){
    items.push({
      description: "Доставка",
      quantity: 1,
      amount: { value: formatAmount(order.deliveryCost), currency: "RUB" },
      vat_code: yookassaDeliveryVatCode,
      payment_mode: yookassaReceiptPaymentMode,
      payment_subject: "service"
    })
  }

  const customer: any = {}
  if(order.customer.email) customer.email = order.customer.email
  if(order.customer.phone) customer.phone = `${order.customer.phone}`.replace(/\D/g, "")

  return { customer, items }
}

// ===== Tạo thanh toán =====
// Kết quả: { paymentId, confirmationUrl } - chuyển khách tới confirmationUrl để thanh toán
// Thanh toán xong (hoặc bấm quay lại) khách được chuyển về trang đơn hàng (returnUrl)
export const createPayment = async (order: any): Promise<{ paymentId: string, confirmationUrl: string }> => {
  const provider = getPaymentProvider()
  const returnUrl = `${getSiteUrl()}/order/${order.code}?key=${order.accessKey}`

  if(provider === "test"){
    return {
      paymentId: `test_${crypto.randomBytes(8).toString("hex")}`,
      confirmationUrl: `/order/${order.code}/test-payment?key=${order.accessKey}`
    }
  }

  if(provider !== "yookassa"){
    throw new PaymentError("Chưa cấu hình thanh toán online (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY trong file .env)")
  }

  const body: any = {
    amount: { value: formatAmount(order.total), currency: "RUB" },
    capture: true, // khách thanh toán xong là trừ tiền luôn (không cần xác nhận thêm)
    confirmation: { type: "redirect", return_url: returnUrl },
    description: `Заказ ${order.code} в SFoodie`.slice(0, 128),
    metadata: { orderCode: order.code }
  }
  if(yookassaSendReceipt){
    body.receipt = buildReceipt(order)
  }

  try {
    const response = await axios.post(`${yookassaApiUrl}/payments`, body, {
      auth: getYookassaAuth(),
      timeout: 30000,
      headers: {
        // Gửi lại cùng 1 khoá thì YooKassa không tạo thêm thanh toán mới (tránh trừ tiền 2 lần)
        "Idempotence-Key": `${order.code}-${Date.now()}`
      }
    })

    const confirmationUrl = response.data?.confirmation?.confirmation_url
    if(!response.data?.id || !confirmationUrl){
      throw new PaymentError("YooKassa không trả về link thanh toán")
    }

    return { paymentId: `${response.data.id}`, confirmationUrl: `${confirmationUrl}` }
  } catch (error) {
    if(error instanceof PaymentError) throw error
    throw new PaymentError(getYookassaErrorMessage(error))
  }
}

// ===== Lấy trạng thái thanh toán =====
// Thanh toán giả: trạng thái lưu trong đơn hàng (đổi khi bấm nút ở trang thanh toán giả), trả về null
export const getPayment = async (order: any): Promise<PaymentInfo | null> => {
  const paymentId = order.payment?.paymentId
  if(!paymentId || order.payment?.provider !== "yookassa") return null

  if(getPaymentProvider() !== "yookassa"){
    throw new PaymentError("Chưa cấu hình YooKassa trong file .env")
  }

  try {
    const response = await axios.get(`${yookassaApiUrl}/payments/${encodeURIComponent(paymentId)}`, {
      auth: getYookassaAuth(),
      timeout: 20000
    })
    return formatYookassaPayment(response.data)
  } catch (error) {
    throw new PaymentError(getYookassaErrorMessage(error))
  }
}

// Lấy thanh toán theo id (dùng khi YooKassa gửi thông báo về webhook: luôn hỏi lại YooKassa,
// không tin dữ liệu trong thông báo vì người lạ có thể gửi thông báo giả)
export const getYookassaPaymentById = async (paymentId: string): Promise<any> => {
  const response = await axios.get(`${yookassaApiUrl}/payments/${encodeURIComponent(paymentId)}`, {
    auth: getYookassaAuth(),
    timeout: 20000
  })
  return { ...formatYookassaPayment(response.data), metadata: response.data?.metadata || {}, id: response.data?.id }
}

// ===== Hoàn tiền toàn bộ đơn hàng =====
// Kết quả: { refundId, status } - status: succeeded (đã hoàn), pending (đang xử lý), canceled (bị từ chối)
export const createRefund = async (order: any, reason: string): Promise<{ refundId: string, status: string }> => {
  if(order.payment?.provider === "test"){
    return { refundId: `test_refund_${crypto.randomBytes(6).toString("hex")}`, status: "succeeded" }
  }

  if(order.payment?.provider !== "yookassa" || getPaymentProvider() !== "yookassa"){
    throw new PaymentError("Chưa cấu hình YooKassa trong file .env, không hoàn tiền tự động được")
  }

  const body: any = {
    payment_id: order.payment.paymentId,
    amount: { value: formatAmount(order.total), currency: "RUB" },
    description: `${reason || `Возврат по заказу ${order.code}`}`.slice(0, 250)
  }
  if(yookassaSendReceipt){
    body.receipt = buildReceipt(order)
  }

  try {
    const response = await axios.post(`${yookassaApiUrl}/refunds`, body, {
      auth: getYookassaAuth(),
      timeout: 30000,
      headers: {
        "Idempotence-Key": `refund-${order.code}`
      }
    })
    return { refundId: `${response.data?.id || ""}`, status: `${response.data?.status || "pending"}` }
  } catch (error) {
    throw new PaymentError(getYookassaErrorMessage(error))
  }
}
