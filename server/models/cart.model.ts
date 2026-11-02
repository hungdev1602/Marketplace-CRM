import mongoose from "mongoose"

// Giỏ hàng của khách
// - Khách chưa đăng nhập: tìm theo token (mã ngẫu nhiên), trình duyệt giữ token trong cookie phiên "cartToken",
//   tắt trình duyệt là mất cookie; giỏ hàng không thay đổi quá clientGuestDataRetentionDays ngày thì tự động bị xoá
// - Khách đã đăng nhập: tìm theo userId (mỗi tài khoản 1 giỏ hàng), giữ lâu dài
// - Giá tiền không lưu ở đây, luôn lấy giá mới nhất của sản phẩm khi hiển thị
const cartSchema = new mongoose.Schema(
  {
    token: String,
    userId: String, // id tài khoản khách đã đăng nhập (AccountClient), trống là của khách chưa đăng nhập
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

// Mỗi lần mở trang đều tìm giỏ hàng theo token / userId, nên tạo index cho nhanh
// Giỏ hàng của tài khoản cũng có token (không dùng đến) để index token luôn khác nhau
cartSchema.index({ token: 1 }, { unique: true })
cartSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "string" } } })
// Tìm giỏ hàng lâu không thay đổi để xoá
cartSchema.index({ updatedAt: 1 })

export const Cart = mongoose.model("Cart", cartSchema, "carts")
