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

export const roleRoute = router
