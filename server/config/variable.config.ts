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
    id: "product-import",
    name: "Nhập sản phẩm từ Excel (thêm mới, cập nhật hàng loạt)"
  },
  {
    id: "product-export",
    name: "Xuất danh sách sản phẩm ra Excel"
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
    id: "coupon-list",
    name: "Danh sách mã giảm giá"
  },
  {
    id: "coupon-create",
    name: "Tạo mã giảm giá"
  },
  {
    id: "coupon-edit",
    name: "Sửa mã giảm giá (kể cả tạm dừng / bật lại)"
  },
  {
    id: "coupon-delete",
    name: "Xoá mã giảm giá"
  },
  {
    id: "coupon-trash",
    name: "Thùng rác mã giảm giá (khôi phục, xoá vĩnh viễn)"
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
    id: "coupon",
    name: "Mã giảm giá"
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
  },
  {
    id: "import",
    name: "Nhập file Excel",
    color: "bg-primary"
  },
  {
    id: "export",
    name: "Xuất file Excel",
    color: "bg-secondary"
  }
]
// ===== Sản phẩm (thực phẩm châu Á bán tại Nga) =====
// Các danh sách bên dưới dùng cho ô chọn ở trang tạo/sửa sản phẩm
// - id: giá trị lưu trong database, không đổi id đã dùng (sản phẩm đã tạo đang lưu theo id)
// - name: tên hiển thị, đổi thoải mái
// - nameRu: tên tiếng Nga, hiển thị ở trang khách hàng khi khách chọn tiếng Nga
// Muốn thêm lựa chọn thì thêm 1 dòng { id, name, nameRu } vào danh sách tương ứng

// Tồn kho nhỏ hơn hoặc bằng số này thì báo "Sắp hết hàng" ở danh sách sản phẩm
export const productLowStockThreshold: number = 10

// Xuất xứ (id là mã quốc gia ISO)
export const productOriginList = [
  { id: "VN", name: "Việt Nam", nameRu: "Вьетнам" },
  { id: "TH", name: "Thái Lan", nameRu: "Таиланд" },
  { id: "KR", name: "Hàn Quốc", nameRu: "Южная Корея" },
  { id: "JP", name: "Nhật Bản", nameRu: "Япония" },
  { id: "CN", name: "Trung Quốc", nameRu: "Китай" },
  { id: "TW", name: "Đài Loan", nameRu: "Тайвань" },
  { id: "ID", name: "Indonesia", nameRu: "Индонезия" },
  { id: "MY", name: "Malaysia", nameRu: "Малайзия" },
  { id: "PH", name: "Philippines", nameRu: "Филиппины" },
  { id: "SG", name: "Singapore", nameRu: "Сингапур" },
  { id: "IN", name: "Ấn Độ", nameRu: "Индия" },
  { id: "LA", name: "Lào", nameRu: "Лаос" },
  { id: "KH", name: "Campuchia", nameRu: "Камбоджа" },
  { id: "MM", name: "Myanmar", nameRu: "Мьянма" },
  { id: "RU", name: "Nga", nameRu: "Россия" },
  { id: "other", name: "Khác", nameRu: "Другое" }
]

// Đơn vị bán
export const productUnitList = [
  { id: "pack", name: "Gói", nameRu: "Упаковка" },
  { id: "box", name: "Hộp", nameRu: "Коробка" },
  { id: "bottle", name: "Chai", nameRu: "Бутылка" },
  { id: "can", name: "Lon", nameRu: "Жестяная банка" },
  { id: "jar", name: "Hũ / Lọ", nameRu: "Банка" },
  { id: "bag", name: "Túi", nameRu: "Пакет" },
  { id: "tray", name: "Khay", nameRu: "Лоток" },
  { id: "bunch", name: "Bó", nameRu: "Пучок" },
  { id: "piece", name: "Cái / Quả", nameRu: "Штука" },
  { id: "kg", name: "Kg", nameRu: "Кг" },
  { id: "carton", name: "Thùng", nameRu: "Ящик" }
]

// Đơn vị khối lượng tịnh / thể tích (in trên bao bì)
export const productNetWeightUnitList = [
  { id: "g", name: "g", nameRu: "г" },
  { id: "kg", name: "kg", nameRu: "кг" },
  { id: "ml", name: "ml", nameRu: "мл" },
  { id: "l", name: "l", nameRu: "л" }
]

// Điều kiện bảo quản (ảnh hưởng đến cách giao hàng: hàng mát, hàng đông lạnh cần xe/hộp giữ lạnh)
// - color: màu nhãn hiển thị ở danh sách sản phẩm (class badge của bootstrap)
export const productStorageList = [
  { id: "ambient", name: "Nhiệt độ thường", nameRu: "При комнатной температуре", color: "bg-secondary" },
  { id: "chilled", name: "Bảo quản mát (+2°C đến +6°C)", nameRu: "Охлаждённое (от +2°C до +6°C)", color: "bg-info" },
  { id: "frozen", name: "Đông lạnh (-18°C trở xuống)", nameRu: "Замороженное (-18°C и ниже)", color: "bg-primary" }
]

// Đơn vị hạn sử dụng
export const productShelfLifeUnitList = [
  { id: "day", name: "Ngày" },
  { id: "month", name: "Tháng" },
  { id: "year", name: "Năm" }
]

// Chất gây dị ứng phải ghi trên nhãn theo quy chuẩn ЕАЭС ТР ТС 022/2011
export const productAllergenList = [
  { id: "gluten", name: "Ngũ cốc chứa gluten (lúa mì, lúa mạch...)", nameRu: "Злаки, содержащие глютен (пшеница, ячмень...)" },
  { id: "crustaceans", name: "Giáp xác (tôm, cua...)", nameRu: "Ракообразные (креветки, крабы...)" },
  { id: "molluscs", name: "Thân mềm (mực, bạch tuộc, sò, ốc...)", nameRu: "Моллюски (кальмары, осьминоги, мидии...)" },
  { id: "fish", name: "Cá (kể cả nước mắm, mắm cá)", nameRu: "Рыба (в том числе рыбный соус)" },
  { id: "eggs", name: "Trứng", nameRu: "Яйца" },
  { id: "milk", name: "Sữa (lactose)", nameRu: "Молоко (лактоза)" },
  { id: "peanuts", name: "Đậu phộng", nameRu: "Арахис" },
  { id: "nuts", name: "Các loại hạt (điều, óc chó, hạnh nhân...)", nameRu: "Орехи (кешью, грецкий орех, миндаль...)" },
  { id: "soy", name: "Đậu nành", nameRu: "Соя" },
  { id: "sesame", name: "Vừng (mè)", nameRu: "Кунжут" },
  { id: "celery", name: "Cần tây", nameRu: "Сельдерей" },
  { id: "mustard", name: "Mù tạt", nameRu: "Горчица" },
  { id: "lupin", name: "Đậu lupin", nameRu: "Люпин" },
  { id: "sulphites", name: "Sulfit (trên 10 mg/kg)", nameRu: "Диоксид серы и сульфиты (более 10 мг/кг)" }
]

// Đặc điểm (dùng để khách lọc sản phẩm)
export const productDietTagList = [
  { id: "spicy", name: "Cay", nameRu: "Острое" },
  { id: "vegetarian", name: "Chay", nameRu: "Вегетарианское" },
  { id: "vegan", name: "Thuần chay", nameRu: "Веганское" },
  { id: "halal", name: "Halal", nameRu: "Халяль" },
  { id: "gluten-free", name: "Không gluten", nameRu: "Без глютена" },
  { id: "sugar-free", name: "Không đường", nameRu: "Без сахара" },
  { id: "organic", name: "Hữu cơ", nameRu: "Органическое" }
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

// ===== Nhập / xuất sản phẩm bằng Excel =====
// Số dòng sản phẩm tối đa trong 1 file nhập
export const productImportMaxRows: number = 5000

// Dung lượng tối đa của file nhập (MB)
export const productImportMaxFileSize: number = 10

// Số ngày lưu lịch sử nhập file (kèm danh sách dòng lỗi), cũ hơn sẽ tự động bị xoá
export const productImportRetentionDays: number = 30

// Thư mục (trong Quản lý file) lưu ảnh được tải về từ link ngoài khi nhập file, ví dụ link ảnh trên web nhà cung cấp
export const productImportImageFolder: string = "nhap-excel"

// Dung lượng tối đa của 1 ảnh tải về từ link ngoài (MB)
export const productImportImageMaxSize: number = 5

// ===== Mã giảm giá =====
// Múi giờ của cửa hàng: giờ Moscow (UTC+3, Nga không đổi giờ mùa hè/mùa đông)
// Thời gian bắt đầu / kết thúc mã giảm giá nhập ở trang admin và hiển thị trong danh sách đều theo múi giờ này,
// không phụ thuộc múi giờ của máy chủ (máy chủ đặt ở nước khác vẫn chạy đúng giờ Moscow)
export const shopUtcOffset: string = "+03:00"

// Loại giảm giá
// - id: giá trị lưu trong database, không đổi id đã dùng
export const couponTypeList = [
  { id: "percent", name: "Giảm theo %" },
  { id: "fixed", name: "Giảm số tiền cố định (₽)" },
  { id: "free-shipping", name: "Miễn phí giao hàng" }
]

// Phạm vi áp dụng (sản phẩm nào trong giỏ hàng được giảm giá)
export const couponApplyToList = [
  { id: "all", name: "Tất cả sản phẩm" },
  { id: "category", name: "Sản phẩm thuộc danh mục được chọn" },
  { id: "product", name: "Sản phẩm được chọn" }
]

// ===== Trang khách hàng =====
// Ngôn ngữ của trang khách hàng, khách chọn ở đầu trang (lưu trong cookie "lang")
// Ngôn ngữ đầu tiên là ngôn ngữ mặc định (khách chưa chọn ngôn ngữ nào)
// Từ ngữ của từng ngôn ngữ nằm trong thư mục locales (locales/ru.ts, locales/vi.ts)
export const clientLanguageList = [
  { id: "ru", name: "Русский", shortName: "RU" },
  { id: "vi", name: "Tiếng Việt", shortName: "VI" }
]

// Thông tin cửa hàng hiển thị ở đầu trang và chân trang
// Để trống ("") thì mục đó không hiển thị
export const shopInfo = {
  phone: "", // số điện thoại / hotline, ví dụ: +7 (999) 123-45-67
  email: "", // ví dụ: info@sfoodie.ru
  address: "", // địa chỉ cửa hàng / kho
  workingHours: "", // giờ làm việc, ví dụ: 09:00 - 21:00
  telegram: "", // link Telegram, ví dụ: https://t.me/sfoodie
  whatsapp: "", // link WhatsApp, ví dụ: https://wa.me/79991234567
  vk: "" // link trang VK, ví dụ: https://vk.com/sfoodie
}

// Số sản phẩm mỗi trang ở trang danh sách sản phẩm
export const clientProductPerPage: number = 20

// Số bài viết mỗi trang ở trang blog
export const clientArticlePerPage: number = 9

// Số sản phẩm hiển thị ở mỗi mục của trang chủ (nổi bật, giảm giá, hàng mới về, bán chạy)
export const clientHomeProductLimit: number = 10
