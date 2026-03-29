import { Router } from "express"
import * as controller from "../../controller/admin/role.controller"
import * as roleValidate from "../../validates/admin/role.validate"
import multer from "multer"

const router = Router()
const upload = multer()

router.get("/create", controller.create)

router.post(
  "/create", 
  upload.none(),
  roleValidate.createPost,
  controller.createPost
)

router.get("/list", controller.list)

router.get("/edit/:id", controller.edit)

router.patch(
  "/edit/:id", 
  upload.none(),
  roleValidate.createPost,
  controller.editPatch
)

router.patch("/delete/:id", controller.deletePatch)

router.get("/trash", controller.trash)

router.patch("/undo/:id", controller.undo)

router.delete("/delete-permanently/:id", controller.deletePermanently)

export const roleRoute = router
