import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    password: String,
    roles: [String],
    isSuperAdmin: {
      type: Boolean,
      default: false
    }, // Super Admin: tài khoản quản trị cao nhất, chỉ tạo được bằng lệnh "yarn create-super-admin"
    status: {
      type: String,
      enum: ["initial", "active", "inactive"], // initial - Khởi tạo, active – Hoạt động, inactive – Tạm dừng
      default: "initial"
    },
    avatar: String,
    search: String,
    lastLoginAt: Date, // Thời gian đăng nhập gần nhất
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

export const AccountAdmin = mongoose.model('AccountAdmin', schema, "accounts-admin");
