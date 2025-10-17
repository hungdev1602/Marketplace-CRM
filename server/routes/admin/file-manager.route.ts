import { Router } from "express"
import * as controller from "../../controller/admin/file-manager.controller"
import multer from "multer"

const router = Router()
const upload = multer()

router.get("/", controller.index)

router.post(
  "/upload", 
  upload.array("files"), 
  controller.uploadPost
)

router.patch(
  "/change-file-name/:id",
  upload.none(),
  controller.changeFileName
)

export const fileManagerRoute = router