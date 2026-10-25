import { Router } from "express"
import * as controller from "../../controller/admin/account-admin.controller"
import * as accountAdminValidate from "../../validates/admin/account-admin.validate"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"
import multer from "multer"

const upload = multer()
const router = Router()

router.get("/create", permissionMiddleware.checkPermission("account-admin-create"), controller.create)

router.post(
  "/create",
  permissionMiddleware.checkPermission("account-admin-create"),
  upload.none(),
  accountAdminValidate.createPost,
  controller.createPost
)

router.get("/list", permissionMiddleware.checkPermission("account-admin-list"), controller.list)

router.get("/edit/:id", permissionMiddleware.checkPermission("account-admin-edit"), controller.edit)

router.patch(
  "/edit/:id",
  permissionMiddleware.checkPermission("account-admin-edit"),
  upload.none(),
  accountAdminValidate.editPatch,
  controller.editPatch
)

router.patch("/delete/:id", permissionMiddleware.checkPermission("account-admin-delete"), controller.deletePatch)

router.get("/trash", permissionMiddleware.checkPermission("account-admin-trash"), controller.trash)

router.patch("/undo/:id", permissionMiddleware.checkPermission("account-admin-trash"), controller.undo)

router.delete("/delete-permanently/:id", permissionMiddleware.checkPermission("account-admin-trash"), controller.deletePermanently)

router.get("/change-password/:id", permissionMiddleware.checkPermission("account-admin-change-password"), controller.changePassword)

router.patch(
  "/change-password/:id",
  permissionMiddleware.checkPermission("account-admin-change-password"),
  upload.none(),
  accountAdminValidate.changePasswordPatch,
  controller.changePasswordPatch
)

export const accountAdminRoute = router