import mongoose from "mongoose"

const blogSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    category: [String],
    avatar: String,
    description: String,
    content: String,
    status: {
      type: String,
      enum: ["draft", "published", "archived"], //draft - bản nháp, published - đã xuất bản, archived - đã lưu trữ
      default: "draft"
    },
    view: {
      type: Number,
      default: 0
    },
    search: String,
    publishedAt: Date,
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

export const Blog = mongoose.model("Blog", blogSchema, "blogs")