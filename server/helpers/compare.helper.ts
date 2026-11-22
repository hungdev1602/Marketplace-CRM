import { Request, Response } from "express"
import { clientCompareKeepDays, clientCompareMaxItems } from "../config/variable.config"
import { isValidProductId } from "./client-token.helper"

// ===== Danh sách so sánh sản phẩm (trang khách hàng: /compare) =====
// Không lưu trong database: id các sản phẩm khách chọn nằm ngay trong cookie "compareList" của trình duyệt
// (cách nhau bằng dấu chấm, sản phẩm thêm trước đứng trước), giữ clientCompareKeepDays ngày
// - Khách chưa đăng nhập hay đã đăng nhập đều dùng như nhau, không cần gộp khi đăng nhập
// - Mở bằng máy / trình duyệt khác thì danh sách so sánh trống
export const compareCookieName = "compareList"

// Id các sản phẩm khách đang so sánh (bỏ giá trị lạ, bỏ trùng, không quá số sản phẩm tối đa)
// Lưu ý: cookie-parser đọc cookie dạng "j:{...}" thành object, nên phải kiểm tra là chuỗi
export const getCompareIds = (req: Request): string[] => {
  const value = req.cookies?.[compareCookieName]
  if(typeof value !== "string" || !value) return []

  const idList = value
    .split(".")
    .filter(id => isValidProductId(id))
    .map(id => id.toLowerCase())

  return [...new Set(idList)].slice(0, clientCompareMaxItems)
}

// Lưu danh sách so sánh vào cookie, danh sách trống thì xoá cookie
// - httpOnly: JS trên trang không đọc được cookie
// - sameSite lax: trang web khác không gửi được yêu cầu thêm / bỏ sản phẩm thay cho khách
export const setCompareIds = (res: Response, idList: string[]) => {
  if(idList.length === 0){
    res.clearCookie(compareCookieName)
    return
  }

  res.cookie(compareCookieName, idList.join("."), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: clientCompareKeepDays * 24 * 60 * 60 * 1000
  })
}

// Đổi khối lượng tịnh / thể tích sang 1 kg / 1 l: g, kg => kg; ml, l => l
const unitPriceBaseList: { [netWeightUnit: string]: { unit: string, rate: number } } = {
  g: { unit: "kg", rate: 1000 },
  kg: { unit: "kg", rate: 1 },
  ml: { unit: "l", rate: 1000 },
  l: { unit: "l", rate: 1 }
}

// Giá cho 1 kg / 1 l (giống giá "за 1 кг" trên nhãn ở siêu thị Nga), để so sánh sản phẩm khác khối lượng
// Ví dụ: mì 75 g giá 50 ₽ => { value: 666.67, unit: "kg" }
// Sản phẩm chưa nhập khối lượng tịnh / thể tích thì trả về null
export const getUnitPrice = (product: any): { value: number, unit: string } | null => {
  const base = unitPriceBaseList[product.netWeightUnit]
  if(!base || !(product.netWeight > 0) || !(product.price > 0)) return null

  return {
    value: Math.round(product.price / (product.netWeight / base.rate) * 100) / 100,
    unit: base.unit
  }
}
