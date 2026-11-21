"use client"

import { useEffect, useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { countText, cx } from "@/lib/format"
import { createTranslator, languageList } from "@/lib/i18n"
import { telHref } from "@/lib/view-ctx"
import { LogoutButton, ThemeToggle } from "./HeaderParts"
import { useShop } from "./ShopProvider"

// Menu trên điện thoại (bấm nút ☰ ở đầu trang), trượt ra từ bên trái
// Menu nhiều tầng: bấm mục có dấu › thì trượt sang tầng danh mục con, bấm "Назад" để quay lại
export function MobileMenu() {
  const { ctx, state, isMobileMenuOpen, setMobileMenuOpen } = useShop()
  const { t, tName } = createTranslator(ctx.lang)
  const { currentPath, query, clientAccount, shopInfo, categoryTree } = ctx

  // Các tầng đã mở, tầng cuối là tầng đang xem
  const [panelStack, setPanelStack] = useState<string[]>(["main"])
  // Đang trượt đóng lại (giữ menu hiện thêm 0,3 giây cho hiệu ứng)
  const [isHiding, setIsHiding] = useState(false)
  const [isShown, setIsShown] = useState(false)
  const panelRefs = useRef<{ [id: string]: HTMLDivElement | null }>({})

  const close = () => setMobileMenuOpen(false)

  // Mở: thêm class show. Đóng: thêm class hiding, trượt xong thì bỏ cả 2 (giống offcanvas của Bootstrap)
  useEffect(() => {
    if(isMobileMenuOpen) {
      setIsShown(true)
      setIsHiding(false)
      document.body.style.overflow = "hidden"
      return
    }

    if(!isShown) return
    setIsHiding(true)
    const timer = setTimeout(() => {
      setIsShown(false)
      setIsHiding(false)
      // Đóng menu thì lần mở sau bắt đầu lại từ tầng đầu tiên
      setPanelStack(["main"])
    }, 300)
    document.body.style.overflow = ""
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileMenuOpen])

  // Nhấn Esc thì đóng. Rời trang thì trả lại thanh cuộn của trang
  useEffect(() => {
    if(!isMobileMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key === "Escape") setMobileMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isMobileMenuOpen, setMobileMenuOpen])

  useEffect(() => {
    return () => { document.body.style.overflow = "" }
  }, [])

  const currentPanel = panelStack[panelStack.length - 1]

  // Mở tầng danh mục con
  const openPanel = (id: string) => {
    setPanelStack([...panelStack, id])
    requestAnimationFrame(() => {
      const panel = panelRefs.current[id]
      if(panel) {
        panel.scrollTop = 0
        panel.querySelector<HTMLButtonElement>(".sf-mnav-back")?.focus({ preventScroll: true })
      }
    })
  }

  // Quay lại tầng trước
  const goBack = () => {
    if(panelStack.length > 1) setPanelStack(panelStack.slice(0, -1))
  }

  const panelClass = (id: string) => cx(
    "sf-mnav-panel",
    id === currentPanel && "is-active",
    id !== currentPanel && panelStack.includes(id) && "is-behind"
  )

  // 1 dòng danh mục: có danh mục con thì là nút mở tầng tiếp theo, không có thì là link
  const renderCategoryLink = (category: any) => {
    if(category.children.length > 0) {
      return (
        <button type="button" className="sf-mnav-link" onClick={() => openPanel(category.id)}>
          <span>{tName(category)}</span>
          <i className="fas fa-chevron-right"></i>
        </button>
      )
    }
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cx("sf-mnav-link", currentPath == `/category/${category.slug}` && "active")}
        onClick={close}
      >
        <span>{tName(category)}</span>
      </Link>
    )
  }

  // 1 tầng danh mục con (gọi lại chính nó cho danh mục cháu)
  const renderCategoryPanels = (category: any): React.ReactNode => {
    if(category.children.length === 0) return null
    return [
      <div
        key={category.id}
        ref={element => { panelRefs.current[category.id] = element }}
        className={panelClass(category.id)}
        aria-hidden={category.id !== currentPanel ? true : undefined}
      >
        <button type="button" className="sf-mnav-back" onClick={goBack}>
          <i className="fas fa-chevron-left"></i>
          {t("back")}
        </button>
        <p className="sf-mnav-title">{tName(category)}</p>
        <ul className="sf-mnav-list">
          <li>
            <Link href={`/category/${category.slug}`} className="sf-mnav-link sf-mnav-view-all" onClick={close}>
              <span>{t("viewAll")}</span>
              <i className="fas fa-arrow-right"></i>
            </Link>
          </li>
          {category.children.map((child: any) => (
            <li key={child.id}>{renderCategoryLink(child)}</li>
          ))}
        </ul>
      </div>,
      ...category.children.map((child: any) => renderCategoryPanels(child))
    ]
  }

  const pageLink = (href: string, text: string, isActive: boolean) => (
    <li>
      <Link href={href} className={cx("sf-mnav-link", isActive && "active")} onClick={close}>
        <span>{text}</span>
      </Link>
    </li>
  )

  return (
    <>
      <div
        id="offcanvasWithBothOptions"
        className={cx("offcanvas offcanvas-start sf-mnav", isShown && "show", isHiding && "hiding")}
        tabIndex={-1}
        aria-label={t("menu")}
        aria-modal={isShown ? true : undefined}
        role={isShown ? "dialog" : undefined}
      >
        {/* Thanh trên cùng: đóng, logo, sáng / tối (ô tìm kiếm luôn hiện ở đầu trang, ngay dưới logo) */}
        <div className="sf-mnav-top">
          <button type="button" className="sf-mnav-icon-btn" aria-label={t("close")} onClick={close}>
            <i className="fas fa-times"></i>
          </button>
          <Link href="/" className="sf-mnav-logo" onClick={close}>
            <img alt="SFoodie" src="/client/assets/images/sfoodie-logo.png" width={480} height={118} />
          </Link>
          <div className="sf-mnav-top-actions">
            <ThemeToggle />
          </div>
        </div>

        <div className="sf-mnav-body">
          {/* Tầng đầu tiên: danh mục gốc, sau đó là các trang */}
          <div
            ref={element => { panelRefs.current["main"] = element }}
            className={panelClass("main")}
            aria-hidden={currentPanel !== "main" ? true : undefined}
          >
            {categoryTree.length > 0 && (
              <>
                <ul className="sf-mnav-list">
                  {categoryTree.map(item => (
                    <li key={item.id}>{renderCategoryLink(item)}</li>
                  ))}
                </ul>
                <div className="sf-mnav-divider"></div>
              </>
            )}
            <ul className="sf-mnav-list">
              {pageLink("/", t("home"), currentPath == "/")}
              {pageLink("/products", t("allProducts"), currentPath == "/products" && !query.onSale && !query.sort)}
              {pageLink("/products?onSale=1", t("sale"), query.onSale == "1")}
              {pageLink("/products?sort=newest", t("newArrivals"), false)}
              {pageLink("/categories", t("allCategories"), currentPath == "/categories")}
              {pageLink("/blog", t("blog"), currentPath.startsWith("/blog"))}
            </ul>
            <div className="sf-mnav-divider"></div>
            <ul className="sf-mnav-list">
              <li>
                <Link
                  href={clientAccount ? "/account" : "/account/login"}
                  className={cx("sf-mnav-link", currentPath.startsWith("/account") && "active")}
                  onClick={close}
                >
                  <span>
                    <i className={clientAccount ? "fas fa-user" : "far fa-user"}></i>
                    {clientAccount ? clientAccount.fullName : t("loginOrRegister")}
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className={cx("sf-mnav-link", currentPath == "/wishlist" && "active")} onClick={close}>
                  <span>
                    <i className="far fa-heart"></i>
                    {t("wishlist")}
                  </span>
                  <span className="sf-count sf-count-inline" hidden={!(state.wishlistCount > 0)}>{countText(state.wishlistCount)}</span>
                </Link>
              </li>
              <li>
                <Link href="/cart" className={cx("sf-mnav-link", currentPath == "/cart" && "active")} onClick={close}>
                  <span>
                    <i className="fas fa-shopping-basket"></i>
                    {t("cart")}
                  </span>
                  <span className="sf-count sf-count-inline" hidden={!(state.cartQuantity > 0)}>{countText(state.cartQuantity)}</span>
                </Link>
              </li>
              {/* Đăng xuất (chỉ hiện khi đã đăng nhập) */}
              {clientAccount && (
                <li>
                  <LogoutButton className="sf-mnav-link sf-mnav-logout">
                    <span>
                      <i className="fas fa-sign-out-alt"></i>
                      {t("logout")}
                    </span>
                  </LogoutButton>
                </li>
              )}
            </ul>
          </div>

          {/* Các tầng danh mục con */}
          {categoryTree.map(item => renderCategoryPanels(item))}
        </div>

        {/* Dưới cùng: ngôn ngữ, gọi điện, mạng xã hội (mục nào chưa điền thì không hiện) */}
        <div className="sf-mnav-bottom">
          <div className="sf-mnav-language" aria-label={t("language")}>
            {languageList.map(item => (
              <a key={item.id} href={`/language/${item.id}`} className={item.id == ctx.lang ? "active" : ""} hrefLang={item.id}>
                {item.name}
              </a>
            ))}
          </div>
          {shopInfo.phone && (
            <a href={telHref(shopInfo.phone)} className="sf-mnav-bottom-btn">
              <i className="fas fa-phone-alt"></i>
              {shopInfo.phone}
            </a>
          )}
          {(shopInfo.telegram || shopInfo.whatsapp) && (
            <div className="sf-mnav-bottom-row">
              {shopInfo.telegram && (
                <a href={shopInfo.telegram} className="sf-mnav-bottom-btn" target="_blank" rel="noopener">
                  <i className="fab fa-telegram-plane"></i>
                  Telegram
                </a>
              )}
              {shopInfo.whatsapp && (
                <a href={shopInfo.whatsapp} className="sf-mnav-bottom-btn" target="_blank" rel="noopener">
                  <i className="fab fa-whatsapp"></i>
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Nền mờ phía sau menu, bấm vào thì đóng menu */}
      {isShown && <div className={cx("offcanvas-backdrop fade", !isHiding && "show")} onClick={close}></div>}
    </>
  )
}
