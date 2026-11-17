// ===== Chế độ JSON cho giao diện Next.js (thư mục frontend) =====
// Giao diện Next.js gọi đúng các đường dẫn đang có của server (ví dụ GET /products, GET /admin/product/list)
// kèm header bên dưới. Khi có header này, server KHÔNG dựng trang PUG mà trả về dữ liệu của trang dạng JSON
// (xem middlewares/json-view.middleware.ts). Không có header thì server chạy y như cũ (trang PUG).

// Tên và giá trị header
export const jsonViewHeaderName = "x-response-format"
export const jsonViewHeaderValue = "json"

// Các biến dùng chung (res.locals) không cần gửi cho giao diện Next.js
// - allCategory: controller dùng nội bộ, giao diện đã có categoryTree
export const jsonViewSkipLocals: string[] = ["allCategory"]

// ===== Các trường KHÔNG được gửi ra trình duyệt của khách =====
// Trang PUG chỉ in ra những gì viết trong file .pug, còn chế độ JSON gửi cả bản ghi lấy từ database,
// nên phải liệt kê các trường nội bộ ở đây để chúng không lọt ra trang khách hàng.
// Thêm trường nội bộ mới vào model (giá vốn, ghi chú nội bộ, thông tin nhân viên...) thì NHỚ thêm vào đây.

// Áp dụng cho MỌI trang (cả admin và khách hàng), ở mọi cấp của dữ liệu
export const jsonViewHiddenFieldsAll: string[] = ["password", "__v"]

// Áp dụng cho trang khách hàng, ở mọi cấp của dữ liệu (kể cả dữ liệu lấy bằng .lean() / aggregate)
export const jsonViewHiddenFieldsClient: string[] = [
  "costPrice", // giá vốn của sản phẩm
  "adminNote", // ghi chú nội bộ của đơn hàng
  "deliveryCostOriginal", // phí giao hàng cửa hàng trả cho hãng vận chuyển
  "moderatedBy", // nhân viên duyệt đánh giá
  "customerKey", // nhận diện khách trong đánh giá
  "customerEmail", // email khách trong đánh giá
  "customerName", // họ tên đầy đủ của khách trong đánh giá
  "search", // chuỗi tìm kiếm nội bộ
  "deleted",
  "deletedAt"
]

// Áp dụng cho trang khách hàng, theo từng model (tên model trong mongoose.model("...")),
// ẩn trong toàn bộ bản ghi của model đó (kể cả dữ liệu lồng bên trong)
export const jsonViewHiddenFieldsClientByModel: { [modelName: string]: string[] } = {
  Product: ["sold", "view", "vat", "position"],
  CategoryProduct: ["view", "position"],
  Review: ["userId", "orderId", "orderCode"],
  Order: [
    "by", // tên nhân viên trong lịch sử trạng thái, người trả lời
    "stockReleased",
    "reviewRequestSentAt",
    "lockedAt",
    "notifiedAt",
    "refundId",
    "paymentId",
    "attempt"
  ],
  Cart: ["token", "userId"],
  Wishlist: ["token", "userId"],
  AccountClient: ["agreedAt", "lastLoginAt", "status"]
}
