import nodemailer from "nodemailer"

// ===== Gửi email (SMTP) =====
// Cấu hình trong file .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (xem .env.example)
// Chưa điền SMTP_HOST: không gửi email thật, nội dung email (kèm link) được in ra terminal đang chạy server,
// dùng để thử tính năng trên máy mà chưa cần tài khoản email

let transporter: nodemailer.Transporter | null = null

export const isMailConfigured = (): boolean => {
  return !!process.env.SMTP_HOST
}

// Tạo kết nối SMTP 1 lần, dùng lại cho các email sau
const getTransporter = (): nodemailer.Transporter => {
  if(!transporter) {
    const port = parseInt(process.env.SMTP_PORT || "465")
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465, // cổng 465: kết nối mã hoá ngay từ đầu; cổng 587: nâng cấp lên mã hoá sau khi kết nối (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Máy chủ email không trả lời thì bỏ cuộc sau vài giây, không treo mãi
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    })
  }
  return transporter
}

// Gửi 1 email
// - html: nội dung hiển thị trong hộp thư
// - text: nội dung chữ thuần (cho ứng dụng email không hiện HTML, giúp email ít bị coi là thư rác)
export const sendMail = async (options: { to: string, subject: string, html: string, text: string }) => {
  if(!isMailConfigured()) {
    console.log("===== [Email] Chưa cấu hình SMTP trong file .env nên không gửi email thật =====")
    console.log(`Tới: ${options.to}`)
    console.log(`Tiêu đề: ${options.subject}`)
    console.log(options.text)
    console.log("=============================================================================")
    return
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || `SFoodie <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  })
}
