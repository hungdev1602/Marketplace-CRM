import mongoose from "mongoose"

const categoryBlogSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    parent: String,
    description: String,
    status: {
      type: String,
      enum: ["active", "inactive"], // bắt buộc phải những giá trị này
      default: "active"
    },
    view: {
      type: Number,
      default: 0
    },
    deleted: {
      type: Boolean,
      default: false
    },
    search: String
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

export const CategoryBlog = mongoose.model("CategoryBlog", categoryBlogSchema, "categories-blog")