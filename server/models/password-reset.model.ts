import mongoose from "mongoose"

// Link đặt lại mật khẩu đã gửi qua email (quên mật khẩu ở trang khách hàng: /account/forgot-password)
// - Chỉ lưu mã đã băm (sha256), không lưu mã gốc: lộ database cũng không dùng được link
// - Mỗi tài khoản chỉ có 1 link còn dùng được: gửi link mới thì link cũ bị xoá, đặt mật khẩu xong thì link bị xoá
// - Hết hạn (expireAt) thì MongoDB tự xoá (TTL index, MongoDB kiểm tra khoảng 1 phút / lần,
//   nên server vẫn tự kiểm tra expireAt khi khách mở link)
const passwordResetSchema = new mongoose.Schema(
  {
    accountId: String, // id tài khoản khách (accounts-client)
    tokenHash: String, // sha256 của mã trong link
    expireAt: Date // thời gian hết hạn
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

passwordResetSchema.index({ tokenHash: 1 })
passwordResetSchema.index({ accountId: 1 })
passwordResetSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema, "password-resets")
