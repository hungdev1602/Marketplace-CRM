import moment from "moment"
import { shopUtcOffset } from "../config/variable.config"
import { formatPrice } from "./format.helper"

// ===== Thời gian theo giờ cửa hàng (shopUtcOffset, giờ Moscow) =====
// Ô chọn ngày giờ (input datetime-local) gửi lên và nhận về dạng "2027-01-25T09:00"
export const shopDateTimeInputFormat = "YYYY-MM-DDTHH:mm"

// Kiểm tra chuỗi ngày giờ gửi lên từ ô chọn ngày giờ có hợp lệ không
export const isValidShopDateTime = (value: string): boolean => {
  return moment.utc(value, shopDateTimeInputFormat, true).isValid()
}

// Chuỗi ngày giờ (giờ cửa hàng) => Date để lưu database, ví dụ "2027-01-25T09:00" => 2027-01-25 06:00 UTC
export const parseShopDateTime = (value: string): Date => {
  return moment.utc(value, shopDateTimeInputFormat, true).utcOffset(shopUtcOffset, true).toDate()
}

// Date => chuỗi theo giờ cửa hàng
// - mặc định: hiển thị, ví dụ "09:00 25/01/2027"
// - shopDateTimeInputFormat: điền vào ô chọn ngày giờ ở trang sửa
export const formatShopDateTime = (date: Date | null | undefined, format: string = "HH:mm DD/MM/YYYY"): string => {
  if(!date) return ""

  return moment(date).utcOffset(shopUtcOffset).format(format)
}

// ===== Trạng thái mã giảm giá =====
// - color: màu nhãn hiển thị ở danh sách mã giảm giá (class badge của bootstrap)
export const couponStatusList = [
  { id: "running", name: "Đang chạy", color: "bg-success" },
  { id: "scheduled", name: "Chưa bắt đầu", color: "bg-info" },
  { id: "used-up", name: "Hết lượt dùng", color: "bg-warning" },
  { id: "expired", name: "Hết hạn", color: "bg-secondary" },
  { id: "inactive", name: "Tạm dừng", color: "bg-danger" }
]

// Trạng thái hiện tại của mã giảm giá, xét lần lượt: tạm dừng > hết hạn > hết lượt dùng > chưa bắt đầu > đang chạy
// Khách chỉ dùng được mã có trạng thái "running"
export const getCouponStatus = (coupon: any, now: Date = new Date()): string => {
  if(coupon.status === "inactive") return "inactive"
  if(coupon.endAt && coupon.endAt <= now) return "expired"
  if(coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return "used-up"
  if(coupon.startAt && coupon.startAt > now) return "scheduled"
  return "running"
}

// Điều kiện lọc theo trạng thái ở trang danh sách, phải khớp với thứ tự xét trong getCouponStatus
export const buildCouponStatusFind = (status: string, now: Date = new Date()): any => {
  const notExpired = {
    $or: [
      { endAt: null }, // không hết hạn
      { endAt: { $gt: now } }
    ]
  }
  const usedUp = {
    usageLimit: { $gt: 0 },
    $expr: { $gte: ["$usedCount", "$usageLimit"] }
  }
  const notUsedUp = {
    $or: [
      { usageLimit: null }, // không giới hạn lượt dùng
      { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
    ]
  }

  switch (status) {
    case "inactive":
      return { status: "inactive" }
    case "expired":
      return { status: "active", endAt: { $lte: now } }
    case "used-up":
      return { status: "active", $and: [notExpired, usedUp] }
    case "scheduled":
      return { status: "active", startAt: { $gt: now }, $and: [notExpired, notUsedUp] }
    case "running":
      return { status: "active", startAt: { $lte: now }, $and: [notExpired, notUsedUp] }
    default:
      return {}
  }
}

// Mô tả mức giảm, ví dụ: "Giảm 10% (tối đa 500 ₽)", "Giảm 300 ₽", "Miễn phí giao hàng"
export const formatCouponDiscount = (coupon: any): string => {
  if(coupon.discountType === "percent"){
    return `Giảm ${coupon.discountValue}%` + (coupon.maxDiscount ? ` (tối đa ${formatPrice(coupon.maxDiscount)})` : "")
  }

  if(coupon.discountType === "fixed"){
    return `Giảm ${formatPrice(coupon.discountValue)}`
  }

  if(coupon.discountType === "free-shipping"){
    return "Miễn phí giao hàng"
  }

  return ""
}
