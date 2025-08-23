import express, { Request, Response, Express } from 'express';
import path from "path"
import { adminRoute } from './routes/admin/index.route';
import { clientRoute } from './routes/client/index.route';

const app: Express = express()
const port: number = 3000

// view engine setup
app.set("views", path.join(__dirname, "views")) // thư mục chứa file pug
app.set("view engine", "pug") // thiết lập view engine là pug

// thiết lập thư mục public, chứa file tĩnh (css, js, img,...)
app.use(express.static(path.join(__dirname, "public")))

// route client
clientRoute(app)
// route admin
adminRoute(app)

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})