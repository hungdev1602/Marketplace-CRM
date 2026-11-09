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
    id: "order-list",
    name: "Danh sách đơn hàng (xem chi tiết đơn)"
  },
  {
    id: "order-edit",
    name: "Xử lý đơn hàng (tạo vận đơn ApiShip, cập nhật trạng thái, ghi chú)"
  },
  {
    id: "order-cancel",
    name: "Huỷ đơn hàng, hoàn tiền cho khách"
  },
  {
    id: "review-list",
    name: "Danh sách đánh giá sản phẩm của khách"
  },
  {
    id: "review-moderate",
    name: "Duyệt / từ chối / xoá đánh giá sản phẩm"
  },
  {
    id: "review-reply",
    name: "Trả lời đánh giá sản phẩm (thay mặt cửa hàng)"
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
    id: "order",
    name: "Đơn hàng"
  },
  {
    id: "review",
    name: "Đánh giá sản phẩm"
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
  },
  {
    id: "shipment",
    name: "Tạo / huỷ vận đơn",
    color: "bg-primary"
  },
  {
    id: "change-status",
    name: "Đổi trạng thái",
    color: "bg-info"
  },
  {
    id: "cancel",
    name: "Huỷ đơn / hoàn tiền",
    color: "bg-danger"
  },
  {
    id: "approve",
    name: "Duyệt",
    color: "bg-success"
  },
  {
    id: "reject",
    name: "Từ chối",
    color: "bg-warning"
  },
  {
    id: "reply",
    name: "Trả lời",
    color: "bg-info"
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

// Giao diện mặc định khi khách chưa bấm nút đổi sáng / tối
// - "system": theo cài đặt sáng / tối của máy khách
// - "light": luôn sáng, "dark": luôn tối
// Khách bấm đổi rồi thì trình duyệt nhớ lựa chọn của khách
export const clientDefaultTheme: string = "system"

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

// ===== Tài khoản khách, giỏ hàng, yêu thích (trang khách hàng) =====
// Khách không cần đăng nhập vẫn thêm được sản phẩm vào giỏ hàng / yêu thích:
// - Chưa đăng nhập: giỏ hàng, yêu thích gắn với cookie phiên "cartToken", "wishlistToken"
//   (trình duyệt tự xoá cookie phiên khi khách tắt trình duyệt => giỏ hàng, yêu thích coi như bị xoá)
// - Đăng ký / đăng nhập: sản phẩm đã chọn được gộp vào giỏ hàng, yêu thích của tài khoản (lưu lâu dài trong database,
//   đăng nhập ở máy khác cũng thấy)
// Số ngày giữ giỏ hàng / yêu thích của khách chưa đăng nhập trong database, kể từ lần thay đổi cuối cùng
// (khách tắt trình duyệt thì không mở lại được nữa, nên tự động xoá cho nhẹ database)
export const clientGuestDataRetentionDays: number = 3

// Số loại sản phẩm tối đa trong 1 giỏ hàng
export const clientCartMaxItems: number = 100

// Số lượng tối đa của 1 sản phẩm trong giỏ hàng (ngoài ra còn bị giới hạn bởi số lượng tồn kho)
export const clientCartMaxQuantity: number = 99

// Số sản phẩm tối đa trong danh sách yêu thích
export const clientWishlistMaxItems: number = 200

// Đăng nhập tài khoản khách
// - Tick "Запомнить меня": giữ đăng nhập số ngày bên dưới
// - Không tick: đăng xuất khi tắt trình duyệt (và tối đa sau 1 ngày)
export const clientLoginRememberDays: number = 30

// Quên mật khẩu (trang khách hàng: /account/forgot-password)
// Số phút link đặt lại mật khẩu trong email còn dùng được
export const clientResetPasswordExpireMinutes: number = 30

// Số giây phải chờ trước khi gửi lại email đặt lại mật khẩu cho cùng 1 tài khoản (chống gửi liên tục)
export const clientResetPasswordResendSeconds: number = 60

// ===== Tìm kiếm nâng cao (trang khách hàng) =====
// Khung gợi ý hiện ra khi khách gõ từ khoá vào ô tìm kiếm (sản phẩm, danh mục, thương hiệu, từ khoá hay tìm)
// Số sản phẩm / danh mục / thương hiệu / từ khoá tối đa trong khung gợi ý
export const clientSearchSuggestProductLimit: number = 6
export const clientSearchSuggestCategoryLimit: number = 4
export const clientSearchSuggestBrandLimit: number = 3
export const clientSearchSuggestQueryLimit: number = 4

// "Часто ищут" (từ khoá khách hay tìm): hiện khi khách bấm vào ô tìm kiếm còn trống, và ở trang không tìm thấy sản phẩm
// - Chỉ hiện từ khoá có sản phẩm và được tìm ít nhất clientSearchPopularMinCount lần
//   (tránh hiện từ khoá lạ chỉ 1 người gõ)
// - Chỉ tính từ khoá còn được tìm trong clientSearchPopularDays ngày gần đây
export const clientSearchPopularLimit: number = 8
export const clientSearchPopularMinCount: number = 2
export const clientSearchPopularDays: number = 30

// Số ngày lưu từ khoá khách đã tìm (dùng cho "Часто ищут"), từ khoá lâu không ai tìm sẽ tự động bị xoá
export const clientSearchLogRetentionDays: number = 180

// Số giây lưu tạm danh sách danh mục, thương hiệu, từ vựng (dùng để sửa lỗi chính tả) trong bộ nhớ server
// Sửa sản phẩm / danh mục ở trang admin thì sau tối đa chừng ấy giây khung gợi ý mới cập nhật
export const clientSearchCacheSeconds: number = 60

// ===== Đặt hàng, thanh toán, giao hàng (trang khách hàng: /checkout) =====
// Quy trình: khách đặt hàng => thanh toán online trước (Т-Банк) => cửa hàng tạo vận đơn ApiShip => gửi hàng
// Không nhận thanh toán khi nhận hàng (COD): chưa thanh toán thì không tạo được vận đơn
// Tài khoản, mật khẩu của ApiShip, Т-Банк điền trong file .env (xem .env.example)

// Giá trị đơn hàng tối thiểu (tiền hàng sau giảm giá, chưa gồm phí giao hàng), 0 là không yêu cầu
export const checkoutMinOrderValue: number = 0

// Miễn phí giao hàng cho đơn từ số tiền này (tiền hàng sau giảm giá), 0 là không áp dụng
// (mã giảm giá loại "Miễn phí giao hàng" vẫn dùng được như bình thường)
export const checkoutFreeDeliveryFrom: number = 0

// Bản đồ chọn điểm nhận hàng (ПВЗ) ở trang đặt hàng: thư viện Leaflet + bản đồ OpenStreetMap (miễn phí, không cần khoá API)
// Muốn dùng bản đồ khác (có link dạng .../{z}/{x}/{y}.png) thì đổi link và dòng ghi nguồn bản đồ bên dưới
export const checkoutMapTileUrl: string = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
export const checkoutMapAttribution: string = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

// Cộng thêm vào phí giao hàng ApiShip tính ra (₽), ví dụ tiền hộp, túi giữ lạnh, 0 là không cộng
// Phí giao hàng khách trả luôn được làm tròn lên số rúp chẵn
export const checkoutDeliveryMarkup: number = 0

// Số phút giữ hàng cho đơn chưa thanh toán: quá thời gian này đơn tự huỷ,
// sản phẩm trả lại kho, mã giảm giá được trả lại lượt dùng
export const orderPaymentTimeoutMinutes: number = 60

// Trạng thái đơn hàng
// - id: giá trị lưu trong database, không đổi id đã dùng
// - name: tên hiển thị ở trang admin, nameRu: tên hiển thị cho khách (tiếng Nga)
// - color: màu nhãn ở trang admin (class badge của bootstrap)
export const orderStatusList = [
  { id: "pending", name: "Chờ thanh toán", nameRu: "Ожидает оплаты", color: "bg-warning" },
  { id: "paid", name: "Đã thanh toán, chờ gửi hàng", nameRu: "Оплачен, готовим к отправке", color: "bg-info" },
  { id: "shipping", name: "Đang giao hàng", nameRu: "Передан в службу доставки", color: "bg-primary" },
  { id: "delivered", name: "Đã giao hàng", nameRu: "Доставлен", color: "bg-success" },
  { id: "returned", name: "Bị hoàn về", nameRu: "Возвращён отправителю", color: "bg-danger" },
  { id: "cancelled", name: "Đã huỷ", nameRu: "Отменён", color: "bg-secondary" }
]

// Trạng thái thanh toán
export const orderPaymentStatusList = [
  { id: "pending", name: "Chờ thanh toán", nameRu: "Ожидает оплаты", color: "bg-warning" },
  { id: "succeeded", name: "Đã thanh toán", nameRu: "Оплачен", color: "bg-success" },
  { id: "canceled", name: "Chưa thanh toán (huỷ / lỗi)", nameRu: "Не оплачен", color: "bg-secondary" },
  { id: "refunding", name: "Đang hoàn tiền", nameRu: "Возврат денег обрабатывается", color: "bg-warning" },
  { id: "refunded", name: "Đã hoàn tiền", nameRu: "Деньги возвращены", color: "bg-dark" }
]

// Cách giao hàng
// - apishipType: deliveryType trong API của ApiShip (1 - giao tận cửa, 2 - giao tới điểm nhận hàng / ПВЗ)
export const orderDeliveryTypeList = [
  { id: "courier", name: "Giao tận cửa (курьер)", nameRu: "Курьером до двери", apishipType: 1 },
  { id: "point", name: "Giao tới điểm nhận hàng (ПВЗ, постамат)", nameRu: "В пункт выдачи", apishipType: 2 }
]

// ===== ApiShip (kết nối các hãng vận chuyển: СДЭК, Boxberry, Почта России, 5Post, Яндекс Доставка,...) =====
// Chỉ lấy giá của các hãng này (key của hãng trong ApiShip), để trống [] là lấy tất cả hãng đã kết nối trong tài khoản ApiShip
// - "cdek": СДЭК, "yataxi": Яндекс Доставка, "rupost": Почта России
// - hãng khác, ví dụ: "boxberry": Boxberry, "x5": 5Post, "dpd": DPD (danh sách đầy đủ: https://docs.apiship.ru/docs/delivery-services/list-delivery-services/)
export const apishipProviderKeys: string[] = ["cdek", "yataxi", "rupost"]

// Giỏ hàng có hàng bảo quản mát / đông lạnh thì chỉ cho chọn các hãng này (ví dụ hãng có xe lạnh), để trống [] là không giới hạn
export const apishipColdProviderKeys: string[] = []

// Cách giao hàng cho hãng vận chuyển (pickupType trong API ApiShip)
// - 1: hãng cử người tới kho lấy hàng (địa chỉ kho ở apishipSender bên dưới)
// - 2: cửa hàng tự mang hàng tới điểm nhận của hãng (cần điền apishipPointInIds)
export const apishipPickupType: number = 1

// pickupType = 2: id điểm nhận hàng (ПВЗ) mà cửa hàng tự mang hàng tới, theo từng hãng, ví dụ { cdek: 12345 }
// (id lấy trong tài khoản ApiShip hoặc API /lists/points)
export const apishipPointInIds: { [providerKey: string]: number } = {}

// Địa chỉ kho gửi hàng + người liên hệ (in trên vận đơn, hãng vận chuyển tới đây lấy hàng)
// Bắt buộc điền city (và nên điền đủ các ô) trước khi bán hàng thật
export const apishipSender = {
  countryCode: "RU",
  postIndex: "", // mã bưu chính, ví dụ: 101000
  region: "", // ví dụ: Москва
  city: "Москва", // thành phố
  street: "", // ví dụ: ул. Тверская
  house: "", // số nhà, ví dụ: 1
  block: "", // корпус / строение
  office: "", // căn hộ / văn phòng / kho
  companyName: "", // tên cửa hàng / ИП, ví dụ: ИП Иванов И.И.
  contactName: "", // người liên hệ (họ tên)
  phone: "", // số điện thoại, ví dụ: +79991234567
  email: "" // email
}

// Kích thước, khối lượng mặc định của 1 sản phẩm chưa nhập "Vận chuyển" ở trang sửa sản phẩm
export const apishipDefaultItemWeight: number = 500 // gram
export const apishipDefaultItemSize = { length: 15, width: 10, height: 10 } // cm

// Khối lượng bao bì (thùng carton, túi giữ lạnh,...) cộng thêm vào mỗi đơn (gram)
export const apishipPackagingWeight: number = 200

// Các cỡ thùng đóng hàng (cm), từ nhỏ đến lớn: chọn thùng nhỏ nhất vừa với tất cả sản phẩm trong đơn
// Dùng để tính phí giao hàng và in trên vận đơn
export const apishipBoxList = [
  { length: 20, width: 15, height: 10 },
  { length: 30, width: 20, height: 15 },
  { length: 40, width: 30, height: 20 },
  { length: 50, width: 40, height: 30 },
  { length: 60, width: 40, height: 40 }
]

// Tự động tạo vận đơn ApiShip ngay khi khách thanh toán xong
// - false (mặc định): nhân viên kiểm tra, đóng hàng rồi bấm "Tạo vận đơn" ở trang chi tiết đơn hàng (admin)
// - true: tạo ngay sau khi thanh toán, ngày gửi hàng là ngày làm việc tiếp theo
export const apishipAutoCreateShipment: boolean = false

// Số phút giữa 2 lần tự động cập nhật trạng thái giao hàng từ ApiShip
export const apishipStatusSyncMinutes: number = 30

// ===== Т-Банк: Интернет-эквайринг (thanh toán online: thẻ ngân hàng, СБП, T-Pay, SberPay, Mir Pay,...) =====
// Mã terminal (TerminalKey) và mật khẩu terminal điền trong file .env (TBANK_TERMINAL_KEY, TBANK_PASSWORD)
// Các cách thanh toán khách thấy trên trang thanh toán bật / tắt trong trang Т-Бизнес (Интернет-эквайринг => Магазины)

// Gửi thông tin hoá đơn điện tử (чек 54-ФЗ) cùng với yêu cầu thanh toán
// Chỉ bật khi cửa hàng đã kết nối máy tính tiền online (онлайн-касса) trong Интернет-эквайринг của Т-Банк,
// nếu không Т-Банк sẽ báo lỗi và khách không thanh toán được
export const tbankSendReceipt: boolean = false

// Hệ thống thuế của ИП (in trên hoá đơn), hỏi kế toán:
// "osn" - ОСН, "usn_income" - УСН доходы, "usn_income_outcome" - УСН доходы минус расходы, "patent" - патент
export const tbankTaxation: string = "usn_income"

// Phiên bản định dạng hoá đơn (ФФД) của máy tính tiền online: "1.2" hoặc "1.05" (xem trong cài đặt онлайн-касса)
export const tbankFfdVersion: string = "1.2"

// Thuế VAT trên hoá đơn (Tax) theo thuế VAT của sản phẩm (productVatList)
// Kiểm tra lại với kế toán trước khi bật tbankSendReceipt
export const tbankTaxMap: { [vat: string]: string } = {
  "none": "none", // без НДС
  "0": "vat0", // 0%
  "5": "vat5", // 5% (УСН)
  "7": "vat7", // 7% (УСН)
  "10": "vat10", // 10%
  "22": "vat22" // 22%
}

// Thuế VAT của phí giao hàng trên hoá đơn (dòng "Доставка")
export const tbankDeliveryTax: string = "none"

// Hình thức thanh toán trên hoá đơn (PaymentMethod): "full_prepayment" - trả trước 100% (giao hàng sau),
// "full_payment" - thanh toán đủ. Hỏi kế toán nên dùng loại nào
export const tbankReceiptPaymentMethod: string = "full_prepayment"

// ===== Đánh giá sản phẩm (trang khách hàng) =====
// Giống Wildberries / Ozon: chỉ khách đã NHẬN HÀNG (đơn ở trạng thái "Đã giao hàng") mới đánh giá được sản phẩm trong đơn đó
// Mỗi khách (tài khoản, hoặc email nếu đặt hàng không đăng nhập) đánh giá mỗi sản phẩm 1 lần, sửa lại được trong reviewEditDays ngày

// Duyệt đánh giá trước khi hiện trên trang sản phẩm
// - true: đánh giá có chữ / ảnh phải được nhân viên duyệt ở trang admin (Đánh giá) mới hiện (giống Wildberries)
// - false: hiện ngay, nhân viên vẫn ẩn (từ chối) được sau đó
// Chỉ chấm sao, không viết gì: luôn được tính ngay vào điểm trung bình (không có nội dung cần duyệt)
export const reviewModeration: boolean = true

// Số ảnh tối đa trong 1 đánh giá
export const reviewMaxPhotos: number = 5

// Dung lượng tối đa mỗi ảnh (MB). Trình duyệt tự thu nhỏ ảnh (cạnh dài nhất reviewPhotoMaxSide px) trước khi gửi,
// nên ảnh chụp điện thoại 10MB thường chỉ còn khoảng 300-600KB
export const reviewPhotoMaxSize: number = 10
export const reviewPhotoMaxSide: number = 1600

// Thư mục lưu ảnh đánh giá trên server Quản lý file (/media/danh-gia), tự tạo nếu chưa có
export const reviewImageFolder: string = "danh-gia"

// Số ký tự tối đa của từng ô
export const reviewTextMaxLength = {
  pros: 1000, // Достоинства (ưu điểm)
  cons: 1000, // Недостатки (nhược điểm)
  comment: 2000 // Комментарий (nhận xét)
}

// Khách được sửa / xoá đánh giá của mình trong bao nhiêu ngày kể từ lúc viết
export const reviewEditDays: number = 30

// Số đánh giá mỗi lần tải ở trang sản phẩm (slider ngang: kéo / bấm mũi tên tới cuối thì tự tải thêm)
export const reviewPerPage: number = 10

// Thẻ đánh giá trong slider chỉ hiện đoạn đầu (số ký tự của ưu điểm + nhược điểm + nhận xét cộng lại),
// đánh giá dài hơn có nút "Читать полностью": bấm mới tải toàn bộ nội dung (không tải hết ngay khi mở trang)
export const reviewPreviewLength: number = 220
export const reviewReplyPreviewLength: number = 100 // đoạn đầu câu trả lời của cửa hàng

// Trạng thái đánh giá
export const reviewStatusList = [
  { id: "pending", name: "Chờ duyệt", nameRu: "На проверке", color: "bg-warning" },
  { id: "published", name: "Đã đăng", nameRu: "Опубликован", color: "bg-success" },
  { id: "rejected", name: "Bị từ chối", nameRu: "Отклонён", color: "bg-danger" }
]

// Email nhắc khách đánh giá sau khi nhận hàng ("Как вам покупка?"), có link chấm sao cho từng sản phẩm
// - reviewRequestDelayHours: gửi sau khi đơn chuyển sang "Đã giao hàng" bao nhiêu giờ (để khách kịp dùng thử)
// - reviewRequestMaxDays: chỉ gửi cho đơn giao trong bao nhiêu ngày gần đây (đơn cũ hơn thì bỏ qua)
// Chưa cấu hình SMTP trong .env thì nội dung email được in ra terminal (giống email đơn hàng)
export const reviewRequestEmail: boolean = true
export const reviewRequestDelayHours: number = 24
export const reviewRequestMaxDays: number = 14
