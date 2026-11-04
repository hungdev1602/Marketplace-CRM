import { Router } from "express"
import * as controller from "../../controller/client/search.controller"

const router = Router()

// main.js gọi khi khách gõ / bấm vào ô tìm kiếm, trả về JSON
// (trang kết quả tìm kiếm vẫn là /products?keyword=..., xem product.controller.ts)
router.get("/suggest", controller.suggest)

router.get("/popular", controller.popular)

export const searchRoute = router
