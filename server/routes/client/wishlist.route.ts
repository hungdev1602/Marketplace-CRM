import { Router } from "express"
import * as controller from "../../controller/client/wishlist.controller"

const router = Router()

// Trang sản phẩm yêu thích
router.get("/", controller.index)

// Các thao tác bên dưới do main.js gửi lên (dữ liệu JSON), trả về JSON
router.post("/toggle", controller.togglePost)

router.post("/add-to-cart", controller.addAllToCartPost)

router.delete("/clear", controller.clearDelete)

export const wishlistRoute = router
