import { Router } from "express"
import * as controller from "../../controller/client/order.controller"

const router = Router()

// Trang đơn hàng (link có mã bí mật ?key=..., hoặc khách đã đăng nhập xem đơn của tài khoản)
router.get("/:code", controller.detail)

// Thanh toán lại (thanh toán trước chưa xong / bị lỗi), main.js gửi lên, trả về JSON
router.post("/:code/pay", controller.payPost)

// Trang thanh toán giả (chỉ khi PAYMENT_TEST_MODE=true trong file .env)
router.get("/:code/test-payment", controller.testPayment)

router.post("/:code/test-payment", controller.testPaymentPost)

export const orderRoute = router
