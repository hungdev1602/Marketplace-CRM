import express, { Request, Response, Express } from 'express';
import path from "path"
import fs from "fs"
import { adminRoute } from './routes/admin/index.route';
import { clientRoute } from './routes/client/index.route';
import { domainFileManager, pathAdmin } from './config/variable.config';
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import { connectDB } from './config/database.config';
import { scheduleDeleteOldLogs } from './helpers/activity-log.helper';
import { deleteOldProductImports, stopInterruptedProductImports } from './helpers/product-import.helper';
import { scheduleDeleteOldCarts } from './helpers/cart.helper';
import { scheduleDeleteOldWishlists } from './helpers/wishlist.helper';
import { scheduleDeleteOldSearchQueries } from './helpers/client-search.helper';
import { scheduleOrderJobs } from './helpers/order.helper';
import { scheduleReviewJobs } from './helpers/review.helper';
import { scheduleIntegrationReload } from './helpers/integration.helper';
import { scheduleDeleteOldApiCallLogs } from './helpers/api-call-log.helper';
import { jsonView } from './middlewares/json-view.middleware';

// Load biến môi trường env
dotenv.config()

const app: Express = express()
const port: number = 3000

// Kết nối database, kết nối xong thì:
// - bật tự động xoá nhật ký hoạt động cũ
// - lượt nhập sản phẩm từ Excel đang xử lý dở (server bị tắt giữa chừng) chuyển thành thất bại, xoá lịch sử nhập file cũ
// - bật tự động xoá giỏ hàng, danh sách yêu thích lâu không dùng
// - bật tự động xoá từ khoá tìm kiếm lâu không ai tìm
// - bật tự động kiểm tra thanh toán (huỷ đơn quá hạn thanh toán) và cập nhật trạng thái giao hàng từ ApiShip
// Trước hết nạp cấu hình kết nối API bên thứ 3 (Т-Банк, ApiShip, email) đã nhập ở trang admin,
// để các việc chạy định kỳ bên dưới dùng đúng khoá API
connectDB().then(async () => {
  await scheduleIntegrationReload()
  scheduleDeleteOldApiCallLogs() // xoá nhật ký gọi API cũ
  scheduleDeleteOldLogs()
  stopInterruptedProductImports()
  deleteOldProductImports()
  scheduleDeleteOldCarts()
  scheduleDeleteOldWishlists()
  scheduleDeleteOldSearchQueries()
  scheduleOrderJobs()
  scheduleReviewJobs() // email nhắc khách đánh giá sản phẩm sau khi nhận hàng
})

// Giao diện Next.js (thư mục frontend) đứng trước server này và chuyển tiếp request của khách sang,
// nên địa chỉ IP của khách (req.ip, ghi trong nhật ký hoạt động) nằm ở header X-Forwarded-For.
// Chỉ tin header này khi request đến từ chính máy này (loopback), người ngoài không giả mạo IP được.
// Next.js chạy ở máy khác thì đặt TRUST_PROXY trong file .env là địa chỉ IP của máy đó
app.set("trust proxy", process.env.TRUST_PROXY || "loopback")

// Cho phép gửi data lên dạng json
app.use(express.json())

// Đọc cookie gửi lên từ trình duyệt (req.cookies), dùng để lưu token đăng nhập
app.use(cookieParser())

// thiết lập thư mục public, chứa file tĩnh (css, js, img,...)
// Đặt trước middleware tắt cache bên dưới, để trình duyệt được lưu cache file tĩnh.
// - no-cache: được lưu cache nhưng mỗi lần dùng phải hỏi lại server,
//   file không đổi thì server trả 304 (không tải lại), file đã sửa thì tải bản mới
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-cache")
  }
}))

// Chế độ JSON cho giao diện Next.js (thư mục frontend): request có header "X-Response-Format: json"
// thì res.render / res.redirect trả về JSON thay cho trang PUG. Không có header thì chạy y như cũ
app.use(jsonView)

// Middleware tắt cache (áp dụng cho tất cả GET request, trừ file tĩnh ở trên)
app.use((req, res, next) => {
  if (req.method === 'GET') {
    // Tắt cache
    // - no-store: không lưu ở cache nào cả
    // - no-cache: luôn kiểm tra lại với server trước khi dùng cache
    // - must-revalidate: nếu cache hết hạn thì phải hỏi lại server
    // - private: chỉ cache trên trình duyệt cá nhân, không cho proxy/cache chung
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Để tương thích với trình duyệt / proxy cũ
    res.set('Pragma', 'no-cache');

    // Đặt thời gian hết hạn của response là ngay lập tức (nghĩa là trình duyệt không được dùng lại mà không hỏi server)
    res.set('Expires', '0');
  }
  next();
});


// view engine setup
app.set("views", path.join(__dirname, "views")) // thư mục chứa file pug
app.set("view engine", "pug") // thiết lập view engine là pug

// Cache file PUG đã biên dịch, để không phải biên dịch lại layout/partials ở mỗi request
app.set("view cache", true)

// Khi sửa file .pug thì xoá cache, nên vẫn thấy thay đổi ngay mà không cần khởi động lại server
// "Phiên bản" của thư mục views = danh sách file .pug kèm thời gian sửa
const pug = require("pug") // dùng require vì thư viện pug không có sẵn khai báo kiểu cho TypeScript
const viewsPath = path.join(__dirname, "views")
const getViewsVersion = (dir: string): string => {
  return fs.readdirSync(dir, { withFileTypes: true })
    .map(item => {
      const itemPath = path.join(dir, item.name)
      if(item.isDirectory()) {
        return getViewsVersion(itemPath)
      }
      return `${itemPath}:${fs.statSync(itemPath).mtimeMs}`
    })
    .join("|")
}
// Đọc lại thư mục views tốn thời gian (hơn 100 file, đọc từng file), nên chỉ kiểm tra tối đa 1 lần / 3 giây
// thay vì ở mọi request (mỗi lần mở trang, thêm giỏ hàng, gõ tìm kiếm...)
let viewsVersion = getViewsVersion(viewsPath)
let viewsCheckedAt = Date.now()
app.use((req, res, next) => {
  if(Date.now() - viewsCheckedAt < 3000) {
    next()
    return
  }
  viewsCheckedAt = Date.now()
  const currentVersion = getViewsVersion(viewsPath)
  if(currentVersion !== viewsVersion) {
    viewsVersion = currentVersion;
    (app as any).cache = {} // cache view của Express
    pug.cache = {} // cache template đã biên dịch của PUG
  }
  next()
})

// tạo biến toàn cục để dùng được trong file PUG
app.locals.pathAdmin = pathAdmin // "admin"
app.locals.domainFileManager = domainFileManager // "link server file-manager"

// route admin
adminRoute(app)
// route client (đặt sau route admin, vì trang khách hàng có trang 404 bắt tất cả đường dẫn còn lại)
clientRoute(app)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})