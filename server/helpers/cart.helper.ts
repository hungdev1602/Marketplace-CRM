import { Request, Response } from "express"
import moment from "moment"
import { Cart } from "../models/cart.model"
import { Product } from "../models/product.model"
import { Coupon } from "../models/coupon.model"
import { CategoryProduct } from "../models/category-product.model"
import { clientCartMaxItems, clientCartMaxQuantity, clientGuestDataRetentionDays } from "../config/variable.config"
import { addProductDisplayInfo } from "./client-product.helper"
import { getDescendantIds } from "./category.helper"
import { formatShopDateTime, getCouponStatus } from "./coupon.helper"
import { generateClientToken, getClientToken, roundMoney, setClientTokenCookie } from "./client-token.helper"

// Tên cookie phiên giữ mã giỏ hàng của khách chưa đăng nhập
export const cartCookieName = "cartToken"

// Giỏ hàng của khách đang xem trang, chưa có thì trả về null (không tạo mới)
// - Đã đăng nhập (res.locals.clientAccount, middlewares/client/auth.middleware.ts): giỏ hàng của tài khoản
// - Chưa đăng nhập: giỏ hàng theo mã trong cookie phiên
export const getCart = async (req: Request, res: Response): Promise<any> => {
  const account = res.locals.clientAccount
  if(account){
    return await Cart.findOne({ userId: account.id })
  }

  const token = getClientToken(req, cartCookieName)
  if(!token) return null

  return await Cart.findOne({ token: token, userId: null })
}

// Giỏ hàng của khách, chưa có thì tạo mới
// Chỉ gọi khi khách thêm / sửa giỏ hàng (không tạo giỏ hàng cho mọi lượt xem trang)
export const getOrCreateCart = async (req: Request, res: Response): Promise<any> => {
  const account = res.locals.clientAccount
  if(account){
    return await getOrCreateAccountCart(account.id)
  }

  let cart: any = await getCart(req, res)
  if(!cart){
    cart = await Cart.create({
      token: generateClientToken(),
      items: []
    })
  }

  setClientTokenCookie(res, cartCookieName, cart.token)

  return cart
}

// Giỏ hàng của tài khoản, chưa có thì tạo mới
// Dùng upsert (tìm, không có thì tạo trong cùng 1 lệnh) để 2 yêu cầu cùng lúc không tạo ra 2 giỏ hàng
const getOrCreateAccountCart = async (userId: string): Promise<any> => {
  return await Cart.findOneAndUpdate({
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

// Khách vừa đăng nhập / đăng ký: gộp giỏ hàng lúc chưa đăng nhập vào giỏ hàng của tài khoản, rồi xoá giỏ hàng tạm
// - Sản phẩm có ở cả 2 giỏ: lấy số lượng lớn hơn (không cộng dồn, tránh khách thêm lại sản phẩm đã có thành gấp đôi)
// - Sản phẩm chỉ có trong giỏ tạm: thêm vào giỏ của tài khoản (không quá số loại sản phẩm tối đa)
// - Giỏ của tài khoản chưa có mã giảm giá thì lấy mã của giỏ tạm
export const mergeGuestCart = async (req: Request, res: Response, userId: string) => {
  const token = getClientToken(req, cartCookieName)
  res.clearCookie(cartCookieName)
  if(!token) return

  const guestCart: any = await Cart.findOne({ token: token, userId: null })
  if(!guestCart) return

  if(guestCart.items.length > 0 || guestCart.couponCode){
    const accountCart: any = await getOrCreateAccountCart(userId)
    const items = accountCart.items.map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity
    }))

    const productList: any[] = await Product.find({
      _id: { $in: guestCart.items.map((item: any) => item.productId) }
    })

    for (const guestItem of guestCart.items) {
      const product = productList.find(product => product.id === guestItem.productId)
      if(!product) continue // sản phẩm đã bị xoá vĩnh viễn

      // Sản phẩm còn hàng thì không quá tồn kho, hết hàng thì giữ nguyên số lượng (trang giỏ hàng báo tạm hết hàng)
      const maxQuantity = getMaxQuantity(product)
      const quantity = maxQuantity > 0 ? Math.min(guestItem.quantity, maxQuantity) : guestItem.quantity

      const existItem = items.find((item: any) => item.productId === guestItem.productId)
      if(existItem){
        existItem.quantity = Math.max(existItem.quantity, quantity)
      }
      else if(items.length < clientCartMaxItems){
        items.push({ productId: guestItem.productId, quantity: quantity })
      }
    }

    const update: any = { items: items }
    if(!accountCart.couponCode && guestCart.couponCode){
      update.couponCode = guestCart.couponCode
    }
    await Cart.updateOne({ _id: accountCart.id }, update)
  }

  await Cart.deleteOne({ _id: guestCart.id })
}

// Tổng số lượng sản phẩm trong giỏ (số hiện trên biểu tượng giỏ hàng)
export const getCartQuantity = (cart: any): number => {
  if(!cart) return 0
  return cart.items.reduce((total: number, item: any) => total + (item.quantity || 0), 0)
}

// Số lượng tối đa khách đặt được của 1 sản phẩm: không quá tồn kho và không quá clientCartMaxQuantity
export const getMaxQuantity = (product: any): number => {
  return Math.max(0, Math.min(Math.floor(product.stock || 0), clientCartMaxQuantity))
}

// Số lượng gửi lên => số nguyên, không hợp lệ (chữ, số âm, số lẻ) thì trả về null
export const parseQuantity = (value: any): number | null => {
  const quantity = Number(value)
  if(!Number.isInteger(quantity) || quantity < 0) return null
  return quantity
}

// Đặt số lượng của 1 sản phẩm trong giỏ (đã kiểm tra tồn kho trước khi gọi)
// - Sản phẩm đã có trong giỏ: sửa số lượng
// - Chưa có: thêm vào cuối giỏ (điều kiện $ne để bấm 2 lần liên tiếp không bị thêm trùng 1 sản phẩm)
export const saveCartItem = async (cart: any, productId: string, quantity: number) => {
  const existItem = cart.items.find((item: any) => item.productId === productId)

  if(existItem){
    await Cart.updateOne({
      _id: cart.id,
      "items.productId": productId
    }, {
      $set: { "items.$.quantity": quantity }
    })
  }
  else {
    await Cart.updateOne({
      _id: cart.id,
      "items.productId": { $ne: productId }
    }, {
      $push: { items: { productId: productId, quantity: quantity } }
    })
  }
}

// Bỏ 1 sản phẩm khỏi giỏ
export const removeCartItem = async (cart: any, productId: string) => {
  await Cart.updateOne({
    _id: cart.id
  }, {
    $pull: { items: { productId: productId } }
  })
}

// Kiểm tra mã giảm giá với các sản phẩm đặt được trong giỏ, tính số tiền được giảm
// - itemList: [{ product, lineTotal }], subtotal: tổng tiền hàng (theo giá bán)
// Kết quả:
// - errorKey: lý do chưa dùng được mã (key từ ngữ trong locales), "" là dùng được
// - missingAmount: còn thiếu bao nhiêu tiền để đạt giá trị đơn tối thiểu
// - discount: số tiền giảm, freeShipping: mã miễn phí giao hàng
// Lưu ý: chưa kiểm tra "Số lần mỗi khách được dùng" (cần tài khoản khách và đơn hàng), sẽ kiểm tra ở bước đặt hàng
export const checkCoupon = async (coupon: any, itemList: any[], subtotal: number) => {
  const result = {
    errorKey: "",
    startAtFormat: "",
    minOrderValue: 0,
    missingAmount: 0,
    discount: 0,
    freeShipping: false
  }

  if(!coupon){
    result.errorKey = "couponNotFound"
    return result
  }

  // Trạng thái: chỉ mã "Đang chạy" mới dùng được
  const status = getCouponStatus(coupon)
  if(status === "scheduled"){
    result.errorKey = "couponNotStarted"
    result.startAtFormat = formatShopDateTime(coupon.startAt, "DD.MM.YYYY HH:mm")
    return result
  }
  if(status !== "running"){
    result.errorKey = "couponExpired"
    return result
  }

  // Giá trị đơn hàng tối thiểu (tính trên tổng tiền hàng)
  if(coupon.minOrderValue && subtotal < coupon.minOrderValue){
    result.errorKey = "couponMinOrder"
    result.minOrderValue = coupon.minOrderValue
    result.missingAmount = roundMoney(coupon.minOrderValue - subtotal)
    return result
  }

  // Miễn phí giao hàng: áp dụng cho cả đơn
  if(coupon.discountType === "free-shipping"){
    result.freeShipping = true
    return result
  }

  // Sản phẩm được giảm giá theo phạm vi áp dụng
  let eligibleList = itemList
  if(coupon.applyTo === "category"){
    // Tính cả sản phẩm thuộc danh mục con
    const allCategory = await CategoryProduct.find({ deleted: false }).select("parent")
    const categoryIds: string[] = []
    for (const id of coupon.categories) {
      categoryIds.push(id, ...getDescendantIds(allCategory, id))
    }
    eligibleList = itemList.filter(item => item.product.category.some((id: string) => categoryIds.includes(id)))
  }
  else if(coupon.applyTo === "product"){
    eligibleList = itemList.filter(item => coupon.products.includes(item.product.id))
  }

  if(eligibleList.length === 0){
    result.errorKey = "couponNoEligible"
    return result
  }

  const eligibleSubtotal = eligibleList.reduce((total, item) => total + item.lineTotal, 0)

  let discount = 0
  if(coupon.discountType === "percent"){
    discount = eligibleSubtotal * (coupon.discountValue || 0) / 100
    if(coupon.maxDiscount){
      discount = Math.min(discount, coupon.maxDiscount)
    }
  }
  else if(coupon.discountType === "fixed"){
    discount = coupon.discountValue || 0
  }

  // Không giảm quá tiền của các sản phẩm được giảm
  result.discount = roundMoney(Math.min(discount, eligibleSubtotal))

  return result
}

// Dữ liệu hiển thị trang giỏ hàng: sản phẩm, tiền, mã giảm giá
// Luôn lấy giá, tồn kho mới nhất của sản phẩm. Đồng thời dọn giỏ hàng:
// - sản phẩm đã bị xoá vĩnh viễn: bỏ khỏi giỏ
// - số lượng nhiều hơn tồn kho: giảm xuống bằng tồn kho (báo cho khách biết)
// - sản phẩm ngừng bán, hết hàng, trong thùng rác: vẫn giữ trong giỏ nhưng không tính tiền (có hàng lại thì đặt được tiếp)
export const buildCartView = async (cart: any) => {
  const view = {
    itemList: [] as any[], // sản phẩm đặt được (thêm sau hiện trước)
    unavailableList: [] as any[], // sản phẩm tạm thời không đặt được
    cartQuantity: 0, // tổng số lượng trong giỏ (cả sản phẩm không đặt được), hiện trên biểu tượng giỏ hàng
    totalQuantity: 0, // tổng số lượng sản phẩm đặt được
    oldSubtotal: 0, // tổng tiền theo giá trước khuyến mãi
    productDiscount: 0, // tiền giảm nhờ giá khuyến mãi của sản phẩm
    subtotal: 0, // tổng tiền hàng theo giá bán
    coupon: null as any, // mã giảm giá đã nhập
    couponDiscount: 0,
    total: 0, // khách phải trả (chưa gồm phí giao hàng)
    hasColdItems: false // có hàng bảo quản mát / đông lạnh
  }

  if(!cart || cart.items.length === 0) return view

  const productList: any[] = await Product.find({
    _id: { $in: cart.items.map((item: any) => item.productId) }
  })
  addProductDisplayInfo(productList)

  const removeIds: string[] = []
  const reduceList: { productId: string, quantity: number }[] = []

  // Đảo ngược để sản phẩm thêm sau hiện trước
  for (const item of [...cart.items].reverse()) {
    const product = productList.find(product => product.id === item.productId)

    if(!product){
      removeIds.push(item.productId)
      continue
    }

    const maxQuantity = getMaxQuantity(product)
    const isVisible = !product.deleted && product.status === "active"

    if(!isVisible || maxQuantity === 0){
      view.unavailableList.push({
        product: product,
        quantity: item.quantity,
        isVisible: isVisible // false: ngừng bán (không mở được trang sản phẩm), true: chỉ tạm hết hàng
      })
      view.cartQuantity += item.quantity
      continue
    }

    let quantity = item.quantity
    let isReduced = false
    if(quantity > maxQuantity){
      quantity = maxQuantity
      isReduced = true
      reduceList.push({ productId: item.productId, quantity: quantity })
    }

    const oldPrice = product.priceOld > product.price ? product.priceOld : product.price
    const lineTotal = roundMoney(product.price * quantity)
    const lineOldTotal = roundMoney(oldPrice * quantity)

    view.itemList.push({
      product: product,
      quantity: quantity,
      maxQuantity: maxQuantity,
      isReduced: isReduced,
      lineTotal: lineTotal,
      lineOldTotal: lineOldTotal
    })

    view.cartQuantity += quantity
    view.totalQuantity += quantity
    view.subtotal += lineTotal
    view.oldSubtotal += lineOldTotal
    if(product.storageType === "chilled" || product.storageType === "frozen"){
      view.hasColdItems = true
    }
  }

  view.subtotal = roundMoney(view.subtotal)
  view.oldSubtotal = roundMoney(view.oldSubtotal)
  view.productDiscount = roundMoney(view.oldSubtotal - view.subtotal)

  // Lưu lại giỏ hàng đã dọn
  if(removeIds.length > 0){
    await Cart.updateOne({ _id: cart.id }, { $pull: { items: { productId: { $in: removeIds } } } })
  }
  for (const item of reduceList) {
    await saveCartItem(cart, item.productId, item.quantity)
  }

  // Mã giảm giá: kiểm tra lại mỗi lần hiển thị (mã có thể đã hết hạn, giỏ hàng có thể không còn đủ điều kiện)
  if(cart.couponCode){
    const coupon: any = await Coupon.findOne({
      code: cart.couponCode,
      deleted: false
    })
    const check = await checkCoupon(coupon, view.itemList, view.subtotal)

    view.coupon = {
      code: cart.couponCode,
      description: coupon?.description || "",
      ...check
    }
    view.couponDiscount = check.errorKey ? 0 : check.discount
  }

  view.total = roundMoney(view.subtotal - view.couponDiscount)

  return view
}

// Xoá giỏ hàng của khách chưa đăng nhập không thay đổi quá clientGuestDataRetentionDays ngày
// (giỏ hàng của tài khoản giữ lâu dài, không xoá)
export const deleteOldCarts = async () => {
  try {
    const result = await Cart.deleteMany({
      userId: null,
      updatedAt: {
        $lt: moment().subtract(clientGuestDataRetentionDays, "days").toDate()
      }
    })

    if(result.deletedCount > 0){
      console.log(`Đã xoá ${result.deletedCount} giỏ hàng của khách chưa đăng nhập, không thay đổi quá ${clientGuestDataRetentionDays} ngày`)
    }
  } catch (error) {
    console.log("Xoá giỏ hàng cũ thất bại")
    console.log(error)
  }
}

// Tự động xoá giỏ hàng cũ: chạy ngay khi khởi động server, sau đó cứ 1 tiếng chạy lại 1 lần
export const scheduleDeleteOldCarts = () => {
  deleteOldCarts()
  setInterval(deleteOldCarts, 60 * 60 * 1000)
}
