import mongoose from "mongoose"

// Mã giảm giá (khách nhập ở bước thanh toán)
// Các trường lưu theo id (discountType, applyTo) lấy danh sách ở config/variable.config.ts
// Trạng thái hiển thị (đang chạy, chưa bắt đầu, hết hạn, hết lượt, tạm dừng) tính bằng getCouponStatus (helpers/coupon.helper.ts)
const couponSchema = new mongoose.Schema(
  {
    code: String, // mã khách nhập, luôn lưu chữ in hoa (A-Z, 0-9, - _), ví dụ: TET2027, FREESHIP
    name: String, // tên chương trình, chỉ hiện trong trang admin, ví dụ: Khuyến mãi Tết 2027
    description: String, // mô tả cho khách, ví dụ: Giảm 10% cho đơn từ 2 000 ₽

    // Mức giảm (tiền rúp ₽)
    discountType: String, // loại giảm giá: couponTypeList (percent, fixed, free-shipping)
    discountValue: Number, // số % (percent) hoặc số tiền (fixed), loại free-shipping không dùng
    maxDiscount: Number, // số tiền giảm tối đa, chỉ dùng cho loại percent, để trống là không giới hạn

    // Điều kiện áp dụng
    minOrderValue: Number, // giá trị đơn hàng tối thiểu để dùng được mã, để trống là không yêu cầu
    applyTo: {
      type: String,
      default: "all"
    }, // phạm vi áp dụng: couponApplyToList (all, category, product), loại free-shipping luôn là all
    categories: [String], // id danh mục sản phẩm khi applyTo = category (tính cả sản phẩm thuộc danh mục con)
    products: [String], // id sản phẩm khi applyTo = product

    // Giới hạn lượt dùng
    usageLimit: Number, // tổng số lượt dùng tối đa của mã, để trống là không giới hạn
    usageLimitPerCustomer: Number, // số lần mỗi khách được dùng, để trống là không giới hạn
    usedCount: {
      type: Number,
      default: 0
    }, // số lượt đã dùng (tăng lên khi khách đặt hàng thành công với mã này)

    // Thời gian áp dụng
    startAt: Date, // thời gian bắt đầu
    endAt: Date, // thời gian kết thúc, để trống là không hết hạn

    status: {
      type: String,
      enum: ["active", "inactive"], // active - Hoạt động, inactive - Tạm dừng
      default: "active"
    },
    search: String,
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

// Khi khách nhập mã ở bước thanh toán sẽ tìm theo mã, nên tạo index cho nhanh
couponSchema.index({ code: 1 })

export const Coupon = mongoose.model("Coupon", couponSchema, "coupons")
