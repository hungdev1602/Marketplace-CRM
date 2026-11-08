import { Router } from "express"
import * as controller from "../../controller/client/account.controller"
import * as accountValidate from "../../validates/client/account.validate"
import * as authMiddleware from "../../middlewares/client/auth.middleware"
import * as orderController from "../../controller/client/order.controller"
import * as reviewController from "../../controller/client/review.controller"

const router = Router()

// Đăng nhập, đăng ký (form gửi bằng main.js, dữ liệu JSON)
router.get("/login", controller.login)

router.post("/login", accountValidate.loginPost, controller.loginPost)

router.get("/register", controller.register)

router.post("/register", accountValidate.registerPost, controller.registerPost)

// Quên mật khẩu: nhập email => gửi link qua email => mở link, nhập mật khẩu mới
router.get("/forgot-password", controller.forgotPassword)

router.post("/forgot-password", accountValidate.forgotPasswordPost, controller.forgotPasswordPost)

router.get("/reset-password", controller.resetPassword)

router.post("/reset-password", accountValidate.resetPasswordPost, controller.resetPasswordPost)

router.post("/logout", controller.logoutPost)

// Trang tài khoản: phải đăng nhập
router.get("/", authMiddleware.requireLogin, controller.profile)

// Đơn hàng của tài khoản
router.get("/orders", authMiddleware.requireLogin, orderController.accountOrders)

// Đánh giá của tài khoản: sản phẩm chờ đánh giá, đánh giá đã viết
router.get("/reviews", authMiddleware.requireLogin, reviewController.accountReviews)

router.patch("/profile", authMiddleware.requireLogin, accountValidate.profilePatch, controller.profilePatch)

router.patch("/password", authMiddleware.requireLogin, accountValidate.passwordPatch, controller.passwordPatch)

export const accountRoute = router
