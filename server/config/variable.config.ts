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
    id: "product-list",
    name: "Danh sách sản phẩm"
  },
  {
    id: "product-create",
    name: "Tạo sản phẩm"
  },
  {
    id: "product-edit",
    name: "Sửa sản phẩm"
  },
  {
    id: "product-delete",
    name: "Xoá sản phẩm"
  },
  {
    id: "product-trash",
    name: "Thùng rác sản phẩm (khôi phục, xoá vĩnh viễn)"
  },
  {
    id: "product-category",
    name: "Danh mục sản phẩm"
  },
  {
    id: "product-category-create",
    name: "Tạo danh mục sản phẩm"
  },
  {
    id: "product-category-edit",
    name: "Sửa danh mục sản phẩm"
  },
  {
    id: "product-category-delete",
    name: "Xoá danh mục sản phẩm"
  },
  {
    id: "product-category-trash",
    name: "Thùng rác danh mục sản phẩm (khôi phục, xoá vĩnh viễn)"
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
// Số tháng lưu nhật ký, nhật ký cũ hơn sẽ tự động bị xoá (1 năm = 12, 6 tháng = 6)
// Sửa số này rồi khởi động lại server là có hiệu lực, áp dụng cho cả nhật ký đã ghi trước đó
export const activityLogRetentionMonths: number = 12

// Chức năng được ghi log
// - id: mã chức năng, dùng khi ghi log (writeLog trong helpers/activity-log.helper.ts)
// - name: tên hiển thị ở trang nhật ký hoạt động
export const activityLogModuleList = [
  {
    id: "account",
    name: "Đăng nhập / Đăng xuất"
  },
  {
    id: "product",
    name: "Sản phẩm"
  },
  {
    id: "product-category",
    name: "Danh mục sản phẩm"
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
// ===== Sản phẩm (thực phẩm châu Á bán tại Nga) =====
// Các danh sách bên dưới dùng cho ô chọn ở trang tạo/sửa sản phẩm
// - id: giá trị lưu trong database, không đổi id đã dùng (sản phẩm đã tạo đang lưu theo id)
// - name: tên hiển thị, đổi thoải mái
// Muốn thêm lựa chọn thì thêm 1 dòng { id, name } vào danh sách tương ứng

// Tồn kho nhỏ hơn hoặc bằng số này thì báo "Sắp hết hàng" ở danh sách sản phẩm
export const productLowStockThreshold: number = 10

// Xuất xứ (id là mã quốc gia ISO)
export const productOriginList = [
  { id: "VN", name: "Việt Nam" },
  { id: "TH", name: "Thái Lan" },
  { id: "KR", name: "Hàn Quốc" },
  { id: "JP", name: "Nhật Bản" },
  { id: "CN", name: "Trung Quốc" },
  { id: "TW", name: "Đài Loan" },
  { id: "ID", name: "Indonesia" },
  { id: "MY", name: "Malaysia" },
  { id: "PH", name: "Philippines" },
  { id: "SG", name: "Singapore" },
  { id: "IN", name: "Ấn Độ" },
  { id: "LA", name: "Lào" },
  { id: "KH", name: "Campuchia" },
  { id: "MM", name: "Myanmar" },
  { id: "RU", name: "Nga" },
  { id: "other", name: "Khác" }
]

// Đơn vị bán
export const productUnitList = [
  { id: "pack", name: "Gói" },
  { id: "box", name: "Hộp" },
  { id: "bottle", name: "Chai" },
  { id: "can", name: "Lon" },
  { id: "jar", name: "Hũ / Lọ" },
  { id: "bag", name: "Túi" },
  { id: "tray", name: "Khay" },
  { id: "bunch", name: "Bó" },
  { id: "piece", name: "Cái / Quả" },
  { id: "kg", name: "Kg" },
  { id: "carton", name: "Thùng" }
]

// Đơn vị khối lượng tịnh / thể tích (in trên bao bì)
export const productNetWeightUnitList = [
  { id: "g", name: "g" },
  { id: "kg", name: "kg" },
  { id: "ml", name: "ml" },
  { id: "l", name: "l" }
]

// Điều kiện bảo quản (ảnh hưởng đến cách giao hàng: hàng mát, hàng đông lạnh cần xe/hộp giữ lạnh)
// - color: màu nhãn hiển thị ở danh sách sản phẩm (class badge của bootstrap)
export const productStorageList = [
  { id: "ambient", name: "Nhiệt độ thường", color: "bg-secondary" },
  { id: "chilled", name: "Bảo quản mát (+2°C đến +6°C)", color: "bg-info" },
  { id: "frozen", name: "Đông lạnh (-18°C trở xuống)", color: "bg-primary" }
]

// Đơn vị hạn sử dụng
export const productShelfLifeUnitList = [
  { id: "day", name: "Ngày" },
  { id: "month", name: "Tháng" },
  { id: "year", name: "Năm" }
]

// Chất gây dị ứng phải ghi trên nhãn theo quy chuẩn ЕАЭС ТР ТС 022/2011
export const productAllergenList = [
  { id: "gluten", name: "Ngũ cốc chứa gluten (lúa mì, lúa mạch...)" },
  { id: "crustaceans", name: "Giáp xác (tôm, cua...)" },
  { id: "molluscs", name: "Thân mềm (mực, bạch tuộc, sò, ốc...)" },
  { id: "fish", name: "Cá (kể cả nước mắm, mắm cá)" },
  { id: "eggs", name: "Trứng" },
  { id: "milk", name: "Sữa (lactose)" },
  { id: "peanuts", name: "Đậu phộng" },
  { id: "nuts", name: "Các loại hạt (điều, óc chó, hạnh nhân...)" },
  { id: "soy", name: "Đậu nành" },
  { id: "sesame", name: "Vừng (mè)" },
  { id: "celery", name: "Cần tây" },
  { id: "mustard", name: "Mù tạt" },
  { id: "lupin", name: "Đậu lupin" },
  { id: "sulphites", name: "Sulfit (trên 10 mg/kg)" }
]

// Đặc điểm (dùng để khách lọc sản phẩm)
export const productDietTagList = [
  { id: "spicy", name: "Cay" },
  { id: "vegetarian", name: "Chay" },
  { id: "vegan", name: "Thuần chay" },
  { id: "halal", name: "Halal" },
  { id: "gluten-free", name: "Không gluten" },
  { id: "sugar-free", name: "Không đường" },
  { id: "organic", name: "Hữu cơ" }
]

// Thuế VAT (НДС) in trên hoá đơn điện tử / máy tính tiền online (54-ФЗ)
// Từ 01/01/2026: mức chung 22%, thực phẩm thiết yếu 10%, doanh nghiệp УСН có thể dùng 5% hoặc 7%
export const productVatList = [
  { id: "none", name: "Không chịu thuế (без НДС)" },
  { id: "0", name: "0%" },
  { id: "5", name: "5% (УСН)" },
  { id: "7", name: "7% (УСН)" },
  { id: "10", name: "10% (thực phẩm thiết yếu)" },
  { id: "22", name: "22%" }
]
