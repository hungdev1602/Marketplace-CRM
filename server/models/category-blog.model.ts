import mongoose from "mongoose"

const categoryBlogSchema = new mongoose.Schema(
  {
    name: String,
    parent: String,
    description: String
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

export const CategoryBlog = mongoose.model("CategoryBlog", categoryBlogSchema, "categories-blog")