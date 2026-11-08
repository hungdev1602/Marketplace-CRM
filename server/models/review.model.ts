import mongoose from "mongoose"

// Đánh giá sản phẩm của khách (viết ở trang khách hàng sau khi đã nhận hàng)
// - Mỗi khách đánh giá mỗi sản phẩm 1 lần (customerKey + productId), sửa lại được trong reviewEditDays ngày
// - Đánh giá có chữ / ảnh: chờ nhân viên duyệt (reviewModeration trong config/variable.config.ts)
// - Điểm trung bình, số lượt đánh giá lưu sẵn ở sản phẩm (rating, ratingCount, reviewCount) để hiện nhanh ở thẻ sản phẩm,
//   tính lại mỗi khi đánh giá được đăng / bị ẩn / bị xoá (helpers/review.helper.ts: updateProductRating)
const reviewSchema = new mongoose.Schema(
  {
    productId: String,
    orderId: String, // đơn hàng khách đã mua sản phẩm này
    orderCode: String,
    userId: String, // tài khoản khách (trống là khách đặt hàng không đăng nhập)
    customerKey: String, // nhận diện khách: "user:<id tài khoản>" hoặc "email:<email đặt hàng>"
    customerName: String, // họ tên đầy đủ trong đơn hàng (chỉ hiện ở trang admin)
    customerEmail: String, // chỉ hiện ở trang admin
    authorName: String, // tên hiện công khai, ví dụ "Анна К." (tên + chữ cái đầu của họ)
    anonymous: {
      type: Boolean,
      default: false
    }, // khách chọn "Оставить отзыв анонимно": hiện "Покупатель" thay cho tên
    lang: String, // ngôn ngữ khách dùng lúc viết

    // Nội dung
    rating: Number, // số sao 1-5
    pros: String, // Достоинства (ưu điểm)
    cons: String, // Недостатки (nhược điểm)
    comment: String, // Комментарий (nhận xét)
    photos: [String], // đường dẫn ảnh trên server Quản lý file, ví dụ /media/danh-gia/1763422252618-ab12cd.jpg
    hasContent: {
      type: Boolean,
      default: false
    }, // có chữ hoặc ảnh (chỉ chấm sao thì không hiện trong danh sách đánh giá, chỉ tính vào điểm)
    hasPhoto: {
      type: Boolean,
      default: false
    },

    // Duyệt
    status: {
      type: String,
      default: "pending"
    }, // reviewStatusList: pending (chờ duyệt), published (đã đăng), rejected (bị từ chối)
    rejectReason: String, // lý do từ chối (khách xem được ở trang "Мои отзывы")
    publishedAt: Date,
    moderatedBy: String, // nhân viên duyệt / từ chối

    // Cửa hàng trả lời (hiện dưới đánh giá: "Ответ магазина")
    reply: {
      text: String,
      by: String, // tên nhân viên (chỉ hiện ở trang admin)
      at: Date
    },

    // "Полезный отзыв?": số lượt bấm 👍 / 👎 (lượt bấm lưu ở collection review-votes)
    helpfulCount: {
      type: Number,
      default: 0
    },
    unhelpfulCount: {
      type: Number,
      default: 0
    },

    editedAt: Date, // khách sửa lần gần nhất
    search: String // tìm kiếm ở trang admin: tên sản phẩm, tên / email khách, mã đơn, nội dung
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

// Mỗi khách chỉ 1 đánh giá cho 1 sản phẩm (chống bấm gửi 2 lần tạo 2 đánh giá)
reviewSchema.index({ customerKey: 1, productId: 1 }, { unique: true })

// Danh sách đánh giá ở trang sản phẩm
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 })

// Trang admin: lọc theo trạng thái, mới nhất trước
reviewSchema.index({ status: 1, createdAt: -1 })

export const Review = mongoose.model("Review", reviewSchema, "reviews")
