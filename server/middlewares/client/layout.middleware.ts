import { NextFunction, Request, Response } from "express"
import { CategoryProduct } from "../../models/category-product.model"
import { buildCategoryTree } from "../../helpers/category.helper"
import { formatNumber, formatPrice, htmlToText } from "../../helpers/format.helper"
import { getCart, getCartQuantity } from "../../helpers/cart.helper"
import { getWishlist } from "../../helpers/wishlist.helper"
import {
  clientCartMaxQuantity,
  clientDefaultTheme,
  domainFileManager,
  productAllergenList,
  productDietTagList,
  productNetWeightUnitList,
  productOriginList,
  productStorageList,
  productUnitList,
  shopInfo
} from "../../config/variable.config"

// Các danh sách lựa chọn của sản phẩm, để hiện tên (xuất xứ, đơn vị, bảo quản,...) theo ngôn ngữ bằng tOption
const productOptions = {
  originList: productOriginList,
  unitList: productUnitList,
  netWeightUnitList: productNetWeightUnitList,
  storageList: productStorageList,
  allergenList: productAllergenList,
  dietTagList: productDietTagList
}

// Dữ liệu dùng chung ở đầu trang, menu, chân trang của mọi trang khách hàng
export const loadLayoutData = async (req: Request, res: Response, next: NextFunction) => {
  // Danh mục sản phẩm đang hoạt động, xếp theo vị trí admin đã đặt
  // Danh mục bị tạm dừng thì ẩn cả các danh mục con của nó
  const allCategory = await CategoryProduct
    .find({
      deleted: false,
      status: "active"
    })
    .sort({
      position: "asc",
      createdAt: "desc"
    })

  res.locals.allCategory = allCategory // controller dùng lại, không cần truy vấn lần nữa
  res.locals.categoryTree = buildCategoryTree(allCategory)
  res.locals.shopInfo = shopInfo
  res.locals.productOptions = productOptions
  res.locals.currentPath = req.path // để tô đậm mục menu đang xem
  res.locals.query = req.query // để điền lại từ khoá, danh mục vào ô tìm kiếm
  res.locals.currentYear = new Date().getFullYear()
  res.locals.defaultTheme = clientDefaultTheme

  // Giỏ hàng, yêu thích của khách: số trên biểu tượng ở đầu trang, trạng thái nút trên thẻ sản phẩm
  // - cartQuantityMap: { id sản phẩm: số lượng trong giỏ }, wishlistMap: { id sản phẩm: true }
  const [cart, wishlist] = await Promise.all([getCart(req), getWishlist(req)])
  res.locals.cartQuantity = getCartQuantity(cart)
  res.locals.cartQuantityMap = Object.fromEntries((cart?.items || []).map((item: any) => [item.productId, item.quantity]))
  res.locals.cartMaxQuantity = clientCartMaxQuantity
  res.locals.wishlistCount = wishlist ? wishlist.items.length : 0
  res.locals.wishlistMap = Object.fromEntries((wishlist?.items || []).map((item: any) => [item.productId, true]))

  // Hàm dùng trong file PUG
  res.locals.formatNumber = formatNumber
  res.locals.formatPrice = formatPrice
  res.locals.htmlToText = htmlToText
  // Link ảnh lưu ở server quản lý file, chưa có ảnh thì dùng ảnh mặc định
  res.locals.mediaUrl = (path: string) => path ? `${domainFileManager}${path}` : "/client/assets/images/no-image.svg"

  next()
}
