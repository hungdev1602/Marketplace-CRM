import { Router } from "express"
import * as controller from "../../controller/client/compare.controller"

const router = Router()

// Trang so sánh sản phẩm
router.get("/", controller.index)

// Các thao tác bên dưới do giao diện Next.js gửi lên (dữ liệu JSON), trả về JSON
router.post("/toggle", controller.togglePost)

router.delete("/clear", controller.clearDelete)

export const compareRoute = router
