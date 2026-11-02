import { Router } from "express"
import * as controller from "../../controller/client/cart.controller"

const router = Router()

// Trang giỏ hàng
router.get("/", controller.index)

// Các thao tác bên dưới do main.js gửi lên (dữ liệu JSON), trả về JSON
router.post("/add", controller.addPost)

router.patch("/update", controller.updatePatch)

router.post("/coupon", controller.couponPost)

router.delete("/coupon", controller.couponDelete)

router.delete("/clear", controller.clearDelete)

export const cartRoute = router
