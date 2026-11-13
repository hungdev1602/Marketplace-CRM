import { Router } from "express"
import * as controller from "../../controller/admin/integration.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

// Kết nối API bên thứ 3 (Т-Банк, ApiShip, email SMTP...)
router.get("/list", permissionMiddleware.checkPermission(["integration-view", "integration-edit"]), controller.list)

router.get("/log", permissionMiddleware.checkPermission(["integration-view", "integration-edit"]), controller.log)

router.get("/edit/:key", permissionMiddleware.checkPermission("integration-edit"), controller.edit)

router.patch("/edit/:key", permissionMiddleware.checkPermission("integration-edit"), controller.editPatch)

router.patch("/toggle/:key", permissionMiddleware.checkPermission("integration-edit"), controller.togglePatch)

// Kiểm tra kết nối (Т-Банк: tạo rồi huỷ ngay 1 thanh toán thử 1 ₽; Email: gửi 1 email thử)
router.post("/test/:key", permissionMiddleware.checkPermission("integration-edit"), controller.testPost)

export const integrationRoute = router
