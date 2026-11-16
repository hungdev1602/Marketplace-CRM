import mongoose from "mongoose"

// Cài đặt cửa hàng nhập ở trang admin "Cài đặt cửa hàng" (thông tin cửa hàng, đặt hàng, sản phẩm, đánh giá)
// Danh sách mục và các ô: config/shop-setting.config.ts
// Ô chưa nhập ở trang admin thì dùng giá trị mặc định trong config/variable.config.ts
const schema = new mongoose.Schema(
  {
    key: String, // key của mục trong shopSettingList, ví dụ: shop-info, checkout, product, review
    values: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }, // { field: value }
    updatedBy: String // tài khoản admin sửa gần nhất
  },
  {
    timestamps: true
  }
)

schema.index({ key: 1 }, { unique: true })

export const ShopSetting = mongoose.model("ShopSetting", schema, "shop-settings")
