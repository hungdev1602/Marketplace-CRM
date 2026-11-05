import { Request, Response } from "express"
import { Order } from "../../models/order.model"
import { getPaymentProvider, getYookassaPaymentById } from "../../helpers/payment.helper"
import { applyPaymentInfo } from "../../helpers/order.helper"

// ===== Thông báo từ YooKassa (webhook): POST /payment/yookassa =====
// Cài trong trang YooKassa: Интеграция => HTTP-уведомления, URL: https://ten-mien-cua-ban.ru/payment/yookassa,
// chọn sự kiện payment.succeeded, payment.canceled
// Không tin dữ liệu trong thông báo (người lạ có thể gửi thông báo giả): chỉ lấy id thanh toán rồi hỏi lại YooKassa
// Trả 200 để YooKassa không gửi lại; lỗi phía server (mất kết nối database, YooKassa) trả 500 để YooKassa gửi lại sau
export const yookassaWebhook = async (req: Request, res: Response) => {
  const paymentId = req.body?.object?.id
  const event = `${req.body?.event || ""}`

  if(getPaymentProvider() !== "yookassa" || typeof paymentId !== "string" || !/^[\w-]{10,60}$/.test(paymentId) || !event.startsWith("payment.")){
    res.status(200).json({ code: "ignored" })
    return
  }

  try {
    const order: any = await Order.findOne({ "payment.paymentId": paymentId, "payment.provider": "yookassa" })
    if(!order){
      res.status(200).json({ code: "ignored" })
      return
    }

    const payment = await getYookassaPaymentById(paymentId)
    await applyPaymentInfo(order, payment)

    res.status(200).json({ code: "success" })
  } catch (error) {
    console.log("Xử lý thông báo YooKassa thất bại:", (error as Error).message)
    res.status(500).json({ code: "error" })
  }
}
