import mongoose from "mongoose";

// Nhật ký hoạt động của tài khoản admin (chỉ Super Admin xem được)
// Chỉ thêm mới, không sửa/xoá, để không ai xoá được dấu vết thao tác của mình
// Nhật ký quá số tháng lưu (activityLogRetentionMonths) được server tự động xoá (helpers/activity-log.helper.ts)
const schema = new mongoose.Schema(
  {
    accountId: String, // id tài khoản thực hiện thao tác
    accountFullName: String, // lưu lại họ tên, email tại thời điểm thao tác
    accountEmail: String, // (tài khoản đổi tên hoặc bị xoá vĩnh viễn thì log vẫn hiện đúng người)
    module: String, // chức năng: activityLogModuleList trong config/variable.config.ts
    action: String, // hành động: activityLogActionList trong config/variable.config.ts
    description: String, // mô tả, ví dụ: Tạo bài viết "Món ngon mỗi ngày"
    targetId: String, // id bản ghi bị tác động (bài viết, nhóm quyền,...)
    ip: String,
    userAgent: String, // trình duyệt, thiết bị
    search: String
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

// Trang nhật ký sắp xếp theo thời gian mới nhất và lọc theo tài khoản, nên tạo index cho nhanh khi log nhiều
schema.index({ createdAt: -1 });
schema.index({ accountId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', schema, "activity-logs");
