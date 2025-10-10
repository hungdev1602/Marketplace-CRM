import express, { Request, Response, Express } from 'express';
import path from "path"
import { adminRoute } from './routes/admin/index.route';
import { clientRoute } from './routes/client/index.route';
import { domainFileManager, pathAdmin } from './config/variable.config';
import dotenv from "dotenv"
import { connectDB } from './config/database.config';

// Load biến môi trường env
dotenv.config()

const app: Express = express()
const port: number = 3000

// Kết nối database
connectDB()

// Cho phép gửi data lên dạng json
app.use(express.json())

// Middleware tắt cache (áp dụng cho tất cả GET request)
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

// thiết lập thư mục public, chứa file tĩnh (css, js, img,...)
app.use(express.static(path.join(__dirname, "public")))

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