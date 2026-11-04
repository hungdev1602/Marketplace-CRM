import mongoose from "mongoose"

// Từ khoá khách đã tìm ở trang khách hàng (mỗi từ khoá + ngôn ngữ là 1 dòng, tìm lại thì tăng count)
// Dùng để hiện "Часто ищут" (từ khoá hay tìm) và gợi ý từ khoá khi khách đang gõ
// Từ khoá lâu không ai tìm sẽ tự động bị xoá (clientSearchLogRetentionDays trong config/variable.config.ts)
const searchQuerySchema = new mongoose.Schema(
  {
    keyword: String, // từ khoá hiển thị (chữ thường), ví dụ: лапша
    normalized: String, // từ khoá không dấu, chữ Latin (giống trường search của sản phẩm), "Лапша" và "лапша " là 1 từ khoá
    lang: String, // ngôn ngữ trang khách đang xem (ru, vi), mỗi ngôn ngữ có danh sách "Часто ищут" riêng
    count: {
      type: Number,
      default: 0
    }, // số lần được tìm
    resultCount: {
      type: Number,
      default: 0
    }, // số sản phẩm tìm thấy ở lần tìm gần nhất (0 là không có sản phẩm, không hiện ở "Часто ищут")
    lastSearchedAt: Date // lần tìm gần nhất
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

searchQuerySchema.index({ normalized: 1, lang: 1 }, { unique: true })
searchQuerySchema.index({ lang: 1, count: -1 })
searchQuerySchema.index({ lastSearchedAt: 1 })

export const SearchQuery = mongoose.model("SearchQuery", searchQuerySchema, "search-queries")
