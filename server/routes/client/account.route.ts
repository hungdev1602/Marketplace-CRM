import { Router } from "express"
import * as controller from "../../controller/client/account.controller"
import * as accountValidate from "../../validates/client/account.validate"
import * as authMiddleware from "../../middlewares/client/auth.middleware"

const router = Router()

// Đăng nhập, đăng ký (form gửi bằng main.js, dữ liệu JSON)
router.get("/login", controller.login)

router.post("/login", accountValidate.loginPost, controller.loginPost)

router.get("/register", controller.register)

router.post("/register", accountValidate.registerPost, controller.registerPost)

// Đăng nhập bằng Google: chuyển sang trang Google, Google chuyển khách về /account/google/callback
router.get("/google", controller.googleLogin)

router.get("/google/callback", controller.googleCallback)

// Quên mật khẩu: nhập email => gửi link qua email => mở link, nhập mật khẩu mới
router.get("/forgot-password", controller.forgotPassword)

router.post("/forgot-password", accountValidate.forgotPasswordPost, controller.forgotPasswordPost)

router.get("/reset-password", controller.resetPassword)

router.post("/reset-password", accountValidate.resetPasswordPost, controller.resetPasswordPost)

router.post("/logout", controller.logoutPost)

// Trang tài khoản: phải đăng nhập
router.get("/", authMiddleware.requireLogin, controller.profile)

router.patch("/profile", authMiddleware.requireLogin, accountValidate.profilePatch, controller.profilePatch)

router.patch("/password", authMiddleware.requireLogin, accountValidate.passwordPatch, controller.passwordPatch)

export const accountRoute = router
