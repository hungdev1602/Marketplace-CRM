import nodemailer from "nodemailer"
import crypto from "crypto"
import { getIntegrationSetting, getIntegrationString, isIntegrationEnabled } from "./integration.helper"
import { logApiCall } from "./api-call-log.helper"

// ===== Gửi email (SMTP) =====
// Cấu hình ở trang admin: Kết nối API => Email (SMTP) (hoặc file .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
// Chưa có máy chủ SMTP (hoặc tắt kết nối Email ở trang admin): không gửi email thật, nội dung email (kèm link)
// được in ra terminal đang chạy server, dùng để thử tính năng trên máy mà chưa cần tài khoản email

const getMailConfig = () => {
  const port = Number(getIntegrationSetting("smtp", "port")) || 465
  return {
    host: getIntegrationString("smtp", "host"),
    port: port,
    user: getIntegrationString("smtp", "user"),
    pass: getIntegrationString("smtp", "pass"),
    from: getIntegrationString("smtp", "from")
  }
}

export const isMailConfigured = (): boolean => {
  return isIntegrationEnabled("smtp") && !!getMailConfig().host
}

// Email nhận thông báo đơn hàng mới của cửa hàng ("" là không gửi)
export const getOrderNotifyEmail = (): string => {
  return getIntegrationString("smtp", "notifyEmail")
}

// Tạo kết nối SMTP 1 lần, dùng lại cho các email sau
// Đổi cấu hình ở trang admin thì tự tạo kết nối mới (so sánh "dấu vân tay" của cấu hình)
let transporter: nodemailer.Transporter | null = null
let transporterKey = ""

const getTransporter = (): nodemailer.Transporter => {
  const config = getMailConfig()
  const key = crypto.createHash("sha256").update(JSON.stringify([config.host, config.port, config.user, config.pass])).digest("hex")

  if(!transporter || transporterKey !== key) {
    if(transporter) transporter.close()
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // cổng 465: kết nối mã hoá ngay từ đầu; cổng 587: nâng cấp lên mã hoá sau khi kết nối (STARTTLS)
      auth: {
        user: config.user,
        pass: config.pass
      },
      // Máy chủ email không trả lời thì bỏ cuộc sau vài giây, không treo mãi
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    })
    transporterKey = key
  }
  return transporter
}

const getFromAddress = (): string => {
  const config = getMailConfig()
  return config.from || `SFoodie <${config.user}>`
}

// Gửi 1 email
// - html: nội dung hiển thị trong hộp thư
// - text: nội dung chữ thuần (cho ứng dụng email không hiện HTML, giúp email ít bị coi là thư rác)
// Mỗi lần gửi được ghi vào nhật ký gọi API (chỉ ghi tiêu đề, không ghi người nhận, nội dung)
export const sendMail = async (options: { to: string, subject: string, html: string, text: string }) => {
  if(!isMailConfigured()) {
    console.log("===== [Email] Chưa cấu hình máy chủ gửi email (Admin => Kết nối API => Email) nên không gửi email thật =====")
    console.log(`Tới: ${options.to}`)
    console.log(`Tiêu đề: ${options.subject}`)
    console.log(options.text)
    console.log("=============================================================================")
    return
  }

  const startAt = Date.now()
  try {
    await getTransporter().sendMail({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    })
    logApiCall({ provider: "smtp", action: "Gửi email", ok: true, durationMs: Date.now() - startAt, message: options.subject })
  } catch (error) {
    logApiCall({ provider: "smtp", action: "Gửi email", ok: false, durationMs: Date.now() - startAt, message: `${options.subject}: ${(error as Error).message}` })
    throw error
  }
}

// ===== Kiểm tra kết nối (nút "Kiểm tra kết nối" ở trang admin) =====
// Đăng nhập máy chủ SMTP (verify), rồi gửi 1 email thử tới testTo (nếu có)
export const testMailConnection = async (testTo: string): Promise<{ ok: boolean, message: string, details: string[] }> => {
  const details: string[] = []
  if(!isIntegrationEnabled("smtp")){
    return { ok: false, message: "Kết nối Email đang tắt: email được in ra terminal thay vì gửi thật", details }
  }

  const config = getMailConfig()
  if(!config.host){
    return { ok: false, message: "Chưa nhập máy chủ SMTP: email được in ra terminal thay vì gửi thật", details }
  }
  details.push(`Máy chủ: ${config.host}:${config.port} (${config.port === 465 ? "SSL" : "STARTTLS"}), tài khoản: ${config.user || "(trống)"}`)

  const startAt = Date.now()
  try {
    await getTransporter().verify()
    logApiCall({ provider: "smtp", action: "Đăng nhập SMTP (kiểm tra)", ok: true, durationMs: Date.now() - startAt })
    details.push("Đăng nhập máy chủ SMTP: thành công")
  } catch (error) {
    const message = `Đăng nhập máy chủ SMTP thất bại: ${(error as Error).message}`
    logApiCall({ provider: "smtp", action: "Đăng nhập SMTP (kiểm tra)", ok: false, durationMs: Date.now() - startAt, message })
    return { ok: false, message, details }
  }

  if(!testTo){
    return { ok: true, message: "Kết nối máy chủ email thành công", details }
  }

  try {
    await sendMail({
      to: testTo,
      subject: "SFoodie: kiểm tra gửi email",
      text: "Email thử từ trang admin SFoodie (Kết nối API => Email). Nhận được email này là cấu hình gửi email đã đúng.",
      html: "<p>Email thử từ trang admin <b>SFoodie</b> (Kết nối API → Email).</p><p>Nhận được email này là cấu hình gửi email đã đúng.</p>"
    })
    details.push(`Đã gửi email thử tới ${testTo} — kiểm tra hộp thư (cả mục Спам / Spam)`)
    return { ok: true, message: "Gửi email thử thành công", details }
  } catch (error) {
    return { ok: false, message: `Đăng nhập được nhưng gửi email thất bại: ${(error as Error).message}`, details }
  }
}
