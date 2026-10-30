import { formatPrice } from "./format.helper"
import { isVideoPath } from "./media.helper"
import { productLowStockThreshold } from "../config/variable.config"

// Điều kiện sản phẩm khách được xem: chưa xoá và đang bán
export const productVisibleFind = {
  deleted: false,
  status: "active"
}

// Điều kiện sản phẩm đang giảm giá: giá trước khuyến mãi cao hơn giá bán
export const productOnSaleFind = {
  $expr: { $gt: ["$priceOld", "$price"] }
}

// Kiểu sắp xếp ở trang danh sách sản phẩm
// - key: từ ngữ hiển thị trong locales (locales/ru.ts, locales/vi.ts)
export const clientProductSortList = [
  { id: "", key: "sortDefault", sort: { position: "asc", createdAt: "desc" } },
  { id: "newest", key: "sortNewest", sort: { createdAt: "desc" } },
  { id: "price-asc", key: "sortPriceAsc", sort: { price: "asc" } },
  { id: "price-desc", key: "sortPriceDesc", sort: { price: "desc" } },
  { id: "best-seller", key: "sortBestSeller", sort: { sold: "desc" } }
]

// Thêm thông tin hiển thị ở thẻ sản phẩm và trang chi tiết: ảnh, giá đã định dạng, % giảm giá, sắp hết hàng
export const addProductDisplayInfo = (productList: any[]) => {
  for (const item of productList) {
    // Ảnh trên thẻ sản phẩm luôn là ảnh (không dùng video): ảnh đại diện, chưa có thì lấy ảnh đầu tiên trong album
    item.cardImage = [item.avatar, ...(item.images || [])].find(path => path && !isVideoPath(path)) || ""

    item.priceFormat = formatPrice(item.price)
    item.priceOldFormat = formatPrice(item.priceOld)
    if(item.priceOld > item.price){
      item.discountPercent = Math.round((1 - item.price / item.priceOld) * 100)
      item.savingFormat = formatPrice(item.priceOld - item.price)
    }
    item.isLowStock = item.stock > 0 && item.stock <= productLowStockThreshold
  }
}
