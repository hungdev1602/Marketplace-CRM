"use client"

import { useState } from "react"
import { cx } from "@/lib/format"
import { localizedName } from "@/lib/i18n"
import { useShop } from "./ShopProvider"

// Nút "Сравнить": thêm / bỏ sản phẩm khỏi trang so sánh (/compare)
// - Không có withText: nút tròn nhỏ dưới nút ♡ trên thẻ sản phẩm
// - withText: nút có chữ "Сравнить" / "В сравнении" (trang chi tiết sản phẩm)
// Đã đủ số sản phẩm tối đa thì server báo lỗi, thông báo có link "Перейти к сравнению"
type Props = {
  product: { id: string, name?: string, nameRu?: string }
  withText?: boolean
}

export function CompareButton({ product, withText }: Props) {
  const { ctx, t, state, toggleCompare } = useShop()
  const [isLoading, setIsLoading] = useState(false)
  const isActive = Boolean(state.compareMap[product.id])
  const label = isActive ? t("compareRemove") : t("addToCompare")

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    if(isLoading) return
    setIsLoading(true)
    await toggleCompare(product.id)
    setIsLoading(false)
  }

  return (
    <button
      type="button"
      className={cx("sf-compare-btn", withText && "sf-compare-btn-text", isActive && "is-active", isLoading && "is-loading")}
      aria-pressed={isActive}
      aria-label={withText ? undefined : `${label}: ${localizedName(product, ctx.lang)}`}
      title={withText ? undefined : label}
      onClick={handleClick}
    >
      <i className="fas fa-balance-scale"></i>
      {withText && <span>{isActive ? t("inCompare") : t("addToCompare")}</span>}
    </button>
  )
}
