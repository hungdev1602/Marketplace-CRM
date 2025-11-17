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

router.delete("/delete-file/:id", controller.deleteFileDel)

router.post(
  "/folder/create", 
  upload.none(), 
  controller.folderCreatePost
)

router.delete("/folder/delete", controller.folderDelete)

router.get("/iframe", controller.iframe)
export const fileManagerRoute = router