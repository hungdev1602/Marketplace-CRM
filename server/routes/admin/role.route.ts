import { Router } from "express"
import * as controller from "../../controller/admin/role.controller"
import * as roleValidate from "../../validates/admin/role.validate"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"
import multer from "multer"

const router = Router()
const upload = multer()

router.get("/create", permissionMiddleware.checkPermission("role-create"), controller.create)

router.post(
  "/create", 
  permissionMiddleware.checkPermission("role-create"),
  upload.none(),
  roleValidate.createPost,
  controller.createPost
)

router.get("/list", permissionMiddleware.checkPermission("role-list"), controller.list)

router.get("/edit/:id", permissionMiddleware.checkPermission("role-edit"), controller.edit)

router.patch(
  "/edit/:id", 
  permissionMiddleware.checkPermission("role-edit"),
  upload.none(),
  roleValidate.createPost,
  controller.editPatch
)

router.patch("/delete/:id", permissionMiddleware.checkPermission("role-delete"), controller.deletePatch)

router.get("/trash", permissionMiddleware.checkPermission("role-trash"), controller.trash)

router.patch("/undo/:id", permissionMiddleware.checkPermission("role-trash"), controller.undo)

router.delete("/delete-permanently/:id", permissionMiddleware.checkPermission("role-trash"), controller.deletePermanently)

export const roleRoute = router
