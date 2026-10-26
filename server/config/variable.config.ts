export const pathAdmin: string = "admin"

export const domainFileManager: string = "http://localhost:4000"

// Danh sách quyền trong trang admin
// - id: mã quyền, dùng trong route (permissionMiddleware.checkPermission("id")) và file PUG (permissions.includes("id"))
// - name: tên hiển thị ở trang tạo/sửa nhóm quyền
// Lưu ý: không đổi id của quyền đã dùng, vì các nhóm quyền đã tạo đang lưu theo id
export const permissionList = [
  {
    id: "dashboard",
    name: "Trang tổng quan"
  },
  {
    id: "article-list",
    name: "Danh sách bài viết"
  },
  {
    id: "article-create",
    name: "Tạo bài viết"
  },
  {
    id: "article-edit",
    name: "Sửa bài viết"
  },
  {
    id: "article-delete",
    name: "Xoá bài viết"
  },
  {
    id: "article-trash",
    name: "Thùng rác bài viết (khôi phục, xoá vĩnh viễn)"
  },
  {
    id: "article-category",
    name: "Danh mục bài viết"
  },
  {
    id: "article-category-create",
    name: "Tạo danh mục bài viết"
  },
  {
    id: "article-category-edit",
    name: "Sửa danh mục bài viết"
  },
  {
    id: "article-category-delete",
    name: "Xoá danh mục bài viết"
  },
  {
    id: "article-category-trash",
    name: "Thùng rác danh mục bài viết (khôi phục, xoá vĩnh viễn)"
  },
  {
    id: "role-list",
    name: "Danh sách nhóm quyền"
  },
  {
    id: "role-create",
    name: "Tạo nhóm quyền"
  },
  {
    id: "role-edit",
    name: "Sửa nhóm quyền"
  },
  {
    id: "role-delete",
    name: "Xoá nhóm quyền"
  },
  {
    id: "role-trash",
    name: "Thùng rác nhóm quyền (khôi phục, xoá vĩnh viễn)"
  },
  {
    id: "account-admin-list",
    name: "Danh sách tài khoản admin"
  },
  {
    id: "account-admin-create",
    name: "Tạo tài khoản admin"
  },
  {
    id: "account-admin-edit",
    name: "Sửa tài khoản admin"
  },
  {
    id: "account-admin-change-password",
    name: "Đổi mật khẩu tài khoản admin"
  },
  {
    id: "account-admin-delete",
    name: "Xoá tài khoản admin"
  },
  {
    id: "account-admin-trash",
    name: "Thùng rác tài khoản admin (khôi phục, xoá vĩnh viễn)"
  },
  {
    id: "file-manager",
    name: "Quản lý file"
  }
]

// Nhật ký hoạt động (chỉ Super Admin xem được, nên không có trong danh sách quyền ở trên)
// Chức năng được ghi log
// - id: mã chức năng, dùng khi ghi log (writeLog trong helpers/activity-log.helper.ts)
// - name: tên hiển thị ở trang nhật ký hoạt động
export const activityLogModuleList = [
  {
    id: "account",
    name: "Đăng nhập / Đăng xuất"
  },
  {
    id: "article",
    name: "Bài viết"
  },
  {
    id: "article-category",
    name: "Danh mục bài viết"
  },
  {
    id: "role",
    name: "Nhóm quyền"
  },
  {
    id: "account-admin",
    name: "Tài khoản quản trị"
  },
  {
    id: "file-manager",
    name: "Quản lý file"
  }
]

// Hành động được ghi log
// - color: màu nhãn hiển thị ở trang nhật ký hoạt động (class badge của bootstrap)
export const activityLogActionList = [
  {
    id: "login",
    name: "Đăng nhập",
    color: "bg-success"
  },
  {
    id: "login-failed",
    name: "Đăng nhập thất bại",
    color: "bg-danger"
  },
  {
    id: "logout",
    name: "Đăng xuất",
    color: "bg-secondary"
  },
  {
    id: "create",
    name: "Tạo mới",
    color: "bg-primary"
  },
  {
    id: "edit",
    name: "Chỉnh sửa",
    color: "bg-info"
  },
  {
    id: "change-password",
    name: "Đổi mật khẩu",
    color: "bg-warning"
  },
  {
    id: "delete",
    name: "Xoá (vào thùng rác)",
    color: "bg-danger"
  },
  {
    id: "undo",
    name: "Khôi phục",
    color: "bg-success"
  },
  {
    id: "delete-permanently",
    name: "Xoá vĩnh viễn",
    color: "bg-danger"
  },
  {
    id: "upload",
    name: "Tải file lên",
    color: "bg-primary"
  },
  {
    id: "rename",
    name: "Đổi tên file",
    color: "bg-info"
  },
  {
    id: "create-folder",
    name: "Tạo thư mục",
    color: "bg-primary"
  },
  {
    id: "delete-file",
    name: "Xoá file",
    color: "bg-danger"
  },
  {
    id: "delete-folder",
    name: "Xoá thư mục",
    color: "bg-danger"
  }
]