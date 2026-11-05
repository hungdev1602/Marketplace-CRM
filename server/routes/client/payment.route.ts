import { Router } from "express"
import * as controller from "../../controller/client/payment.controller"

const router = Router()

// YooKassa gửi thông báo khi thanh toán thành công / bị huỷ
router.post("/yookassa", controller.yookassaWebhook)

export const paymentRoute = router
