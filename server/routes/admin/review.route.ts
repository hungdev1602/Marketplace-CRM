import { Router } from "express"
import * as controller from "../../controller/admin/review.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

router.get("/list", permissionMiddleware.checkPermission("review-list"), controller.list)

// Các thao tác ở trang danh sách đánh giá (main.js gửi lên JSON, trả về JSON)
router.patch("/approve/:id", permissionMiddleware.checkPermission("review-moderate"), controller.approvePatch)

router.patch("/reject/:id", permissionMiddleware.checkPermission("review-moderate"), controller.rejectPatch)

router.patch("/reply/:id", permissionMiddleware.checkPermission("review-reply"), controller.replyPatch)

router.delete("/delete/:id", permissionMiddleware.checkPermission("review-moderate"), controller.deleteDel)

export const reviewRoute = router
