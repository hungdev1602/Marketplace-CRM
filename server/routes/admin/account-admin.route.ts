import { Router } from "express"
import * as controller from "../../controller/admin/account-admin.controller"
import * as accountAdminValidate from "../../validates/admin/account-admin.validate"
import multer from "multer"

const upload = multer()
const router = Router()

router.get("/create", controller.create)

router.post(
  "/create",
  upload.none(),
  accountAdminValidate.createPost,
  controller.createPost
)

router.get("/list", controller.list)

export const accountAdminRoute = router