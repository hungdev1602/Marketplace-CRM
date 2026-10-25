import { Router } from "express"
import * as controller from "../../controller/admin/article.controller"
import * as articleValidate from "../../validates/admin/article.validate"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"
import multer from "multer"

const upload = multer()


const router = Router()

router.get("/category", permissionMiddleware.checkPermission("article-category"), controller.category)

router.get("/category/trash", permissionMiddleware.checkPermission("article-category-trash"), controller.categoryTrash)

router.get("/category/create", permissionMiddleware.checkPermission("article-category-create"), controller.categoryCreate)

router.post(
  "/category/create", 
  permissionMiddleware.checkPermission("article-category-create"),
  upload.none(), 
  articleValidate.categoryCreatePost, 
  controller.categoryCreatePost
)

router.get("/category/edit/:id", permissionMiddleware.checkPermission("article-category-edit"), controller.categoryEdit)

router.patch(
  "/category/edit/:id", 
  permissionMiddleware.checkPermission("article-category-edit"),
  upload.none(), 
  articleValidate.categoryCreatePost, 
  controller.categoryEditPatch
)

router.patch("/category/delete/:id", permissionMiddleware.checkPermission("article-category-delete"), controller.deleteCategoryPatch)

router.patch("/category/undo/:id", permissionMiddleware.checkPermission("article-category-trash"), controller.undoCategory)

router.delete("/category/delete-permanently/:id", permissionMiddleware.checkPermission("article-category-trash"), controller.CategoryBlogDeletePermanently)

router.get("/create", permissionMiddleware.checkPermission("article-create"), controller.create)

router.post(
  "/create", 
  permissionMiddleware.checkPermission("article-create"),
  upload.none(),  
  articleValidate.createPost,
  controller.createPost
)

router.get("/list", permissionMiddleware.checkPermission("article-list"), controller.list)

router.get("/trash", permissionMiddleware.checkPermission("article-trash"), controller.listTrash)

router.get("/edit/:id", permissionMiddleware.checkPermission("article-edit"), controller.edit)

router.patch(
  "/edit/:id", 
  permissionMiddleware.checkPermission("article-edit"),
  upload.none(),  
  articleValidate.createPost,
  controller.editPatch
)

router.patch("/delete/:id", permissionMiddleware.checkPermission("article-delete"), controller.deletePatch)

router.patch("/undo/:id", permissionMiddleware.checkPermission("article-trash"), controller.undo)

router.delete("/delete-permanently/:id", permissionMiddleware.checkPermission("article-trash"), controller.deletePermanently)

export const articleRoute = router