import { Router } from "express"
import * as controller from "../../controller/admin/activity-log.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

// Nhật ký hoạt động: chỉ tài khoản Super Admin xem được
router.use(permissionMiddleware.checkSuperAdmin)

router.get("/list", controller.list)

export const activityLogRoute = router
