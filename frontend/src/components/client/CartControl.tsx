"use client"

import { useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { cx } from "@/lib/format"
import { localizedName } from "@/lib/i18n"
import { useShop } from "./ShopProvider"

// Nút "В корзину" + ô chọn số lượng (− 2 +) của 1 sản phẩm
// - Chưa có trong giỏ: hiện nút "В корзину", bấm vào thì thêm 1 cái và đổi thành ô chọn số lượng
// - Đã có trong giỏ (class in-cart): hiện ô chọn số lượng, giảm về 0 thì bỏ khỏi giỏ
// - large: nút to ở trang chi tiết sản phẩm (kèm link "Перейти в корзину")
// - min: số lượng nhỏ nhất của ô chọn (trang giỏ hàng là 1, bỏ sản phẩm bằng nút "Удалить")
// - maxQuantity: số lượng tối đa đã kiểm tra tồn kho (trang giỏ hàng)
type Props = {
  product: { id: string, stock?: number, name?: string, nameRu?: string }
  large?: boolean
  min?: number
  maxQuantity?: number
}

export function CartControl({ product, large, min, maxQuantity }: Props) {
  const { ctx, t, state, addToCart, changeQuantity } = useShop()
  const [isLoading, setIsLoading] = useState(false)
  const [draft, setDraft] = useState<string | null>(null) // số khách đang gõ dở trong ô
  const addButton = useRef<HTMLButtonElement>(null)
  const plusButton = useRef<HTMLButtonElement>(null)

  const minQuantity = min || 0
  const defaultMax = maxQuantity !== undefined
    ? maxQuantity
    : Math.max(0, Math.min(Math.floor(product.stock || 0), ctx.cartMaxQuantity))
  const max = state.maxQuantityMap[product.id] ?? defaultMax
  const quantity = state.cartQuantityMap[product.id] || 0

  // Hết hàng (tính theo lúc mở trang): nút "Нет в наличии" không bấm được
  if(defaultMax <= 0) {
    return (
      <button type="button" className={cx("sf-btn sf-btn-outline sf-cart-add sf-cart-out", large && "is-large")} disabled>
        {t("outOfStock")}
      </button>
    )
  }

  // Số lượng khách chọn trong khoảng nhỏ nhất - lớn nhất của ô chọn
  const clamp = (value: number): number => {
    if(!Number.isFinite(value)) return minQuantity
    return Math.min(max, Math.max(minQuantity, Math.floor(value)))
  }

  const handleAdd = async () => {
    if(isLoading) return
    const hadFocus = document.activeElement === addButton.current
    setIsLoading(true)
    const data = await addToCart(product.id)
    setIsLoading(false)
    // Nút "В корзину" vừa bị ẩn: đưa con trỏ bàn phím sang nút +
    if(data.code === "success" && hadFocus) {
      requestAnimationFrame(() => plusButton.current?.focus({ preventScroll: true }))
    }
  }

  const handleStep = (step: number) => {
    const newQuantity = clamp(quantity + step)
    setDraft(null)
    changeQuantity(product.id, newQuantity)
    // Giảm về 0 thì hiện lại nút "В корзину", đưa con trỏ bàn phím sang nút đó
    if(newQuantity === 0) {
      requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true }))
    }
  }

  // Gõ số lượng vào ô: gửi khi gõ xong (bấm Enter hoặc bấm ra ngoài)
  const commitDraft = () => {
    if(draft === null) return
    const newQuantity = clamp(Number(draft))
    setDraft(null)
    if(newQuantity !== quantity) changeQuantity(product.id, newQuantity)
  }

  return (
    <div className={cx("sf-cart-control", large && "is-large", quantity > 0 && "in-cart")}>
      <button
        type="button"
        ref={addButton}
        className={cx("sf-btn sf-btn-primary sf-cart-add", isLoading && "is-loading")}
        onClick={handleAdd}
      >
        <i className="fas fa-shopping-basket"></i>
        <span>{large ? t("addToCartLong") : t("addToCart")}</span>
      </button>
      <div className="sf-qty" role="group" aria-label={`${t("quantity")}: ${localizedName(product, ctx.lang)}`}>
        <button type="button" aria-label={t("decrease")} disabled={quantity <= minQuantity} onClick={() => handleStep(-1)}>
          <i className="fas fa-minus"></i>
        </button>
        <input
          type="number"
          value={draft ?? quantity}
          min={minQuantity}
          max={max}
          step={1}
          inputMode="numeric"
          aria-label={t("quantity")}
          onChange={event => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={event => {
            if(event.key === "Enter") {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
        />
        <button type="button" ref={plusButton} aria-label={t("increase")} disabled={quantity >= max} onClick={() => handleStep(1)}>
          <i className="fas fa-plus"></i>
        </button>
      </div>
      {large && (
        <Link href="/cart" className="sf-btn sf-btn-dark sf-cart-go">
          {t("goToCart")}
          <i className="fas fa-arrow-right"></i>
        </Link>
      )}
    </div>
  )
}
