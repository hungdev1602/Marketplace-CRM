import crypto from "crypto"
import { Request, Response } from "express"

// ===== Mã nhận diện giỏ hàng / danh sách yêu thích của khách chưa đăng nhập (lưu trong cookie phiên) =====
// Khách chưa đăng nhập thì trình duyệt giữ 1 mã ngẫu nhiên, server tìm giỏ hàng / danh sách yêu thích theo mã này

// Mã ngẫu nhiên 48 ký tự (0-9, a-f), không đoán được nên người khác không xem được giỏ hàng của khách
export const generateClientToken = (): string => {
  return crypto.randomBytes(24).toString("hex")
}

// Lấy mã trong cookie, cookie trống hoặc bị sửa thành giá trị lạ thì trả về ""
// Lưu ý: phải kiểm tra là chuỗi đúng định dạng, vì cookie-parser đọc cookie dạng "j:{...}" thành object,
// đưa object vào điều kiện tìm kiếm sẽ tìm sai (ví dụ { $ne: null } tìm ra giỏ hàng của người khác)
export const getClientToken = (req: Request, cookieName: string): string => {
  const token = req.cookies?.[cookieName]
  return typeof token === "string" && /^[a-f0-9]{48}$/.test(token) ? token : ""
}

// Lưu mã vào cookie phiên của khách chưa đăng nhập (không đặt thời hạn: trình duyệt tự xoá cookie khi khách tắt trình duyệt)
// - httpOnly: JS trên trang không đọc được cookie
// - sameSite lax: trang web khác không gửi được yêu cầu thêm / xoá sản phẩm thay cho khách
export const setClientTokenCookie = (res: Response, cookieName: string, token: string) => {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax"
  })
}

// Id sản phẩm gửi lên từ trình duyệt phải là chuỗi ObjectId (24 ký tự 0-9, a-f)
export const isValidProductId = (id: any): id is string => {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)
}

// Làm tròn tiền đến kopeck (2 chữ số thập phân), tránh lỗi cộng số thập phân của JS (0.1 + 0.2 = 0.30000000000000004)
export const roundMoney = (value: number): number => {
  return Math.round(value * 100) / 100
}
