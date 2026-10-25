import { Router } from "express"
import * as controller from "../../controller/admin/account.controller"
import * as accountValidate from "../../validates/admin/account.validate"
import multer from "multer"

const upload = multer()
const router = Router()

router.get("/login", controller.login)

router.post(
  "/login",
  upload.none(),
  accountValidate.loginPost,
  controller.loginPost
)

router.get("/logout", controller.logout)

export const accountRoute = router
