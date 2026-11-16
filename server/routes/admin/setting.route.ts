import { Router } from "express"
import * as controller from "../../controller/admin/setting.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

// Cài đặt cửa hàng (thông tin cửa hàng, đặt hàng, sản phẩm, đánh giá)
router.get("/list", permissionMiddleware.checkPermission("setting-edit"), controller.list)

router.get("/edit/:key", permissionMiddleware.checkPermission("setting-edit"), controller.edit)

router.patch("/edit/:key", permissionMiddleware.checkPermission("setting-edit"), controller.editPatch)

export const settingRoute = router
