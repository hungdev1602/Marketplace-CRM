import { Router } from "express"
import * as controller from "../../controller/client/legal.controller"

const router = Router()

// Văn bản pháp lý: chính sách xử lý dữ liệu cá nhân, đồng ý xử lý dữ liệu cá nhân, оферта, giao hàng và thanh toán, đổi trả
router.get("/", controller.index)

router.get("/:slug", controller.detail)

export const legalRoute = router
