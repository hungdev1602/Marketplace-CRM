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