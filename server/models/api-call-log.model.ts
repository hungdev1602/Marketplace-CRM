import mongoose from "mongoose"

// Nhật ký gọi API bên thứ 3: mỗi lần server gọi Т-Банк, ApiShip, gửi email... ghi 1 dòng (helpers/api-call-log.helper.ts)
// Chỉ lưu tên thao tác, kết quả, thời gian chạy và lời báo lỗi, KHÔNG lưu dữ liệu gửi đi (khoá API, thông tin khách)
// Nhật ký cũ hơn apiCallLogRetentionDays ngày (config/variable.config.ts) được tự động xoá
const schema = new mongoose.Schema(
  {
    provider: String, // key của dịch vụ: tbank, apiship, smtp
    action: String, // thao tác, ví dụ: "Init", "POST /calculator", "Gửi email"
    ok: Boolean, // thành công hay lỗi
    statusCode: Number, // mã HTTP trả về (0 là không kết nối được)
    durationMs: Number, // thời gian chờ dịch vụ trả lời (mili giây)
    message: String // lời báo lỗi (hoặc ghi chú ngắn khi thành công)
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
)

schema.index({ createdAt: -1 })
schema.index({ provider: 1, createdAt: -1 })

export const ApiCallLog = mongoose.model("ApiCallLog", schema, "api-call-logs")
