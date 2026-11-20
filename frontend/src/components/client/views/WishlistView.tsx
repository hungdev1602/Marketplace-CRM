"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createTranslator } from "@/lib/i18n"
import { reloadPage } from "@/lib/top-loader"
import { mediaUrl } from "@/lib/view-ctx"
import { useShop } from "../ShopProvider"
import { useToast } from "../Toast"
import { GuestNote, ProductCard } from "../common"

// ===== Nội dung trang yêu thích =====
// Bỏ ♡ thì sản phẩm biến mất khỏi trang; "Добавить всё в корзину"; "Очистить"
// wishlistView: dữ liệu từ server/controller/client/wishlist.controller.ts

export function WishlistView({ wishlistView, canAddAllToCart }: { wishlistView: any, canAddAllToCart: boolean }) {
  const router = useRouter()
  const { ctx, state, request, setProductQuantity, setCartQuantity, toggleWishlist } = useShop()
  const { t, tName, tCount } = createTranslator(ctx.lang)
  const { showToast } = useToast()
  const [isAddingAll, setIsAddingAll] = useState(false)
  const [isAddAllHidden, setIsAddAllHidden] = useState(false)

  // Sản phẩm khách vừa bỏ ♡ thì ẩn khỏi trang
  const isInWishlist = (product: any) => state.wishlistMap[product.id] !== false
  const productList: any[] = wishlistView.productList.filter(isInWishlist)
  const unavailableList: any[] = wishlistView.unavailableList.filter(isInWishlist)
  const isEmptyAtStart = wishlistView.productList.length == 0 && wishlistView.unavailableList.length == 0

  // Bỏ hết sản phẩm thì lấy lại trang để hiện "В избранном пока пусто"
  const isEmptyNow = !isEmptyAtStart && productList.length == 0 && unavailableList.length == 0
  useEffect(() => {
    if(isEmptyNow) router.refresh()
  }, [isEmptyNow, router])

  if(isEmptyAtStart || isEmptyNow) {
    return (
      <div className="sf-empty">
        <i className="far fa-heart"></i>
        <h3>{t("wishlistEmptyTitle")}</h3>
        <p>{t("wishlistEmptyText")}</p>
        <Link href="/products" className="sf-btn sf-btn-primary">{t("goShopping")}</Link>
      </div>
    )
  }

  // Thêm tất cả sản phẩm còn hàng vào giỏ
  const handleAddAll = async () => {
    setIsAddingAll(true)
    const data = await request("/wishlist/add-to-cart", "POST")
    if(data.code === "success") {
      for (const item of data.items || []) {
        setProductQuantity(item.productId, item.quantity, item.maxQuantity)
      }
      setCartQuantity(data.cartQuantity)
      showToast(data.message, "success", data.link)
      setIsAddAllHidden(true)
    }
    else {
      showToast(data.message, "error")
    }
    setIsAddingAll(false)
  }

  // Xoá hết danh sách yêu thích
  const handleClear = async () => {
    if(!confirm(t("clearWishlistConfirm"))) return
    const data = await request("/wishlist/clear", "DELETE")
    if(data.code === "success") {
      reloadPage()
    }
    else {
      showToast(data.message, "error")
    }
  }

  return (
    <div>
      <GuestNote backUrl="/wishlist" ctx={ctx} />
      <div className="sf-shop-toolbar sf-wishlist-toolbar">
        <p>
          <b>{tCount(productList.length + unavailableList.length, "productCount")}</b>
        </p>
        <div className="sf-toolbar-actions">
          {canAddAllToCart && !isAddAllHidden && (
            <button type="button" className="sf-btn sf-btn-primary sf-btn-sm" disabled={isAddingAll} onClick={handleAddAll}>
              <i className="fas fa-cart-plus"></i>
              {t("addAllToCart")}
            </button>
          )}
          <button type="button" className="sf-link-btn" onClick={handleClear}>
            <i className="far fa-trash-alt"></i>
            {t("clearWishlist")}
          </button>
        </div>
      </div>

      {productList.length > 0 && (
        <div className="sf-product-grid sf-product-grid-home">
          {productList.map(product => (
            <ProductCard key={product.id} product={product} ctx={ctx} />
          ))}
        </div>
      )}

      {/* Sản phẩm đã ngừng bán */}
      {unavailableList.length > 0 && (
        <>
          <h3 className="sf-cart-subtitle">{t("noLongerSold")}</h3>
          <ul className="sf-wish-unavailable">
            {unavailableList.map(product => (
              <li key={product.id}>
                <span className="sf-cart-img">
                  <img src={mediaUrl(ctx, product.cardImage)} alt="" loading="lazy" />
                </span>
                <span className="sf-cart-name">{tName(product)}</span>
                <button type="button" className="sf-link-btn" onClick={() => toggleWishlist(product.id)}>
                  <i className="far fa-trash-alt"></i>
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
