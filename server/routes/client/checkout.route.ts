import { Router } from "express"
import * as controller from "../../controller/client/checkout.controller"
import * as checkoutValidate from "../../validates/client/checkout.validate"

const router = Router()

// Trang đặt hàng (khách chưa đăng nhập cũng đặt được)
router.get("/", controller.index)

// Các thao tác bên dưới do main.js gửi lên (dữ liệu JSON), trả về JSON
// Tính phí giao hàng (ApiShip)
router.post("/delivery", checkoutValidate.deliveryPost, controller.deliveryPost)

// Danh sách điểm nhận hàng của hãng vận chuyển khách chọn
router.get("/points", controller.points)

// Đặt hàng => chuyển tới trang thanh toán
router.post("/", checkoutValidate.orderPost, controller.orderPost)

export const checkoutRoute = router
