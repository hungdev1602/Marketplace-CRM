import mongoose from "mongoose"

// Giỏ hàng của khách (chưa cần tài khoản)
// - token: mã nhận diện giỏ hàng, trình duyệt của khách giữ trong cookie "cartToken"
// - Giá tiền không lưu ở đây, luôn lấy giá mới nhất của sản phẩm khi hiển thị
// - Giỏ hàng không thay đổi quá clientCartRetentionDays ngày thì tự động bị xoá (helpers/cart.helper.ts)
const cartSchema = new mongoose.Schema(
  {
    token: String,
    items: [
      {
        _id: false,
        productId: String, // id sản phẩm
        quantity: Number // số lượng
      }
    ],
    couponCode: String // mã giảm giá khách đã nhập (chữ in hoa), kiểm tra lại mỗi lần hiển thị giỏ hàng
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

// Mỗi lần mở trang đều tìm giỏ hàng theo token, nên tạo index cho nhanh
cartSchema.index({ token: 1 }, { unique: true })
// Tìm giỏ hàng lâu không thay đổi để xoá
cartSchema.index({ updatedAt: 1 })

export const Cart = mongoose.model("Cart", cartSchema, "carts")
