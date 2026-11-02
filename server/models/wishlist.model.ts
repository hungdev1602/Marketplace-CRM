import mongoose from "mongoose"

// Danh sách sản phẩm yêu thích của khách
// - Khách chưa đăng nhập: tìm theo token, trình duyệt giữ token trong cookie phiên "wishlistToken" (tắt trình duyệt là mất),
//   danh sách không thay đổi quá clientGuestDataRetentionDays ngày thì tự động bị xoá
// - Khách đã đăng nhập: tìm theo userId (mỗi tài khoản 1 danh sách), giữ lâu dài
const wishlistSchema = new mongoose.Schema(
  {
    token: String,
    userId: String, // id tài khoản khách đã đăng nhập (AccountClient), trống là của khách chưa đăng nhập
    items: [
      {
        _id: false,
        productId: String, // id sản phẩm
        addedAt: Date // thời gian thêm, sản phẩm thêm sau hiện trước
      }
    ]
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

// Danh sách của tài khoản cũng có token (không dùng đến) để index token luôn khác nhau
wishlistSchema.index({ token: 1 }, { unique: true })
wishlistSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "string" } } })
wishlistSchema.index({ updatedAt: 1 })

export const Wishlist = mongoose.model("Wishlist", wishlistSchema, "wishlists")
