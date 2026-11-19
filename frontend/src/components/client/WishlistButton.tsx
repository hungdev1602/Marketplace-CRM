"use client"

import { useState } from "react"
import { cx } from "@/lib/format"
import { localizedName } from "@/lib/i18n"
import { useShop } from "./ShopProvider"

// Nút ♡ thêm / bỏ sản phẩm yêu thích
// - withText: nút có chữ "В избранное" / "В избранном" (trang chi tiết sản phẩm)
type Props = {
  product: { id: string, name?: string, nameRu?: string }
  withText?: boolean
}

export function WishlistButton({ product, withText }: Props) {
  const { ctx, t, state, toggleWishlist } = useShop()
  const [isLoading, setIsLoading] = useState(false)
  const isActive = Boolean(state.wishlistMap[product.id])

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    if(isLoading) return
    setIsLoading(true)
    await toggleWishlist(product.id)
    setIsLoading(false)
  }

  return (
    <button
      type="button"
      className={cx("sf-wish-btn", withText && "sf-wish-btn-text", isActive && "is-active", isLoading && "is-loading")}
      aria-pressed={isActive}
      aria-label={withText ? undefined : `${t("wishlist")}: ${localizedName(product, ctx.lang)}`}
      title={withText ? undefined : t("wishlist")}
      onClick={handleClick}
    >
      <i className="far fa-heart sf-wish-off"></i>
      <i className="fas fa-heart sf-wish-on"></i>
      {withText && (
        <>
          <span className="sf-wish-off">{t("addToWishlist")}</span>
          <span className="sf-wish-on">{t("inWishlist")}</span>
        </>
      )}
    </button>
  )
}
