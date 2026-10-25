import { Router } from "express"
import * as controller from "../../controller/admin/dashboard.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

router.get("/", permissionMiddleware.checkPermission("dashboard"), controller.dashboard)

export const dashboardRoute = router