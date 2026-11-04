import mongoose from "mongoose"

// Tài khoản khách hàng (đăng ký ở trang khách hàng: /account/register, hoặc đăng nhập bằng Google lần đầu)
// Giỏ hàng, yêu thích của tài khoản lưu ở collection carts, wishlists (trường userId)
const accountClientSchema = new mongoose.Schema(
  {
    fullName: String, // họ tên
    email: String, // email đăng nhập, luôn lưu chữ thường
    phone: String, // số điện thoại (không bắt buộc), ví dụ: +79991234567
    password: String, // mật khẩu đã mã hoá bằng bcrypt (tài khoản tạo bằng Google thì trống, khách đặt mật khẩu sau ở trang tài khoản / quên mật khẩu)
    googleId: String, // mã tài khoản Google (trường "sub" Google trả về), có thì đăng nhập được bằng Google
    status: {
      type: String,
      enum: ["active", "inactive"], // active - Hoạt động, inactive - Bị khoá (không đăng nhập được)
      default: "active"
    },
    agreedAt: Date, // thời gian khách đồng ý xử lý dữ liệu cá nhân (luật 152-ФЗ của Nga) lúc đăng ký
    lastLoginAt: Date, // thời gian đăng nhập gần nhất
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

// Đăng nhập, đăng ký đều tìm theo email
accountClientSchema.index({ email: 1 })

// Đăng nhập bằng Google tìm theo googleId
accountClientSchema.index({ googleId: 1 })

export const AccountClient = mongoose.model("AccountClient", accountClientSchema, "accounts-client")
