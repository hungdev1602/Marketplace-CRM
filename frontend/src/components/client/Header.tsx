"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cx } from "@/lib/format"
import { createTranslator, languageList } from "@/lib/i18n"
import { mediaUrl, telHref } from "@/lib/view-ctx"
import { AccountLink, MobileMenuButton, ShopIconLinks, ThemeToggle } from "./HeaderParts"
import { SearchBox } from "./SearchBox"
import { useShop } from "./ShopProvider"

// Đầu trang: logo, ô tìm kiếm, số điện thoại, đổi giao diện, chọn ngôn ngữ
export function Header() {
  const { t, ctx } = useShop()
  const { shopInfo } = ctx

  return (
    <header className="header_2 sf-header">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-2 col-xl-2">
            <div className="header_logo_area">
              <Link className="header_logo" href="/">
                <img className="img-fluid" alt="SFoodie Asian Store" src="/client/assets/images/sfoodie-logo.png" width={480} height={118} />
              </Link>
              <div className="sf-header-mobile-actions d-flex d-lg-none">
                <ShopIconLinks />
                <ThemeToggle />
                <MobileMenuButton />
              </div>
            </div>
          </div>
          {/* Tìm kiếm: máy tính ở giữa đầu trang, điện thoại là 1 hàng riêng dưới logo */}
          <div className="col-12 col-lg-6 col-xl-6 sf-header-search">
            <SearchBox
              lang={ctx.lang}
              categoryTree={ctx.categoryTree}
              initialKeyword={typeof ctx.query.keyword === "string" ? ctx.query.keyword : ""}
              initialCategory={typeof ctx.query.category === "string" ? ctx.query.category : ""}
            />
          </div>
          <div className="col-xl-4 col-lg-4 d-none d-lg-flex justify-content-end align-items-center gap-3">
            {shopInfo.phone && (
              <div className="sf-header-phone">
                <span className="icon"><i className="fas fa-phone-alt"></i></span>
                <div>
                  <span>{t("hotline")}</span>
                  <a href={telHref(shopInfo.phone)}>{shopInfo.phone}</a>
                </div>
              </div>
            )}
            <ThemeToggle />
            {/* Chọn ngôn ngữ */}
            <ul className="sf-language" aria-label={t("language")}>
              {languageList.map(item => (
                <li key={item.id}>
                  <a href={`/language/${item.id}`} className={item.id == ctx.lang ? "active" : ""} title={item.name} hrefLang={item.id}>
                    {item.shortName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}

// Menu chính (máy tính): danh mục sản phẩm, các trang, tài khoản, yêu thích, giỏ hàng
// Menu dính trên đầu trang khi cuộn xuống (CSS position: sticky, xem sfoodie.css)
export function MainMenu() {
  const { ctx } = useShop()
  const { t, tName } = createTranslator(ctx.lang)
  const { currentPath, query } = ctx

  const navRef = useRef<HTMLElement>(null)
  const categoryAreaRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)

  // Đầu trang (logo lớn, ô tìm kiếm) cuộn khuất thì thêm class is-stuck: hiện logo nhỏ, đổ bóng dưới menu
  useEffect(() => {
    const siteHeader = document.querySelector(".sf-header")
    if(!siteHeader || !("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting))
    observer.observe(siteHeader)
    return () => observer.disconnect()
  }, [])

  // Nút "Danh mục sản phẩm": bấm ra ngoài thì đóng lại
  useEffect(() => {
    if(!isCategoryOpen) return
    const onClick = (event: MouseEvent) => {
      if(categoryAreaRef.current && !categoryAreaRef.current.contains(event.target as Node)) setIsCategoryOpen(false)
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [isCategoryOpen])

  // Mục menu đang xem được tô đậm
  const isActive = (path: string) => path === "/" ? currentPath === "/" : currentPath.startsWith(path)
  const isOnSale = query.onSale === "1"
  const closeCategory = () => setIsCategoryOpen(false)

  return (
    <nav ref={navRef} className={cx("d-none d-lg-block main_menu_2 main_menu", isStuck && "is-stuck")}>
      <div className="container">
        <div className="row">
          <div className="col-12 d-flex flex-wrap">
            <div className="main_menu_area">
              {/* Logo nhỏ, chỉ hiện khi đã cuộn xuống (menu dính trên cùng, đầu trang có logo lớn đã bị cuộn khuất) */}
              <Link className="menu_logo" href="/" tabIndex={-1} aria-hidden="true">
                <img className="img-fluid" alt="SFoodie" src="/client/assets/images/sfoodie-logo.png" width={480} height={118} />
              </Link>
              <div ref={categoryAreaRef} className={cx("menu_category_area", isCategoryOpen && "show_category")}>
                {/* Danh mục sản phẩm (admin tạo ở trang Quản lý danh mục sản phẩm) */}
                <div className={cx("menu_category_bar", isCategoryOpen && "ratate_arrow")} onClick={() => setIsCategoryOpen(!isCategoryOpen)}>
                  <p>
                    <span><i className="fas fa-th-large"></i></span>
                    {t("browseCategories")}
                  </p>
                  <i className="fas fa-chevron-down"></i>
                </div>
                <ul className="menu_cat_item">
                  {ctx.categoryTree.slice(0, 10).map(item => (
                    <li key={item.id}>
                      <Link href={`/category/${item.slug}`} onClick={closeCategory}>
                        <span>
                          {item.avatar
                            ? <img alt={tName(item)} src={mediaUrl(ctx, item.avatar)} loading="lazy" />
                            : <i className="fas fa-utensils"></i>}
                        </span>
                        {tName(item)}
                      </Link>
                      {item.children.length > 0 && (
                        <ul className="menu_cat_droapdown">
                          {item.children.map((child: any) => (
                            <li key={child.id}>
                              <Link href={`/category/${child.slug}`} onClick={closeCategory}>
                                {tName(child)}
                                {child.children.length > 0 && <i className="fas fa-angle-right"></i>}
                              </Link>
                              {child.children.length > 0 && (
                                <ul className="sub_category">
                                  {child.children.map((grandChild: any) => (
                                    <li key={grandChild.id}>
                                      <Link href={`/category/${grandChild.slug}`} onClick={closeCategory}>{tName(grandChild)}</Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  <li className="all_category">
                    <Link href="/categories" onClick={closeCategory}>
                      {t("allCategories")}
                      <i className="fas fa-arrow-right"></i>
                    </Link>
                  </li>
                </ul>
              </div>
              <ul className="menu_item">
                <li>
                  <Link href="/" className={isActive("/") ? "active" : ""}>{t("home")}</Link>
                </li>
                <li>
                  <Link
                    href="/products"
                    className={(isActive("/products") && !isOnSale) || isActive("/category") || isActive("/product/") ? "active" : ""}
                  >
                    {t("products")}
                  </Link>
                </li>
                <li>
                  <Link href="/products?onSale=1" className={isOnSale ? "active" : ""}>{t("sale")}</Link>
                </li>
                <li>
                  <Link href="/products?sort=newest">{t("newArrivals")}</Link>
                </li>
                <li>
                  <Link href="/categories" className={isActive("/categories") ? "active" : ""}>{t("categories")}</Link>
                </li>
                <li>
                  <Link href="/blog" className={isActive("/blog") ? "active" : ""}>{t("blog")}</Link>
                </li>
              </ul>
              {/* Tài khoản, yêu thích, giỏ hàng (menu dính trên cùng khi cuộn nên khách luôn thấy) */}
              <div className="sf-menu-actions">
                <AccountLink />
                <ShopIconLinks />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
