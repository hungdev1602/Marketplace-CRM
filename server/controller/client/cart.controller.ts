import { Request, Response } from "express"
import { Cart } from "../../models/cart.model"
import { Product } from "../../models/product.model"
import { Coupon } from "../../models/coupon.model"
import { clientCartMaxItems } from "../../config/variable.config"
import { productVisibleFind } from "../../helpers/client-product.helper"
import { getCouponStatus } from "../../helpers/coupon.helper"
import { isValidProductId } from "../../helpers/client-token.helper"
import {
  buildCartView,
  getCart,
  getCartQuantity,
  getMaxQuantity,
  getOrCreateCart,
  parseQuantity,
  removeCartItem,
  saveCartItem
} from "../../helpers/cart.helper"

// Trả lỗi dạng JSON cho JS ở trang khách hàng (main.js hiện thông báo)
const sendError = (res: Response, key: string) => {
  res.json({
    code: "error",
    message: res.locals.t(key)
  })
}

// Tổng số lượng trong giỏ sau khi thay đổi, để cập nhật số trên biểu tượng giỏ hàng
const getNewCartQuantity = async (cartId: string): Promise<number> => {
  return getCartQuantity(await Cart.findById(cartId))
}

// Trang giỏ hàng: /cart
// - /cart?partial=1: chỉ trả về phần nội dung giỏ hàng (main.js gọi sau khi đổi số lượng, nhập mã giảm giá để thay vào trang)
export const index = async (req: Request, res: Response) => {
  const cart = await getCart(req)
  const cartView = await buildCartView(cart)

  // Số trên biểu tượng giỏ hàng theo giỏ hàng đã dọn (bỏ sản phẩm đã xoá, giảm số lượng quá tồn kho)
  res.locals.cartQuantity = cartView.cartQuantity

  const template = req.query.partial === "1" ? "client/pages/cart-content" : "client/pages/cart"

  res.render(template, {
    pageTitle: `${res.locals.t("cart")} — SFoodie`,
    cartView: cartView
  })
}

// Thêm sản phẩm vào giỏ: POST /cart/add { productId, quantity }
// Sản phẩm đã có trong giỏ thì cộng thêm số lượng (không quá tồn kho)
export const addPost = async (req: Request, res: Response) => {
  try {
    const productId = req.body.productId
    const quantity = parseQuantity(req.body.quantity ?? 1)

    if(!isValidProductId(productId) || !quantity){
      sendError(res, "productUnavailable")
      return
    }

    const product: any = await Product.findOne({
      _id: productId,
      ...productVisibleFind
    })
    const maxQuantity = product ? getMaxQuantity(product) : 0

    if(maxQuantity === 0){
      sendError(res, "productUnavailable")
      return
    }

    const cart = await getOrCreateCart(req, res)
    const existItem = cart.items.find((item: any) => item.productId === productId)

    if(!existItem && cart.items.length >= clientCartMaxItems){
      sendError(res, "cartFull")
      return
    }

    const wantQuantity = (existItem ? existItem.quantity : 0) + quantity
    const newQuantity = Math.min(wantQuantity, maxQuantity)

    await saveCartItem(cart, productId, newQuantity)

    res.json({
      code: "success",
      // Khách muốn nhiều hơn số đặt được thì báo số lượng tối đa
      message: wantQuantity > maxQuantity
        ? `${res.locals.t("maxQuantityText")} ${maxQuantity}`
        : res.locals.t("addedToCart"),
      productId: productId,
      quantity: newQuantity,
      maxQuantity: maxQuantity,
      cartQuantity: await getNewCartQuantity(cart.id),
      link: {
        url: "/cart",
        text: res.locals.t("goToCart")
      }
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Đổi số lượng: PATCH /cart/update { productId, quantity }
// - quantity = 0: bỏ sản phẩm khỏi giỏ
// - số lượng nhiều hơn tồn kho thì giảm xuống bằng tồn kho
export const updatePatch = async (req: Request, res: Response) => {
  try {
    const productId = req.body.productId
    const quantity = parseQuantity(req.body.quantity)

    if(!isValidProductId(productId) || quantity === null){
      sendError(res, "errorGeneral")
      return
    }

    // Bỏ khỏi giỏ
    if(quantity === 0){
      const cart = await getCart(req)
      if(cart){
        await removeCartItem(cart, productId)
      }

      res.json({
        code: "success",
        message: res.locals.t("removedFromCart"),
        productId: productId,
        quantity: 0,
        cartQuantity: cart ? await getNewCartQuantity(cart.id) : 0
      })
      return
    }

    const product: any = await Product.findOne({
      _id: productId,
      ...productVisibleFind
    })
    const maxQuantity = product ? getMaxQuantity(product) : 0

    if(maxQuantity === 0){
      sendError(res, "productUnavailable")
      return
    }

    const cart = await getOrCreateCart(req, res)
    const existItem = cart.items.find((item: any) => item.productId === productId)

    if(!existItem && cart.items.length >= clientCartMaxItems){
      sendError(res, "cartFull")
      return
    }

    const newQuantity = Math.min(quantity, maxQuantity)
    await saveCartItem(cart, productId, newQuantity)

    res.json({
      code: "success",
      message: quantity > maxQuantity ? `${res.locals.t("maxQuantityText")} ${maxQuantity}` : "",
      productId: productId,
      quantity: newQuantity,
      maxQuantity: maxQuantity,
      cartQuantity: await getNewCartQuantity(cart.id)
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Nhập mã giảm giá: POST /cart/coupon { code }
// Mã không tồn tại, hết hạn, chưa bắt đầu thì báo lỗi, không lưu
// Mã đang chạy thì lưu vào giỏ, chưa đủ điều kiện (giá trị đơn tối thiểu,...) thì trang giỏ hàng hiện lời nhắc
export const couponPost = async (req: Request, res: Response) => {
  try {
    const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : ""

    if(!code){
      sendError(res, "couponEmpty")
      return
    }

    const cart = await getCart(req)
    if(!cart || cart.items.length === 0){
      sendError(res, "errorGeneral")
      return
    }

    // Mã chỉ gồm chữ in hoa, số, dấu - _ (giống lúc admin tạo mã)
    const coupon: any = /^[A-Z0-9_-]{1,50}$/.test(code)
      ? await Coupon.findOne({ code: code, deleted: false })
      : null

    if(!coupon){
      sendError(res, "couponNotFound")
      return
    }

    const status = getCouponStatus(coupon)
    if(status === "scheduled"){
      sendError(res, "couponNotStarted")
      return
    }
    if(status !== "running"){
      sendError(res, "couponExpired")
      return
    }

    await Cart.updateOne({ _id: cart.id }, { couponCode: code })

    res.json({
      code: "success",
      message: res.locals.t("couponApplied")
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Bỏ mã giảm giá: DELETE /cart/coupon
export const couponDelete = async (req: Request, res: Response) => {
  try {
    const cart = await getCart(req)
    if(cart){
      await Cart.updateOne({ _id: cart.id }, { $unset: { couponCode: "" } })
    }

    res.json({
      code: "success",
      message: res.locals.t("couponRemoved")
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Xoá hết sản phẩm trong giỏ (và mã giảm giá): DELETE /cart/clear
export const clearDelete = async (req: Request, res: Response) => {
  try {
    const cart = await getCart(req)
    if(cart){
      await Cart.updateOne({ _id: cart.id }, { items: [], $unset: { couponCode: "" } })
    }

    res.json({
      code: "success",
      message: res.locals.t("cartCleared"),
      cartQuantity: 0
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}
