import { Request, Response } from "express"
import { Wishlist } from "../../models/wishlist.model"
import { Product } from "../../models/product.model"
import { Cart } from "../../models/cart.model"
import { clientCartMaxItems, clientWishlistMaxItems } from "../../config/variable.config"
import { productVisibleFind } from "../../helpers/client-product.helper"
import { isValidProductId } from "../../helpers/client-token.helper"
import { getCartQuantity, getMaxQuantity, getOrCreateCart } from "../../helpers/cart.helper"
import { buildWishlistView, getOrCreateWishlist, getWishlist } from "../../helpers/wishlist.helper"

// Trả lỗi dạng JSON cho JS ở trang khách hàng (main.js hiện thông báo)
const sendError = (res: Response, key: string) => {
  res.json({
    code: "error",
    message: res.locals.t(key)
  })
}

// Trang sản phẩm yêu thích: /wishlist
export const index = async (req: Request, res: Response) => {
  const wishlist = await getWishlist(req)
  const wishlistView = await buildWishlistView(wishlist)

  // Số trên biểu tượng ♡ theo danh sách đã dọn (bỏ sản phẩm đã xoá vĩnh viễn)
  res.locals.wishlistCount = wishlistView.wishlistCount

  res.render("client/pages/wishlist", {
    pageTitle: `${res.locals.t("wishlist")} — SFoodie`,
    wishlistView: wishlistView,
    // Có sản phẩm còn hàng chưa có trong giỏ thì hiện nút "Thêm tất cả vào giỏ"
    canAddAllToCart: wishlistView.productList.some(product => product.stock > 0 && !res.locals.cartQuantityMap[product.id])
  })
}

// Bấm ♡: chưa có thì thêm vào yêu thích, có rồi thì bỏ ra
// POST /wishlist/toggle { productId }
export const togglePost = async (req: Request, res: Response) => {
  try {
    const productId = req.body.productId

    if(!isValidProductId(productId)){
      sendError(res, "productUnavailable")
      return
    }

    const wishlist = await getOrCreateWishlist(req, res)
    const isAdded = wishlist.items.some((item: any) => item.productId === productId)

    if(isAdded){
      await Wishlist.updateOne({ _id: wishlist.id }, { $pull: { items: { productId: productId } } })
    }
    else {
      // Chỉ thêm sản phẩm đang bán (hết hàng vẫn thêm được để chờ có hàng)
      const product = await Product.findOne({
        _id: productId,
        ...productVisibleFind
      }).select("_id")

      if(!product){
        sendError(res, "productUnavailable")
        return
      }

      if(wishlist.items.length >= clientWishlistMaxItems){
        sendError(res, "wishlistFull")
        return
      }

      // Điều kiện $ne để bấm 2 lần liên tiếp không bị thêm trùng
      await Wishlist.updateOne({
        _id: wishlist.id,
        "items.productId": { $ne: productId }
      }, {
        $push: { items: { productId: productId, addedAt: new Date() } }
      })
    }

    const newWishlist: any = await Wishlist.findById(wishlist.id)
    const wishlistCount = newWishlist ? newWishlist.items.length : 0

    res.json({
      code: "success",
      message: res.locals.t(isAdded ? "removedFromWishlist" : "addedToWishlist"),
      productId: productId,
      added: !isAdded,
      wishlistCount: wishlistCount,
      wishlistCountText: res.locals.tCount(wishlistCount, "productCount"), // số sản phẩm ở trang yêu thích
      link: isAdded ? null : {
        url: "/wishlist",
        text: res.locals.t("goToWishlist")
      }
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Thêm tất cả sản phẩm yêu thích còn hàng vào giỏ (mỗi sản phẩm 1 cái, sản phẩm đã có trong giỏ thì giữ nguyên)
// POST /wishlist/add-to-cart
export const addAllToCartPost = async (req: Request, res: Response) => {
  try {
    const wishlist = await getWishlist(req)

    const productList: any[] = wishlist ? await Product.find({
      _id: { $in: wishlist.items.map((item: any) => item.productId) },
      ...productVisibleFind,
      stock: { $gt: 0 }
    }) : []

    if(productList.length === 0){
      sendError(res, "nothingToAdd")
      return
    }

    const cart = await getOrCreateCart(req, res)
    const newItems: { productId: string, quantity: number }[] = []
    for (const product of productList) {
      const isInCart = cart.items.some((item: any) => item.productId === product.id)
      if(!isInCart && getMaxQuantity(product) > 0 && cart.items.length + newItems.length < clientCartMaxItems){
        newItems.push({ productId: product.id, quantity: 1 })
      }
    }

    if(newItems.length === 0){
      sendError(res, cart.items.length >= clientCartMaxItems ? "cartFull" : "nothingToAdd")
      return
    }

    // Bỏ sản phẩm vừa được thêm vào giỏ ở yêu cầu khác (bấm 2 lần liên tiếp) để không bị trùng
    const newCart: any = await Cart.findById(cart.id)
    const itemsToAdd = newItems.filter(newItem => !newCart.items.some((item: any) => item.productId === newItem.productId))
    if(itemsToAdd.length > 0){
      await Cart.updateOne({ _id: cart.id }, { $push: { items: { $each: itemsToAdd } } })
    }

    res.json({
      code: "success",
      message: `${res.locals.t("addedAllToCart")}: ${res.locals.tCount(itemsToAdd.length, "productCount")}`,
      items: itemsToAdd.map(item => ({
        ...item,
        maxQuantity: getMaxQuantity(productList.find(product => product.id === item.productId))
      })),
      cartQuantity: getCartQuantity(await Cart.findById(cart.id)),
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

// Xoá hết sản phẩm yêu thích: DELETE /wishlist/clear
export const clearDelete = async (req: Request, res: Response) => {
  try {
    const wishlist = await getWishlist(req)
    if(wishlist){
      await Wishlist.updateOne({ _id: wishlist.id }, { items: [] })
    }

    res.json({
      code: "success",
      message: res.locals.t("wishlistCleared"),
      wishlistCount: 0
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}
