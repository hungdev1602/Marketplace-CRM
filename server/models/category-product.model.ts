import mongoose from "mongoose"

const categoryProductSchema = new mongoose.Schema(
  {
    name: String, // tên danh mục, ví dụ: Mì - Bún - Phở khô
    nameRu: String, // tên tiếng Nga, ví dụ: Лапша и вермишель
    slug: String,
    avatar: String,
    parent: String, // id danh mục cha, "" là danh mục gốc
    description: String,
    position: Number, // thứ tự hiển thị, số nhỏ hiển thị trước
    status: {
      type: String,
      enum: ["active", "inactive"], // active - Hoạt động, inactive - Tạm dừng
      default: "active"
    },
    metaTitle: String, // SEO: tiêu đề hiện trên Google/Yandex
    metaDescription: String, // SEO: mô tả hiện trên Google/Yandex
    view: {
      type: Number,
      default: 0
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

export const CategoryProduct = mongoose.model("CategoryProduct", categoryProductSchema, "categories-product")
