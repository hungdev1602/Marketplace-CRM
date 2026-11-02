import mongoose from "mongoose"

// Danh sách sản phẩm yêu thích của khách (chưa cần tài khoản)
// - token: mã nhận diện danh sách, trình duyệt của khách giữ trong cookie "wishlistToken"
// - Danh sách không thay đổi quá clientWishlistRetentionDays ngày thì tự động bị xoá (helpers/wishlist.helper.ts)
const wishlistSchema = new mongoose.Schema(
  {
    token: String,
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

wishlistSchema.index({ token: 1 }, { unique: true })
wishlistSchema.index({ updatedAt: 1 })

export const Wishlist = mongoose.model("Wishlist", wishlistSchema, "wishlists")
