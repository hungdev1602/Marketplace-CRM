import { Router } from "express"
import * as controller from "../../controller/client/review.controller"
import * as reviewValidate from "../../validates/client/review.validate"

const router = Router()

// Viết / sửa đánh giá sản phẩm trong đơn đã giao (link có mã bí mật ?key=..., hoặc đơn của tài khoản đang đăng nhập)
router.get("/write/:code/:productId", controller.write)

// Gửi đánh giá: form có ảnh (multipart/form-data), main.js gửi lên, trả về JSON
router.post("/write/:code/:productId", reviewValidate.uploadPhotos, reviewValidate.writePost, controller.writePost)

// Xoá đánh giá của mình
router.post("/write/:code/:productId/delete", controller.deletePost)

// Danh sách đánh giá của sản phẩm (HTML, thẻ trong slider): lọc, sắp xếp, tải thêm khi kéo tới cuối slider
router.get("/product/:productId", controller.productReviews)

// Toàn bộ 1 đánh giá (HTML): bấm "Читать полностью"
router.get("/item/:id", controller.item)

// "Полезный отзыв?" 👍 / 👎
router.post("/:id/vote", controller.votePost)

export const reviewRoute = router
