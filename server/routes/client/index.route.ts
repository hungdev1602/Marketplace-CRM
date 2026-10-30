import { Express } from "express"
import { homePageRoute } from "./homePage.route"
import { productRoute } from "./product.route"
import { articleRoute } from "./article.route"
import { languageRoute } from "./language.route"
import * as languageMiddleware from "../../middlewares/client/language.middleware"
import * as layoutMiddleware from "../../middlewares/client/layout.middleware"
import * as errorController from "../../controller/client/error.controller"

// Lưu ý: gọi clientRoute sau adminRoute (index.ts), vì cuối cùng có trang 404 bắt tất cả đường dẫn còn lại
export const clientRoute = (app: Express) => {
  // Đổi ngôn ngữ (chỉ lưu cookie rồi chuyển trang, không cần dữ liệu bên dưới)
  app.use("/language", languageRoute)

  // Ngôn ngữ và dữ liệu chung (menu danh mục, thông tin cửa hàng) cho tất cả trang khách hàng bên dưới
  app.use(languageMiddleware.setLanguage)
  app.use(layoutMiddleware.loadLayoutData)

  app.use("/", homePageRoute)

  app.use("/", productRoute)

  app.use("/blog", articleRoute)

  // Không trang nào khớp thì hiện trang 404
  app.use(errorController.notFound)
}
