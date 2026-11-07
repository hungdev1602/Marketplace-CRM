import { Router } from "express"
import * as controller from "../../controller/admin/order.controller"
import * as permissionMiddleware from "../../middlewares/admin/permission.middleware"

const router = Router()

router.get("/list", permissionMiddleware.checkPermission("order-list"), controller.list)

router.get("/detail/:id", permissionMiddleware.checkPermission("order-list"), controller.detail)

// Các thao tác ở trang chi tiết đơn hàng (main.js gửi lên dữ liệu JSON, trả về JSON)
router.post("/shipment/:id", permissionMiddleware.checkPermission("order-edit"), controller.shipmentPost)

router.patch("/refresh/:id", permissionMiddleware.checkPermission("order-list"), controller.refreshPatch)

router.post("/waybill/:id", permissionMiddleware.checkPermission("order-edit"), controller.waybillPost)

router.patch("/cancel-shipment/:id", permissionMiddleware.checkPermission("order-edit"), controller.cancelShipmentPatch)

router.patch("/delivered/:id", permissionMiddleware.checkPermission("order-edit"), controller.deliveredPatch)

router.patch("/note/:id", permissionMiddleware.checkPermission("order-edit"), controller.notePatch)

router.patch("/cancel/:id", permissionMiddleware.checkPermission("order-cancel"), controller.cancelPatch)

export const orderRoute = router
