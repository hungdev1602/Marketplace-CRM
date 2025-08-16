import express, { Request, Response, Express } from 'express';
import path from "path"

const app: Express = express()
const port: number = 3000

// view engine setup
app.set("views", path.join(__dirname, "views")) // thư mục chứa file pug
app.set("view engine", "pug") // thiết lập view engine là pug

// thiết lập thư mục public, chứa file tĩnh (css, js, img,...)
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req: Request, res: Response) => {
  res.render("client/pages/home", {
    pageTitle: "Home Page Zenis"
  })
})

app.get("/admin/dashboard", (req: Request, res: Response) => {
  res.render("admin/pages/dashboard", {
    pageTitle: "Admin Dashboard"
  })
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})