import { Router } from "express"
import multer from "multer"
import * as controller from "../../controller/admin/coupon.controller"
import * as couponValidate from "../../validates/admin/coupon.validate"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const upload = multer()
const router = Router()

router.get("/list", permissionMiddleware.checkPermission("coupon-list"), controller.list)

router.get("/trash", permissionMiddleware.checkPermission("coupon-trash"), controller.trash)

router.get("/create", permissionMiddleware.checkPermission("coupon-create"), controller.create)

router.post(
  "/create",
  permissionMiddleware.checkPermission("coupon-create"),
  upload.none(),
  couponValidate.createPost,
  controller.createPost
)

router.get("/edit/:id", permissionMiddleware.checkPermission("coupon-edit"), controller.edit)

router.patch(
  "/edit/:id",
  permissionMiddleware.checkPermission("coupon-edit"),
  upload.none(),
  couponValidate.createPost,
  controller.editPatch
)

router.patch("/change-status/:id", permissionMiddleware.checkPermission("coupon-edit"), controller.changeStatusPatch)

router.patch("/delete/:id", permissionMiddleware.checkPermission("coupon-delete"), controller.deletePatch)

router.patch("/undo/:id", permissionMiddleware.checkPermission("coupon-trash"), controller.undo)

router.delete("/delete-permanently/:id", permissionMiddleware.checkPermission("coupon-trash"), controller.deletePermanently)

// Tìm sản phẩm để chọn sản phẩm áp dụng mã (trang tạo và trang sửa)
router.get("/product-search", permissionMiddleware.checkPermission(["coupon-create", "coupon-edit"]), controller.productSearch)

export const couponRoute = router
