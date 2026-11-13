import axios, { AxiosError } from "axios"
import crypto from "crypto"
import moment from "moment"
import {
  shopUtcOffset,
  tbankDeliveryTax,
  tbankReceiptPaymentMethod,
  tbankTaxMap
} from "../config/variable.config"
import { getSiteUrl } from "./site-url.helper"
import {
  getIntegrationMode,
  getIntegrationSetting,
  getIntegrationString,
  isIntegrationEnabled
} from "./integration.helper"
import { logApiCall } from "./api-call-log.helper"

// ===== Thanh toán online =====
// Cấu hình ở trang admin: Kết nối API => Т-Банк (hoặc file .env: TBANK_TERMINAL_KEY, TBANK_PASSWORD, PAYMENT_TEST_MODE)
// - Chế độ "Т-Банк": Интернет-эквайринг, tài liệu API: https://developer.tbank.ru/eacq/api
//   Khách được chuyển sang trang thanh toán của Т-Банк (thẻ ngân hàng, СБП, T-Pay, SberPay,... tuỳ cài đặt terminal)
// - Chế độ "Thanh toán giả": chỉ để thử khi chưa có terminal Т-Банк,
//   mở trang có nút "Оплатить" / "Отменить" thay cho trang thanh toán thật
// - Tắt kết nối Т-Банк ở trang admin: khách không đặt hàng được
// Lưu ý: đọc cấu hình trong hàm (không đọc lúc import file), vì file .env được nạp sau khi import (index.ts)

export type PaymentProvider = "tbank" | "test" | ""

// Cách thanh toán đang dùng, "" là chưa cấu hình / đã tắt (khách không đặt hàng được)
export const getPaymentProvider = (): PaymentProvider => {
  if(!isIntegrationEnabled("tbank")) return ""
  if(getIntegrationMode("tbank") === "fake") return "test"
  if(getTerminalKey() && getPassword()) return "tbank"
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

// ===== Gọi API Т-Банк =====
const getApiUrl = (): string => {
  return (getIntegrationString("tbank", "apiUrl") || "https://securepay.tinkoff.ru/v2").replace(/\/+$/, "")
}

const getTerminalKey = (): string => getIntegrationString("tbank", "terminalKey")
const getPassword = (): string => getIntegrationString("tbank", "password")

// Cài đặt hoá đơn điện tử (54-ФЗ): trang admin => mặc định trong config/variable.config.ts
const getSendReceipt = (): boolean => getIntegrationSetting("tbank", "sendReceipt") === true
const getTaxation = (): string => getIntegrationString("tbank", "taxation") || "usn_income"
const getFfdVersion = (): string => getIntegrationString("tbank", "ffdVersion") || "1.2"

// Chữ ký Token của Т-Банк (https://developer.tbank.ru/eacq/intro/developer/token):
// lấy các trường ở cấp ngoài cùng (bỏ Token và các trường là object / mảng như Receipt, DATA),
// thêm Password (mật khẩu terminal), xếp theo tên trường A-Z, nối các giá trị lại rồi băm SHA-256
export const buildTbankToken = (fields: { [key: string]: any }, password: string): string => {
  const values: { [key: string]: string } = {}
  for (const [key, value] of Object.entries(fields)) {
    if(key === "Token" || value === null || value === undefined || typeof value === "object") continue
    values[key] = typeof value === "boolean" ? (value ? "true" : "false") : `${value}`
  }
  values.Password = password

  const text = Object.keys(values).sort().map(key => values[key]).join("")
  return crypto.createHash("sha256").update(text, "utf8").digest("hex")
}

// Kiểm tra thông báo Т-Банк gửi về (webhook) đúng là của Т-Банк: đúng mã terminal và đúng chữ ký Token
export const verifyTbankNotification = (body: any): boolean => {
  if(!body || typeof body !== "object" || typeof body.Token !== "string") return false
  if(!getTerminalKey() || !getPassword() || body.TerminalKey !== getTerminalKey()) return false

  const expected = buildTbankToken(body, getPassword())
  const received = body.Token.toLowerCase()
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}

// Gửi 1 yêu cầu tới Т-Банк (tự thêm TerminalKey, Token), lỗi thì báo PaymentError có lời báo của Т-Банк
// Mỗi lần gọi được ghi vào nhật ký gọi API (trang admin: Kết nối API => Nhật ký gọi API), không ghi dữ liệu gửi đi
const tbankRequest = async (method: string, params: { [key: string]: any }, logAction: string = method): Promise<any> => {
  const body: any = { TerminalKey: getTerminalKey(), ...params }
  body.Token = buildTbankToken(body, getPassword())

  const startAt = Date.now()
  let statusCode = 0
  let data: any
  try {
    const response = await axios.post(`${getApiUrl()}/${method}`, body, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" }
    })
    statusCode = response.status
    data = response.data
  } catch (error) {
    statusCode = (error as AxiosError<any>)?.response?.status || 0
    const responseData = (error as AxiosError<any>)?.response?.data
    data = responseData && typeof responseData === "object" ? responseData : null
    if(!data){
      const message = `Т-Банк: không kết nối được (${(error as Error).message})`
      logApiCall({ provider: "tbank", action: logAction, ok: false, statusCode, durationMs: Date.now() - startAt, message })
      throw new PaymentError(message)
    }
  }

  if(!data || data.Success !== true || (data.ErrorCode && `${data.ErrorCode}` !== "0")){
    const message = `Т-Банк: ${[data?.Message, data?.Details].filter(Boolean).join(". ") || "lỗi không xác định"} (mã lỗi ${data?.ErrorCode ?? "?"})`
    logApiCall({ provider: "tbank", action: logAction, ok: false, statusCode, durationMs: Date.now() - startAt, message })
    throw new PaymentError(message)
  }

  logApiCall({
    provider: "tbank",
    action: logAction,
    ok: true,
    statusCode,
    durationMs: Date.now() - startAt,
    message: data.Status ? `Status ${data.Status}` : ""
  })
  return data
}

// Số tiền theo định dạng Т-Банк: số nguyên kopeck, ví dụ 1250.5 ₽ => 125050
const toKopecks = (value: number): number => {
  return Math.round(value * 100)
}

// Trạng thái thanh toán của Т-Банк => PaymentInfo
// - CONFIRMED: đã thanh toán (thanh toán 1 bước)
// - REJECTED, CANCELED, DEADLINE_EXPIRED, AUTH_FAIL,...: không thanh toán được
// - NEW, FORM_SHOWED, AUTHORIZING, 3DS_CHECKING, CONFIRMING,...: đang thanh toán
const canceledStatusList = ["CANCELED", "REJECTED", "DEADLINE_EXPIRED", "AUTH_FAIL", "ATTEMPTS_EXPIRED", "REVERSED", "PARTIAL_REVERSED", "REFUNDED", "PARTIAL_REFUNDED"]

const formatTbankState = (status: string): PaymentInfo => {
  if(status === "CONFIRMED"){
    return { status: "succeeded", method: "", cancelReason: "", paidAt: new Date() }
  }
  if(canceledStatusList.includes(status)){
    return { status: "canceled", method: "", cancelReason: status, paidAt: null }
  }
  return { status: "pending", method: "", cancelReason: "", paidAt: null }
}

// ===== Hoá đơn điện tử (чек 54-ФЗ) gửi kèm thanh toán (bật ở trang admin: Kết nối API => Т-Банк) =====
// Tổng tiền các dòng trên hoá đơn phải đúng bằng số tiền thanh toán, nên tiền giảm của mã giảm giá
// được chia vào từng sản phẩm theo tỉ lệ tiền hàng; dòng nào chia không chẵn kopeck thì tách làm 2 dòng
// Mỗi dòng: Price (giá 1 sản phẩm, kopeck) × Quantity = Amount (kopeck)
export const buildReceipt = (order: any) => {
  const items: any[] = []
  const goodsTotal = toKopecks((order.subtotal || 0) - (order.couponDiscount || 0))
  const subtotal = toKopecks(order.subtotal || 0)
  const isFfd12 = getFfdVersion() === "1.2"
  let restTotal = goodsTotal

  const addLine = (name: string, quantity: number, unitPrice: number, tax: string, paymentObject: string) => {
    if(quantity <= 0) return
    const line: any = {
      Name: name.slice(0, 128),
      Price: unitPrice,
      Quantity: quantity,
      Amount: unitPrice * quantity,
      Tax: tax,
      PaymentMethod: tbankReceiptPaymentMethod,
      PaymentObject: paymentObject
    }
    if(isFfd12) line.MeasurementUnit = paymentObject === "service" ? "усл" : "шт"
    items.push(line)
  }

  order.items.forEach((item: any, index: number) => {
    const lineTotal = toKopecks(item.lineTotal)
    // Dòng cuối lấy phần còn lại để tổng luôn đúng
    const lineAfterDiscount = index === order.items.length - 1
      ? restTotal
      : Math.round(subtotal > 0 ? lineTotal * goodsTotal / subtotal : lineTotal)
    restTotal -= lineAfterDiscount

    const name = `${item.nameRu || item.name}`
    const tax = tbankTaxMap[item.vat] || tbankTaxMap["none"] || "none"
    const unitPrice = Math.floor(lineAfterDiscount / item.quantity)
    const remainder = lineAfterDiscount - unitPrice * item.quantity

    if(remainder === 0){
      addLine(name, item.quantity, unitPrice, tax, "commodity")
    }
    else {
      // Ví dụ 3 sản phẩm tổng 100,00 ₽: 2 x 33,33 + 1 x 33,34
      addLine(name, item.quantity - 1, unitPrice, tax, "commodity")
      addLine(name, 1, unitPrice + remainder, tax, "commodity")
    }
  })

  if(order.deliveryCost > 0){
    addLine("Доставка", 1, toKopecks(order.deliveryCost), tbankDeliveryTax, "service")
  }

  const receipt: any = {
    Taxation: getTaxation(),
    FfdVersion: getFfdVersion(),
    Items: items
  }
  if(order.customer.email) receipt.Email = order.customer.email
  if(order.customer.phone) receipt.Phone = order.customer.phone

  return receipt
}

// ===== Tạo thanh toán: Init =====
// Kết quả: { paymentId, confirmationUrl, attempt } - chuyển khách tới confirmationUrl để thanh toán
// Thanh toán xong (hoặc lỗi) Т-Банк chuyển khách về trang đơn hàng (SuccessURL / FailURL)
// Mỗi lần thanh toán lại dùng 1 mã OrderId mới (SF-261105-4821, SF-261105-4821-2,...) để không trùng mã cũ
export const createPayment = async (order: any): Promise<{ paymentId: string, confirmationUrl: string, attempt: number }> => {
  const provider = getPaymentProvider()
  const attempt = (order.payment?.attempt || 0) + 1

  if(provider === "test"){
    return {
      paymentId: `test_${crypto.randomBytes(8).toString("hex")}`,
      confirmationUrl: `/order/${order.code}/test-payment?key=${order.accessKey}`,
      attempt: attempt
    }
  }

  if(provider !== "tbank"){
    throw new PaymentError("Chưa cấu hình thanh toán online (Admin => Kết nối API => Т-Банк)")
  }

  const siteUrl = getSiteUrl()
  const orderUrl = `${siteUrl}/order/${order.code}?key=${order.accessKey}`

  // Link thanh toán hết hạn cùng lúc với hạn thanh toán của đơn (ít nhất 3 phút kể từ bây giờ)
  const dueDate = new Date(Math.max(new Date(order.paymentExpireAt).getTime(), Date.now() + 3 * 60 * 1000))

  const params: any = {
    Amount: toKopecks(order.total),
    OrderId: attempt === 1 ? order.code : `${order.code}-${attempt}`,
    Description: `Заказ ${order.code} в SFoodie`.slice(0, 140),
    PayType: "O", // thanh toán 1 bước: khách trả xong là trừ tiền luôn
    Language: "ru",
    RedirectDueDate: moment(dueDate).utcOffset(shopUtcOffset).format("YYYY-MM-DDTHH:mm:ssZ"),
    SuccessURL: orderUrl,
    FailURL: orderUrl,
    DATA: {
      Email: order.customer.email,
      Phone: order.customer.phone
    }
  }
  // Т-Банк chỉ gửi được thông báo tới địa chỉ công khai (https), chạy trên máy thì dựa vào tự kiểm tra trạng thái
  if(siteUrl.startsWith("https://")){
    params.NotificationURL = `${siteUrl}/payment/tbank`
  }
  if(getSendReceipt()){
    params.Receipt = buildReceipt(order)
  }

  const data = await tbankRequest("Init", params)
  if(!data.PaymentId || !data.PaymentURL){
    throw new PaymentError("Т-Банк không trả về link thanh toán")
  }

  return { paymentId: `${data.PaymentId}`, confirmationUrl: `${data.PaymentURL}`, attempt: attempt }
}

// ===== Lấy trạng thái thanh toán: GetState =====
// Terminal đang để thanh toán 2 bước (tiền mới bị giữ, trạng thái AUTHORIZED): xác nhận luôn (Confirm) để trừ tiền
export const getTbankPaymentState = async (paymentId: string): Promise<PaymentInfo> => {
  const data = await tbankRequest("GetState", { PaymentId: paymentId })
  let status = `${data.Status || ""}`

  if(status === "AUTHORIZED"){
    const confirm = await tbankRequest("Confirm", { PaymentId: paymentId })
    status = `${confirm.Status || ""}`
  }

  return formatTbankState(status)
}

// Thanh toán giả: trạng thái lưu trong đơn hàng (đổi khi bấm nút ở trang thanh toán giả), trả về null
export const getPayment = async (order: any): Promise<PaymentInfo | null> => {
  const paymentId = order.payment?.paymentId
  if(!paymentId || order.payment?.provider !== "tbank") return null

  if(getPaymentProvider() !== "tbank"){
    throw new PaymentError("Chưa cấu hình Т-Банк (Admin => Kết nối API => Т-Банк)")
  }

  return await getTbankPaymentState(paymentId)
}

// ===== Hoàn tiền toàn bộ đơn hàng: Cancel =====
// Kết quả: { refundId, status } - status: succeeded (đã hoàn), pending (Т-Банк đang xử lý)
export const createRefund = async (order: any, reason: string): Promise<{ refundId: string, status: string }> => {
  if(order.payment?.provider === "test"){
    return { refundId: `test_refund_${crypto.randomBytes(6).toString("hex")}`, status: "succeeded" }
  }

  if(order.payment?.provider !== "tbank" || getPaymentProvider() !== "tbank"){
    throw new PaymentError("Chưa cấu hình Т-Банк (Admin => Kết nối API => Т-Банк), không hoàn tiền tự động được")
  }

  const params: any = {
    PaymentId: order.payment.paymentId,
    Amount: toKopecks(order.total)
  }
  if(getSendReceipt()){
    params.Receipt = buildReceipt(order)
  }

  const data = await tbankRequest("Cancel", params)
  const status = `${data.Status || ""}`
  return {
    refundId: `${data.PaymentId || order.payment.paymentId}`,
    status: status === "REFUNDING" ? "pending" : "succeeded"
  }
}

// ===== Kiểm tra kết nối (nút "Kiểm tra kết nối" ở trang admin) =====
// Т-Банк không có API riêng để kiểm tra khoá, nên tạo 1 thanh toán thử 1 ₽ (Init) rồi huỷ ngay (Cancel):
// không ai bị trừ tiền, thanh toán thử hiện trong danh sách thao tác của Т-Бизнес ở trạng thái huỷ
// Init thành công = Terminal key + mật khẩu đúng, terminal đang hoạt động
export const testTbankConnection = async (): Promise<{ ok: boolean, message: string, details: string[] }> => {
  const details: string[] = []
  const provider = getPaymentProvider()

  if(provider === "test"){
    return {
      ok: true,
      message: "Đang dùng thanh toán giả: khách đặt hàng được, không cần kết nối Т-Банк",
      details: ["Đăng ký Т-Банк xong thì chọn chế độ \"Т-Банк\" và nhập Terminal key + mật khẩu"]
    }
  }
  if(!isIntegrationEnabled("tbank")){
    return { ok: false, message: "Kết nối Т-Банк đang tắt", details: [] }
  }
  if(provider !== "tbank"){
    return { ok: false, message: "Chưa nhập Terminal key và mật khẩu terminal", details: [] }
  }

  const terminalKey = getTerminalKey()
  details.push(`Terminal: ${terminalKey}${terminalKey.toUpperCase().endsWith("DEMO") ? " (thử nghiệm DEMO, không mất tiền thật)" : " (terminal thật)"}`)
  details.push(`Địa chỉ API: ${getApiUrl()}`)

  const params: any = {
    Amount: 100,
    OrderId: `TEST-${Date.now()}`,
    Description: "Проверка подключения (не оплачивать)",
    PayType: "O",
    Language: "ru"
  }
  if(getSendReceipt()){
    params.Receipt = {
      Taxation: getTaxation(),
      FfdVersion: getFfdVersion(),
      Email: "test@example.com",
      Items: [{
        Name: "Проверка подключения",
        Price: 100,
        Quantity: 1,
        Amount: 100,
        Tax: tbankTaxMap["none"] || "none",
        PaymentMethod: tbankReceiptPaymentMethod,
        PaymentObject: "service",
        ...(getFfdVersion() === "1.2" ? { MeasurementUnit: "усл" } : {})
      }]
    }
    details.push(`Gửi kèm hoá đơn điện tử: bật (${getTaxation()}, ФФД ${getFfdVersion()})`)
  }

  let paymentId = ""
  try {
    const data = await tbankRequest("Init", params, "Init (kiểm tra kết nối)")
    paymentId = `${data.PaymentId || ""}`
    details.push(`Tạo thanh toán thử 1 ₽: thành công (PaymentId ${paymentId})`)
  } catch (error) {
    return { ok: false, message: (error as Error).message, details }
  }

  try {
    if(paymentId){
      await tbankRequest("Cancel", { PaymentId: paymentId }, "Cancel (kiểm tra kết nối)")
      details.push("Huỷ thanh toán thử: thành công")
    }
  } catch (error) {
    details.push(`Huỷ thanh toán thử: ${(error as Error).message} (thanh toán thử tự hết hạn, không ai bị trừ tiền)`)
  }

  if(!getSiteUrl().startsWith("https://")){
    details.push("SITE_URL chưa phải https: Т-Банк không gửi được thông báo về (trên máy vẫn chạy, server tự hỏi trạng thái mỗi phút)")
  }

  return { ok: true, message: "Kết nối Т-Банк thành công", details }
}
