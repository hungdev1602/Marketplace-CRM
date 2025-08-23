import express, { Request, Response, Express } from 'express';
import path from "path"
import { adminRoute } from './routes/admin/index.route';
import { clientRoute } from './routes/client/index.route';
import { pathAdmin } from './config/variable.config';
import dotenv from "dotenv"
import { connectDB } from './config/database.config';

// Load biến môi trường env
dotenv.config()

const app: Express = express()
const port: number = 3000

// Kết nối database
connectDB()

// view engine setup
app.set("views", path.join(__dirname, "views")) // thư mục chứa file pug
app.set("view engine", "pug") // thiết lập view engine là pug

// thiết lập thư mục public, chứa file tĩnh (css, js, img,...)
app.use(express.static(path.join(__dirname, "public")))

// tạo biến toàn cục để dùng được trong file PUG
app.locals.pathAdmin = pathAdmin // "admin"

// route client
clientRoute(app)
// route admin
adminRoute(app)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})