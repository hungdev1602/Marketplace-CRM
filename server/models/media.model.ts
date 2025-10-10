import mongoose from "mongoose"

const mediaSchema = new mongoose.Schema(
  {
    folder: String, // đường dẫn thư mục của file, để đến dc file đó
    filename: String, // tên file
    mimetype: String, // kiểu file
    size: Number // kích thước file
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

export const Media = mongoose.model("Media", mediaSchema, "media")