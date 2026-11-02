import { Request, Response } from "express"
import moment from "moment"
import { Wishlist } from "../models/wishlist.model"
import { Product } from "../models/product.model"
import { clientGuestDataRetentionDays, clientWishlistMaxItems } from "../config/variable.config"
import { addProductDisplayInfo } from "./client-product.helper"
import { generateClientToken, getClientToken, setClientTokenCookie } from "./client-token.helper"

// Tên cookie phiên giữ mã danh sách yêu thích của khách chưa đăng nhập
export const wishlistCookieName = "wishlistToken"

// Danh sách yêu thích của khách đang xem trang, chưa có thì trả về null (không tạo mới)
// - Đã đăng nhập: danh sách của tài khoản
// - Chưa đăng nhập: danh sách theo mã trong cookie phiên
export const getWishlist = async (req: Request, res: Response): Promise<any> => {
  const account = res.locals.clientAccount
  if(account){
    return await Wishlist.findOne({ userId: account.id })
  }

  const token = getClientToken(req, wishlistCookieName)
  if(!token) return null

  return await Wishlist.findOne({ token: token, userId: null })
}

// Danh sách yêu thích của khách, chưa có thì tạo mới (chỉ gọi khi khách bấm ♡)
export const getOrCreateWishlist = async (req: Request, res: Response): Promise<any> => {
  const account = res.locals.clientAccount
  if(account){
    return await getOrCreateAccountWishlist(account.id)
  }

  let wishlist: any = await getWishlist(req, res)
  if(!wishlist){
    wishlist = await Wishlist.create({
      token: generateClientToken(),
      items: []
    })
  }

  setClientTokenCookie(res, wishlistCookieName, wishlist.token)

  return wishlist
}

// Danh sách yêu thích của tài khoản, chưa có thì tạo mới (upsert: 2 yêu cầu cùng lúc không tạo ra 2 danh sách)
const getOrCreateAccountWishlist = async (userId: string): Promise<any> => {
  return await Wishlist.findOneAndUpdate({
    userId: userId
  }, {
    $setOnInsert: {
      token: generateClientToken(),
      items: []
    }
  }, {
    upsert: true,
    new: true
  })
}

// Khách vừa đăng nhập / đăng ký: gộp danh sách yêu thích lúc chưa đăng nhập vào danh sách của tài khoản,
// rồi xoá danh sách tạm (sản phẩm đã có thì bỏ qua, không quá số sản phẩm tối đa)
export const mergeGuestWishlist = async (req: Request, res: Response, userId: string) => {
  const token = getClientToken(req, wishlistCookieName)
  res.clearCookie(wishlistCookieName)
  if(!token) return

  const guestWishlist: any = await Wishlist.findOne({ token: token, userId: null })
  if(!guestWishlist) return

  if(guestWishlist.items.length > 0){
    const accountWishlist: any = await getOrCreateAccountWishlist(userId)
    const items = accountWishlist.items.map((item: any) => ({
      productId: item.productId,
      addedAt: item.addedAt
    }))

    for (const guestItem of guestWishlist.items) {
      const isExist = items.some((item: any) => item.productId === guestItem.productId)
      if(!isExist && items.length < clientWishlistMaxItems){
        items.push({ productId: guestItem.productId, addedAt: guestItem.addedAt })
      }
    }

    await Wishlist.updateOne({ _id: accountWishlist.id }, { items: items })
  }

  await Wishlist.deleteOne({ _id: guestWishlist.id })
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

// Xoá danh sách yêu thích của khách chưa đăng nhập không thay đổi quá clientGuestDataRetentionDays ngày
// (danh sách của tài khoản giữ lâu dài, không xoá)
export const deleteOldWishlists = async () => {
  try {
    const result = await Wishlist.deleteMany({
      userId: null,
      updatedAt: {
        $lt: moment().subtract(clientGuestDataRetentionDays, "days").toDate()
      }
    })

    if(result.deletedCount > 0){
      console.log(`Đã xoá ${result.deletedCount} danh sách yêu thích của khách chưa đăng nhập, không thay đổi quá ${clientGuestDataRetentionDays} ngày`)
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
