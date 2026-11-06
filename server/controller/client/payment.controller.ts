import { Request, Response } from "express"
import { Order } from "../../models/order.model"
import { getPaymentProvider, getTbankPaymentState, verifyTbankNotification } from "../../helpers/payment.helper"
import { applyPaymentInfo } from "../../helpers/order.helper"

// ===== Thông báo từ Т-Банк (webhook): POST /payment/tbank =====
// Т-Банк gửi thông báo mỗi khi trạng thái thanh toán thay đổi, tới NotificationURL gửi kèm lúc tạo thanh toán
// (chỉ gửi khi SITE_URL là địa chỉ https công khai), hoặc địa chỉ cài trong cài đặt terminal
// - Kiểm tra chữ ký Token bằng mật khẩu terminal: thông báo giả (sai chữ ký) bị từ chối
// - Lấy trạng thái mới nhất bằng GetState rồi cập nhật đơn hàng
// - Phải trả lời đúng chữ "OK" (HTTP 200), nếu không Т-Банк sẽ gửi lại thông báo nhiều lần
export const tbankWebhook = async (req: Request, res: Response) => {
  if(getPaymentProvider() !== "tbank" || !verifyTbankNotification(req.body)){
    res.status(403).send("Forbidden")
    return
  }

  try {
    const paymentId = `${req.body.PaymentId || ""}`
    const order: any = paymentId
      ? await Order.findOne({ "payment.paymentId": paymentId, "payment.provider": "tbank" })
      : null

    // Thanh toán không thuộc đơn nào (ví dụ thanh toán cũ đã được thay bằng lần thanh toán lại): bỏ qua
    if(order){
      const info = await getTbankPaymentState(paymentId)
      await applyPaymentInfo(order, info)
    }

    res.status(200).type("text/plain").send("OK")
  } catch (error) {
    // Lỗi phía server (mất kết nối database, Т-Банк): không trả "OK" để Т-Банк gửi lại sau
    console.log("Xử lý thông báo Т-Банк thất bại:", (error as Error).message)
    res.status(500).send("ERROR")
  }
}
