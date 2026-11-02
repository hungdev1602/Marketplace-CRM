import { Express } from "express"
import { homePageRoute } from "./homePage.route"
import { productRoute } from "./product.route"
import { articleRoute } from "./article.route"
import { languageRoute } from "./language.route"
import { cartRoute } from "./cart.route"
import { wishlistRoute } from "./wishlist.route"
import { accountRoute } from "./account.route"
import * as languageMiddleware from "../../middlewares/client/language.middleware"
import * as layoutMiddleware from "../../middlewares/client/layout.middleware"
import * as authMiddleware from "../../middlewares/client/auth.middleware"
import * as errorController from "../../controller/client/error.controller"

// Lưu ý: gọi clientRoute sau adminRoute (index.ts), vì cuối cùng có trang 404 bắt tất cả đường dẫn còn lại
export const clientRoute = (app: Express) => {
  // Đổi ngôn ngữ (chỉ lưu cookie rồi chuyển trang, không cần dữ liệu bên dưới)
  app.use("/language", languageRoute)

  // Ngôn ngữ, tài khoản khách đang đăng nhập (nếu có) và dữ liệu chung (menu danh mục, giỏ hàng,...) cho tất cả trang khách hàng bên dưới
  // Đọc tài khoản trước layout, vì giỏ hàng / yêu thích của khách đã đăng nhập lấy theo tài khoản
  app.use(languageMiddleware.setLanguage)
  app.use(authMiddleware.loadAccount)
  app.use(layoutMiddleware.loadLayoutData)

  app.use("/", homePageRoute)

  app.use("/", productRoute)

  app.use("/blog", articleRoute)

  // Giỏ hàng, sản phẩm yêu thích
  app.use("/cart", cartRoute)

  app.use("/wishlist", wishlistRoute)

  // Tài khoản khách: đăng nhập, đăng ký, thông tin tài khoản
  app.use("/account", accountRoute)

  // Không trang nào khớp thì hiện trang 404
  app.use(errorController.notFound)
}
