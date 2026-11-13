import mongoose from "mongoose"

// Lượt bấm "Полезный отзыв? 👍 / 👎" của khách (chỉ khách đã đăng nhập mới bấm được, mỗi tài khoản 1 lượt / 1 đánh giá)
// Tổng số lượt lưu sẵn ở đánh giá (helpfulCount, unhelpfulCount) để không phải đếm mỗi lần hiện
const reviewVoteSchema = new mongoose.Schema(
  {
    reviewId: String,
    userId: String, // tài khoản khách đã bấm
    value: Number // 1: hữu ích, -1: không hữu ích
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

reviewVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true })

export const ReviewVote = mongoose.model("ReviewVote", reviewVoteSchema, "review-votes")
