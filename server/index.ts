import express, { Request, Response, Express } from 'express';
import path from "path"
import fs from "fs"
import { adminRoute } from './routes/admin/index.route';
import { clientRoute } from './routes/client/index.route';
import { domainFileManager, pathAdmin } from './config/variable.config';
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import { connectDB } from './config/database.config';

// Load biến môi trường env
dotenv.config()

const app: Express = express()
const port: number = 3000

// Kết nối database
connectDB()

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
let viewsVersion = getViewsVersion(viewsPath)
app.use((req, res, next) => {
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

// route client
clientRoute(app)
// route admin
adminRoute(app)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})