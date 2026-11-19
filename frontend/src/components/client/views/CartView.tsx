"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { getJson } from "@/lib/api-client"
import { cx, formatNumber, formatPrice } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { mediaUrl } from "@/lib/view-ctx"
import { CartControl } from "../CartControl"
import { useShop } from "../ShopProvider"
import { useToast } from "../Toast"
import { WishlistButton } from "../WishlistButton"
import { GuestNote } from "../common"

// ===== Nội dung trang giỏ hàng =====
// Sau mỗi thay đổi (đổi số lượng, xoá sản phẩm, nhập / bỏ mã giảm giá), lấy lại giỏ hàng từ server
// (GET /cart?partial=1) để cập nhật tiền, mã giảm giá, tồn kho
// cartView: dữ liệu từ buildCartView (server/helpers/cart.helper.ts)

export function CartView({ initialCartView }: { initialCartView: any }) {
  const { ctx, state, cartVersion, notifyCartChanged, setCartQuantity, setProductQuantity, request } = useShop()
  const { t, tName, tOption, tCount } = createTranslator(ctx.lang)
  const { showToast } = useToast()

  const [view, setView] = useState(initialCartView)
  const [removingId, setRemovingId] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponMessage, setCouponMessage] = useState("")
  const [isCouponSending, setIsCouponSending] = useState(false)
  const couponInput = useRef<HTMLInputElement>(null)

  // Server gửi giỏ hàng mới (mở lại trang) thì dùng giỏ hàng mới
  const [syncedView, setSyncedView] = useState(initialCartView)
  if(syncedView !== initialCartView) {
    setSyncedView(initialCartView)
    setView(initialCartView)
  }

  // Số lượng đã kiểm tra tồn kho của từng sản phẩm => ô chọn số lượng và số trên biểu tượng giỏ hàng
  useEffect(() => {
    for (const item of view.itemList) {
      setProductQuantity(item.product.id, item.quantity, item.maxQuantity)
    }
    setCartQuantity(view.cartQuantity)
  }, [view, setProductQuantity, setCartQuantity])

  // Giỏ hàng vừa thay đổi: lấy lại nội dung giỏ hàng (đợi 0,15 giây để gộp các thay đổi liên tiếp)
  const firstVersion = useRef(cartVersion)
  useEffect(() => {
    if(cartVersion === firstVersion.current) return
    let isCancelled = false
    const timer = setTimeout(async () => {
      try {
        const payload = await getJson("/cart?partial=1")
        if(isCancelled) return
        if(!payload.data?.cartView) throw new Error("empty")
        setView(payload.data.cartView)
        setRemovingId("")
      } catch {
        window.location.reload()
      }
    }, 150)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [cartVersion])

  // Xoá 1 sản phẩm
  const handleRemove = async (productId: string) => {
    setRemovingId(productId)
    const data = await request("/cart/update", "PATCH", { productId: productId, quantity: 0 })
    if(data.code === "success") {
      setCartQuantity(data.cartQuantity)
      showToast(data.message)
    }
    else {
      showToast(data.message, "error")
      setRemovingId("")
    }
    notifyCartChanged()
  }

  // Xoá hết giỏ hàng
  const handleClear = async () => {
    if(!confirm(t("clearCartConfirm"))) return
    const data = await request("/cart/clear", "DELETE")
    if(data.code === "success") {
      setCartQuantity(0)
      showToast(data.message)
    }
    else {
      showToast(data.message, "error")
    }
    notifyCartChanged()
  }

  // Nhập mã giảm giá
  const handleCouponSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsCouponSending(true)
    const data = await request("/cart/coupon", "POST", { code: couponCode })
    setIsCouponSending(false)
    if(data.code === "success") {
      showToast(data.message)
      setCouponCode("")
      setCouponMessage("")
      notifyCartChanged()
    }
    else {
      setCouponMessage(data.message || "")
      couponInput.current?.focus()
    }
  }

  // Bỏ mã giảm giá
  const handleCouponRemove = async () => {
    const data = await request("/cart/coupon", "DELETE")
    showToast(data.message, data.code === "success" ? "success" : "error")
    notifyCartChanged()
  }

  const coupon = view.coupon
  const couponOk = coupon && !coupon.errorKey
  const options = ctx.productOptions

  if(view.itemList.length == 0 && view.unavailableList.length == 0) {
    return (
      <div className="sf-empty sf-cart-empty">
        <i className="fas fa-shopping-basket"></i>
        <h3>{t("cartEmptyTitle")}</h3>
        <p>{t("cartEmptyText")}</p>
        <div className="sf-hero-buttons justify-content-center">
          <Link href="/products" className="sf-btn sf-btn-primary">{t("goShopping")}</Link>
          {state.wishlistCount > 0 && (
            <Link href="/wishlist" className="sf-btn sf-btn-light">
              <i className="far fa-heart"></i>
              {t("viewWishlist")}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const removeButton = (productId: string) => (
    <button type="button" className="sf-link-btn" onClick={() => handleRemove(productId)}>
      <i className="far fa-trash-alt"></i>
      {t("remove")}
    </button>
  )

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <GuestNote backUrl="/cart" ctx={ctx} />
        <div className="sf-cart-box">
          <div className="sf-cart-head">
            <h2>
              {t("cart")}
              <span>{tCount(view.totalQuantity, "productCount")}</span>
            </h2>
            <button type="button" className="sf-link-btn" onClick={handleClear}>
              <i className="far fa-trash-alt"></i>
              {t("clearCart")}
            </button>
          </div>

          {view.itemList.length > 0 && (
            <ul className="sf-cart-list">
              {view.itemList.map((item: any) => {
                const product = item.product
                const productUrl = `/product/${product.slug}`
                const unitName = product.unit ? tOption(options.unitList, product.unit) : ""
                const metaList: string[] = []
                if(product.netWeight) metaList.push(`${formatNumber(product.netWeight)} ${tOption(options.netWeightUnitList, product.netWeightUnit)}`)
                if(product.origin && product.origin != "other") metaList.push(tOption(options.originList, product.origin))
                const wishProduct = { id: product.id, name: product.name, nameRu: product.nameRu }

                return (
                  <li key={product.id} className={cx("sf-cart-item", removingId === product.id && "is-removing")}>
                    <Link href={productUrl} className="sf-cart-img" tabIndex={-1} aria-hidden="true">
                      <img src={mediaUrl(ctx, product.cardImage)} alt="" loading="lazy" />
                    </Link>
                    <div className="sf-cart-info">
                      {product.brand && <p className="sf-product-brand">{product.brand}</p>}
                      <Link href={productUrl} className="sf-cart-name">{tName(product)}</Link>
                      {metaList.length > 0 && <p className="sf-product-meta">{metaList.join(" · ")}</p>}
                      <div className={cx("sf-cart-unit-price", product.discountPercent && "is-sale")}>
                        <b>{product.priceFormat}</b>
                        {unitName && <span>/ {unitName.toLowerCase()}</span>}
                        {product.discountPercent ? <del>{product.priceOldFormat}</del> : null}
                      </div>
                      {(product.storageType == "frozen" || product.storageType == "chilled") && (
                        <span className="sf-cart-tag">
                          <i className={product.storageType == "frozen" ? "fas fa-snowflake" : "fas fa-thermometer-quarter"}></i>
                          {tOption(options.storageList, product.storageType)}
                        </span>
                      )}
                      {item.isReduced ? (
                        <p className="sf-cart-warning">
                          <i className="fas fa-exclamation-circle"></i>
                          {t("quantityReduced")}
                        </p>
                      ) : product.isLowStock ? (
                        <p className="sf-cart-note">{t("onlyLeft")} {formatNumber(product.stock)}</p>
                      ) : null}
                      <div className="sf-cart-actions">
                        <WishlistButton product={wishProduct} withText />
                        {removeButton(product.id)}
                      </div>
                    </div>
                    <div className="sf-cart-side">
                      <CartControl product={{ ...wishProduct, stock: product.stock }} min={1} maxQuantity={item.maxQuantity} />
                      <div className={cx("sf-cart-line", item.lineOldTotal > item.lineTotal && "is-sale")}>
                        <b>{formatPrice(item.lineTotal)}</b>
                        {item.lineOldTotal > item.lineTotal && <del>{formatPrice(item.lineOldTotal)}</del>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Sản phẩm hết hàng / ngừng bán: không tính tiền, khách xoá hoặc đợi có hàng */}
          {view.unavailableList.length > 0 && (
            <>
              <h3 className="sf-cart-subtitle">{t("unavailableItems")}</h3>
              <ul className="sf-cart-list">
                {view.unavailableList.map((item: any) => {
                  const product = item.product
                  return (
                    <li key={product.id} className={cx("sf-cart-item is-unavailable", removingId === product.id && "is-removing")}>
                      <span className="sf-cart-img">
                        <img src={mediaUrl(ctx, product.cardImage)} alt="" loading="lazy" />
                      </span>
                      <div className="sf-cart-info">
                        {item.isVisible
                          ? <Link href={`/product/${product.slug}`} className="sf-cart-name">{tName(product)}</Link>
                          : <span className="sf-cart-name">{tName(product)}</span>}
                        <span className="sf-cart-status">{item.isVisible ? t("outOfStock") : t("noLongerSold")}</span>
                        <div className="sf-cart-actions">
                          {item.isVisible && <WishlistButton product={{ id: product.id, name: product.name, nameRu: product.nameRu }} withText />}
                          {removeButton(product.id)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
        <Link href="/products" className="sf-continue">
          <i className="fas fa-arrow-left"></i>
          {t("continueShopping")}
        </Link>
      </div>

      <div className="col-lg-4">
        <aside className="sf-cart-summary">
          <h2>{t("orderSummary")}</h2>
          <dl className="sf-summary-list">
            <div>
              <dt>{t("itemsTotal")} ({formatNumber(view.totalQuantity)})</dt>
              <dd>{formatPrice(view.oldSubtotal)}</dd>
            </div>
            {view.productDiscount > 0 && (
              <div className="is-discount">
                <dt>{t("productDiscount")}</dt>
                <dd>−{formatPrice(view.productDiscount)}</dd>
              </div>
            )}
            {couponOk && view.couponDiscount > 0 && (
              <div className="is-discount">
                <dt>{t("coupon")} {coupon.code}</dt>
                <dd>−{formatPrice(view.couponDiscount)}</dd>
              </div>
            )}
            <div>
              <dt>{t("delivery")}</dt>
              <dd>
                {couponOk && coupon.freeShipping
                  ? <span className="sf-free">{t("free")}</span>
                  : <span className="sf-muted">{t("deliveryAtCheckout")}</span>}
              </dd>
            </div>
          </dl>
          <div className="sf-summary-total">
            <span>{t("total")}</span>
            <b>{formatPrice(view.total)}</b>
          </div>

          {coupon ? (
            <div className={cx("sf-coupon-applied", !couponOk && "is-warning")}>
              <i className="fas fa-ticket-alt"></i>
              <div>
                <b>{coupon.code}</b>
                {couponOk ? (
                  <p>{coupon.freeShipping ? t("couponFreeShipping") : coupon.description ? coupon.description : t("couponApplied")}</p>
                ) : (
                  <p className="sf-coupon-error">
                    {coupon.errorKey == "couponMinOrder"
                      ? `${t("couponMinOrder")} ${formatPrice(coupon.minOrderValue)}. ${t("couponAddMore")} ${formatPrice(coupon.missingAmount)}`
                      : coupon.errorKey == "couponNotStarted"
                        ? `${t("couponNotStarted")}. ${t("couponStartAt")}: ${coupon.startAtFormat}`
                        : t(coupon.errorKey)}
                  </p>
                )}
              </div>
              <button type="button" aria-label={t("couponRemove")} title={t("couponRemove")} onClick={handleCouponRemove}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : view.itemList.length > 0 ? (
            <>
              <form className="sf-coupon-form" noValidate onSubmit={handleCouponSubmit}>
                <input
                  ref={couponInput}
                  type="text"
                  name="code"
                  placeholder={t("couponPlaceholder")}
                  aria-label={t("coupon")}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={50}
                  value={couponCode}
                  onChange={event => {
                    setCouponCode(event.target.value)
                    setCouponMessage("") // gõ lại mã thì ẩn lời báo lỗi cũ
                  }}
                />
                <button type="submit" className="sf-btn sf-btn-dark" disabled={isCouponSending}>{t("couponApply")}</button>
              </form>
              <p className="sf-coupon-message" role="alert" hidden={!couponMessage}>{couponMessage}</p>
            </>
          ) : null}

          {view.itemList.length > 0 ? (
            <>
              <Link href="/checkout" className="sf-btn sf-btn-primary sf-checkout-btn">{t("checkout")}</Link>
              <p className="sf-checkout-note">{t("checkoutPrepayShort")}</p>
            </>
          ) : (
            <button type="button" className="sf-btn sf-btn-primary sf-checkout-btn" disabled>{t("checkout")}</button>
          )}
          {view.hasColdItems && (
            <p className="sf-cold-note">
              <i className="fas fa-snowflake"></i>
              {t("coldChainNote")}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
