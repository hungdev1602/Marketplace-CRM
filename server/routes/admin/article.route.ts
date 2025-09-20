import { Router } from "express"
import * as controller from "../../controller/admin/article.controller"
import * as articleValidate from "../../validates/admin/article.validate"
import multer from "multer"

const upload = multer()


const router = Router()

router.get("/category", controller.category)

router.get("/category/trash", controller.categoryTrash)

router.get("/category/create", controller.categoryCreate)

router.post(
  "/category/create", 
  upload.none(), 
  articleValidate.categoryCreatePost, 
  controller.categoryCreatePost
)

router.get("/category/edit/:id", controller.categoryEdit)

router.patch(
  "/category/edit/:id", 
  upload.none(), 
  articleValidate.categoryCreatePost, 
  controller.categoryEditPatch
)

router.patch("/category/delete/:id", controller.deleteCategoryPatch)

router.patch("/category/undo/:id", controller.undoCategory)

router.delete("/category/delete-permanently/:id", controller.deletePermanently)

export const articleRoute = router