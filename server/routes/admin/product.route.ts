import { Router } from "express"
import * as controller from "../../controller/admin/product.controller"
import * as excelController from "../../controller/admin/product-excel.controller"
import * as productValidate from "../../validates/admin/product.validate"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"
import { uploadExcel } from "../../middlewares/admin/upload-excel.middleware"
import multer from "multer"

const upload = multer()
const router = Router()

// Danh mục sản phẩm
router.get("/category", permissionMiddleware.checkPermission("product-category"), controller.category)

router.get("/category/trash", permissionMiddleware.checkPermission("product-category-trash"), controller.categoryTrash)

router.get("/category/create", permissionMiddleware.checkPermission("product-category-create"), controller.categoryCreate)

router.post(
  "/category/create",
  permissionMiddleware.checkPermission("product-category-create"),
  upload.none(),
  productValidate.categoryCreatePost,
  controller.categoryCreatePost
)

router.get("/category/edit/:id", permissionMiddleware.checkPermission("product-category-edit"), controller.categoryEdit)

router.patch(
  "/category/edit/:id",
  permissionMiddleware.checkPermission("product-category-edit"),
  upload.none(),
  productValidate.categoryCreatePost,
  controller.categoryEditPatch
)

router.patch("/category/delete/:id", permissionMiddleware.checkPermission("product-category-delete"), controller.categoryDeletePatch)

router.patch("/category/undo/:id", permissionMiddleware.checkPermission("product-category-trash"), controller.categoryUndo)

router.delete("/category/delete-permanently/:id", permissionMiddleware.checkPermission("product-category-trash"), controller.categoryDeletePermanently)

// Sản phẩm
router.get("/create", permissionMiddleware.checkPermission("product-create"), controller.create)

router.post(
  "/create",
  permissionMiddleware.checkPermission("product-create"),
  upload.none(),
  productValidate.createPost,
  controller.createPost
)

router.get("/list", permissionMiddleware.checkPermission("product-list"), controller.list)

router.get("/trash", permissionMiddleware.checkPermission("product-trash"), controller.listTrash)

router.get("/edit/:id", permissionMiddleware.checkPermission("product-edit"), controller.edit)

router.patch(
  "/edit/:id",
  permissionMiddleware.checkPermission("product-edit"),
  upload.none(),
  productValidate.createPost,
  controller.editPatch
)

router.patch("/delete/:id", permissionMiddleware.checkPermission("product-delete"), controller.deletePatch)

router.patch("/undo/:id", permissionMiddleware.checkPermission("product-trash"), controller.undo)

router.delete("/delete-permanently/:id", permissionMiddleware.checkPermission("product-trash"), controller.deletePermanently)

// Nhập sản phẩm từ Excel
router.get("/import", permissionMiddleware.checkPermission("product-import"), excelController.importPage)

router.get("/import/template", permissionMiddleware.checkPermission("product-import"), excelController.importTemplate)

router.post(
  "/import/preview",
  permissionMiddleware.checkPermission("product-import"),
  uploadExcel,
  excelController.importPreview
)

router.post(
  "/import/preview-error-file",
  permissionMiddleware.checkPermission("product-import"),
  uploadExcel,
  excelController.importPreviewErrorFile
)

router.post(
  "/import",
  permissionMiddleware.checkPermission("product-import"),
  uploadExcel,
  excelController.importPost
)

router.get("/import/status/:id", permissionMiddleware.checkPermission("product-import"), excelController.importStatus)

router.get("/import/error-file/:id", permissionMiddleware.checkPermission("product-import"), excelController.importErrorFile)

// Xuất sản phẩm ra Excel
router.get("/export", permissionMiddleware.checkPermission("product-export"), excelController.exportExcel)

export const productRoute = router
