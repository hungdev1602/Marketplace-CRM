import { Router } from "express"
import * as controller from "../../controller/client/payment.controller"

const router = Router()

// Т-Банк gửi thông báo khi trạng thái thanh toán thay đổi (đã thanh toán, bị từ chối, hoàn tiền,...)
router.post("/tbank", controller.tbankWebhook)

export const paymentRoute = router
