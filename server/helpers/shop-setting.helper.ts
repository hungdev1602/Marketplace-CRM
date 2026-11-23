import { getIntegrationNumber, getIntegrationSetting, getIntegrationString } from "./integration.helper"

// ===== Đọc Cài đặt cửa hàng (trang admin: Cài đặt cửa hàng, danh sách ô: config/shop-setting.config.ts) =====
// Giá trị nhập ở trang admin được ưu tiên, chưa nhập thì dùng giá trị mặc định trong config/variable.config.ts
// Đọc trong hàm (mỗi lần dùng), nên sửa ở trang admin là có hiệu lực ngay, không cần khởi động lại server

// Thông tin cửa hàng hiện ở đầu trang, chân trang (để trống thì mục đó không hiện)
export const getShopInfo = () => {
  const get = (field: string) => getIntegrationString("shop-info", field)
  return {
    phone: get("phone"),
    email: get("email"),
    address: get("address"),
    workingHours: get("workingHours"),
    telegram: get("telegram"),
    whatsapp: get("whatsapp"),
    vk: get("vk"),
    legalName: get("legalName"),
    inn: get("inn"),
    ogrn: get("ogrn"),
    legalAddress: get("legalAddress")
  }
}

// Thông tin dùng trong các văn bản pháp lý (/legal), ô trống thì văn bản dùng thông tin người bán / email cửa hàng
export const getLegalInfo = () => {
  const get = (field: string) => getIntegrationString("legal", field)
  return {
    effectiveDate: get("effectiveDate"),
    pdResponsible: get("pdResponsible"),
    pdEmail: get("pdEmail"),
    rknNumber: get("rknNumber"),
    hosting: get("hosting")
  }
}

// Giao diện mặc định của trang khách hàng: system, light, dark
export const getClientDefaultTheme = (): string => {
  return getIntegrationString("shop-info", "defaultTheme") || "system"
}

// Đặt hàng
export const getCheckoutSettings = () => ({
  minOrderValue: Math.max(0, getIntegrationNumber("checkout", "minOrderValue")),
  freeDeliveryFrom: Math.max(0, getIntegrationNumber("checkout", "freeDeliveryFrom")),
  deliveryMarkup: Math.max(0, getIntegrationNumber("checkout", "deliveryMarkup")),
  paymentTimeoutMinutes: Math.max(10, getIntegrationNumber("checkout", "paymentTimeoutMinutes"))
})

// Tồn kho nhỏ hơn hoặc bằng số này thì báo "Sắp hết hàng"
export const getLowStockThreshold = (): number => {
  return Math.max(0, getIntegrationNumber("product", "lowStockThreshold"))
}

// Đánh giá sản phẩm
export const getReviewSettings = () => ({
  moderation: getIntegrationSetting("review", "moderation") === true,
  maxPhotos: Math.max(0, getIntegrationNumber("review", "maxPhotos")),
  editDays: Math.max(0, getIntegrationNumber("review", "editDays")),
  requestEmail: getIntegrationSetting("review", "requestEmail") === true,
  requestDelayHours: Math.max(1, getIntegrationNumber("review", "requestDelayHours")),
  requestMaxDays: Math.max(1, getIntegrationNumber("review", "requestMaxDays"))
})
