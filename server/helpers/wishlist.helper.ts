import { Request, Response } from "express"
import moment from "moment"
import { Wishlist } from "../models/wishlist.model"
import { Product } from "../models/product.model"
import { clientWishlistRetentionDays } from "../config/variable.config"
import { addProductDisplayInfo } from "./client-product.helper"
import { generateClientToken, getClientToken, setClientTokenCookie } from "./client-token.helper"

// Tên cookie giữ mã danh sách yêu thích của khách
export const wishlistCookieName = "wishlistToken"

// Danh sách yêu thích của khách đang xem trang, chưa có thì trả về null (không tạo mới)
export const getWishlist = async (req: Request): Promise<any> => {
  const token = getClientToken(req, wishlistCookieName)
  if(!token) return null

  return await Wishlist.findOne({ token: token })
}

// Danh sách yêu thích của khách, chưa có thì tạo mới (chỉ gọi khi khách bấm ♡), mỗi lần gọi thì gia hạn cookie
export const getOrCreateWishlist = async (req: Request, res: Response): Promise<any> => {
  let wishlist: any = await getWishlist(req)

  if(!wishlist){
    wishlist = await Wishlist.create({
      token: generateClientToken(),
      items: []
    })
  }

  setClientTokenCookie(res, wishlistCookieName, wishlist.token, clientWishlistRetentionDays)

  return wishlist
}

// Dữ liệu hiển thị trang yêu thích (thêm sau hiện trước)
// - productList: sản phẩm đang bán (kể cả tạm hết hàng)
// - unavailableList: sản phẩm ngừng bán / trong thùng rác (giữ lại, bán lại thì hiện lại)
// Sản phẩm đã bị xoá vĩnh viễn thì bỏ khỏi danh sách
export const buildWishlistView = async (wishlist: any) => {
  const view = {
    productList: [] as any[],
    unavailableList: [] as any[],
    wishlistCount: 0
  }

  if(!wishlist || wishlist.items.length === 0) return view

  const allProduct: any[] = await Product.find({
    _id: { $in: wishlist.items.map((item: any) => item.productId) }
  })
  addProductDisplayInfo(allProduct)

  const removeIds: string[] = []
  const itemList = [...wishlist.items].sort((a: any, b: any) => (b.addedAt?.getTime() || 0) - (a.addedAt?.getTime() || 0))

  for (const item of itemList) {
    const product = allProduct.find(product => product.id === item.productId)

    if(!product){
      removeIds.push(item.productId)
      continue
    }

    if(!product.deleted && product.status === "active"){
      view.productList.push(product)
    }
    else {
      view.unavailableList.push(product)
    }
  }

  view.wishlistCount = view.productList.length + view.unavailableList.length

  if(removeIds.length > 0){
    await Wishlist.updateOne({ _id: wishlist.id }, { $pull: { items: { productId: { $in: removeIds } } } })
  }

  return view
}

// Xoá danh sách yêu thích không thay đổi quá clientWishlistRetentionDays ngày
export const deleteOldWishlists = async () => {
  try {
    const result = await Wishlist.deleteMany({
      updatedAt: {
        $lt: moment().subtract(clientWishlistRetentionDays, "days").toDate()
      }
    })

    if(result.deletedCount > 0){
      console.log(`Đã xoá ${result.deletedCount} danh sách yêu thích không thay đổi quá ${clientWishlistRetentionDays} ngày`)
    }
  } catch (error) {
    console.log("Xoá danh sách yêu thích cũ thất bại")
    console.log(error)
  }
}

// Tự động xoá danh sách yêu thích cũ: chạy ngay khi khởi động server, sau đó cứ 1 tiếng chạy lại 1 lần
export const scheduleDeleteOldWishlists = () => {
  deleteOldWishlists()
  setInterval(deleteOldWishlists, 60 * 60 * 1000)
}
