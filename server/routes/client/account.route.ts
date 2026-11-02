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

router.post("/logout", controller.logoutPost)

// Trang tài khoản: phải đăng nhập
router.get("/", authMiddleware.requireLogin, controller.profile)

router.patch("/profile", authMiddleware.requireLogin, accountValidate.profilePatch, controller.profilePatch)

router.patch("/password", authMiddleware.requireLogin, accountValidate.passwordPatch, controller.passwordPatch)

export const accountRoute = router
