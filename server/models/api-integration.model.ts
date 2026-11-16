import mongoose from "mongoose"

// Cấu hình 1 kết nối API bên thứ 3 nhập ở trang admin "Kết nối API" (Т-Банк, ApiShip, email SMTP...)
// Danh sách dịch vụ và các ô cấu hình: config/integration.config.ts
// Dịch vụ chưa có bản ghi nào thì dùng cấu hình trong file .env (như trước khi có trang admin)
const schema = new mongoose.Schema(
  {
    key: String, // key của dịch vụ trong integrationList, ví dụ: tbank, apiship, smtp
    enabled: {
      type: Boolean,
      default: true
    }, // tắt thì website coi như chưa kết nối dịch vụ này (ví dụ tắt Т-Банк thì khách không đặt hàng được)
    mode: String, // chế độ đang dùng (id trong modes), "" là theo file .env
    values: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }, // giá trị các ô thường { field: value }, ô không có trong đây thì lấy từ .env / mặc định
    secrets: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }, // khoá API, mật khẩu { field: "v1:..." } đã mã hoá (helpers/secret.helper.ts), không lưu chữ thường
    // Kết quả lần bấm "Kiểm tra kết nối" gần nhất
    lastTest: {
      at: Date,
      ok: Boolean,
      message: String,
      details: [String],
      accountName: String
    },
    updatedBy: String // tài khoản admin sửa gần nhất
  },
  {
    timestamps: true
  }
)

schema.index({ key: 1 }, { unique: true })

export const ApiIntegration = mongoose.model("ApiIntegration", schema, "api-integrations")
