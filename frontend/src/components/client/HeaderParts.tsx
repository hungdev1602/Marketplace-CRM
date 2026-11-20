"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { sendJson } from "@/lib/api-client"
import { countText, cx } from "@/lib/format"
import { languageList } from "@/lib/i18n"
import { goTo } from "@/lib/top-loader"
import { useShop } from "./ShopProvider"

// Các nút nhỏ ở đầu trang, menu (dùng lại ở đầu trang trên điện thoại, menu máy tính, menu điện thoại)

// Nút đổi giao diện sáng / tối
// Giao diện được chọn sẵn bằng đoạn script đầu trang (Shell.tsx) để trang không bị nháy màu khi mở
// - Khách đã bấm đổi giao diện: dùng lựa chọn đã lưu (localStorage "sf-theme")
// - Chưa bấm lần nào: dùng mặc định ở Admin => Cài đặt cửa hàng, "system" là theo cài đặt của máy khách
const updateThemeColor = () => {
  // Màu thanh trình duyệt trên điện thoại theo màu nền trang
  const meta = document.querySelector("meta[name='theme-color']")
  if(meta) {
    meta.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--sf-bg").trim() || "#FFFFFF")
  }
}

const setTheme = (theme: string) => {
  const html = document.documentElement
  // Màu chuyển từ từ cho mượt (bỏ qua nếu khách tắt hiệu ứng chuyển động trong cài đặt máy)
  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    html.classList.add("sf-theme-changing")
    setTimeout(() => html.classList.remove("sf-theme-changing"), 400)
  }
  html.setAttribute("data-theme", theme)
  updateThemeColor()
  window.dispatchEvent(new CustomEvent("sf-theme-change"))
}

export function ThemeToggle() {
  const { t, ctx } = useShop()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark")
    sync()
    updateThemeColor()
    window.addEventListener("sf-theme-change", sync)

    // Khách chưa tự chọn giao diện và mặc định là "system": máy khách đổi sáng / tối thì trang đổi theo
    const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystemChange = (event: MediaQueryListEvent) => {
      let savedTheme = null
      try { savedTheme = localStorage.getItem("sf-theme") } catch {}
      if(!savedTheme && ctx.defaultTheme === "system") {
        setTheme(event.matches ? "dark" : "light")
      }
    }
    systemDarkQuery.addEventListener("change", onSystemChange)

    return () => {
      window.removeEventListener("sf-theme-change", sync)
      systemDarkQuery.removeEventListener("change", onSystemChange)
    }
  }, [ctx.defaultTheme])

  const handleClick = () => {
    const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
    setTheme(newTheme)
    // Nhớ lựa chọn của khách cho các lần mở trang sau
    try {
      localStorage.setItem("sf-theme", newTheme)
    } catch {
      // trình duyệt chặn lưu (chế độ ẩn danh,...) thì chỉ đổi ở trang đang xem
    }
  }

  return (
    <button
      type="button"
      className="sf-theme-toggle"
      aria-label={t("themeToggle")}
      title={t("themeToggle")}
      aria-pressed={isDark}
      onClick={handleClick}
    >
      <i className="fas fa-moon"></i>
      <i className="fas fa-sun"></i>
    </button>
  )
}

// Biểu tượng ♡ (yêu thích) và giỏ hàng kèm số lượng (tự cập nhật khi khách thêm / bỏ sản phẩm)
export function ShopIconLinks() {
  const { t, ctx, state } = useShop()
  return (
    <>
      <Link
        href="/wishlist"
        className={cx("sf-icon-link", ctx.currentPath == "/wishlist" && "active")}
        aria-label={t("wishlist")}
        title={t("wishlist")}
      >
        <i className="far fa-heart"></i>
        <span className="sf-icon-text">{t("wishlist")}</span>
        <span className="sf-count" hidden={!(state.wishlistCount > 0)}>{countText(state.wishlistCount)}</span>
      </Link>
      <Link
        href="/cart"
        className={cx("sf-icon-link", ctx.currentPath == "/cart" && "active")}
        aria-label={t("cart")}
        title={t("cart")}
      >
        <i className="fas fa-shopping-basket"></i>
        <span className="sf-icon-text">{t("cart")}</span>
        <span className="sf-count" hidden={!(state.cartQuantity > 0)}>{countText(state.cartQuantity)}</span>
      </Link>
    </>
  )
}

// Đăng xuất: gửi bằng POST (không dùng link), để trang web khác không đăng xuất được khách
export function LogoutButton({ className, children }: { className: string, children: React.ReactNode }) {
  const { errorText } = useShop()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if(isLoading) return
    setIsLoading(true)
    const result = await sendJson("/account/logout", "POST", undefined, errorText)
    // Tải lại toàn bộ trang để đầu trang, giỏ hàng, yêu thích hiện theo khách chưa đăng nhập
    goTo(result.code === "redirect" && result.url ? result.url : "/")
  }

  return (
    <button type="button" className={className} disabled={isLoading} onClick={handleClick}>
      {children}
    </button>
  )
}

// Nút tài khoản: chưa đăng nhập => "Войти" (trang đăng nhập)
// Đã đăng nhập => tên khách, bấm vào mở menu nhỏ: "Личный кабинет", "Выйти". Bấm ra ngoài hoặc nhấn Esc thì đóng lại
export function AccountLink() {
  const { t, ctx } = useShop()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const account = ctx.clientAccount
  const isActive = ctx.currentPath.startsWith("/account")

  useEffect(() => {
    if(!isOpen) return
    const onClick = (event: MouseEvent) => {
      if(menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key === "Escape") {
        setIsOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  if(!account) {
    return (
      <Link
        href="/account/login"
        className={cx("sf-icon-link sf-account-link", isActive && "active")}
        aria-label={t("loginOrRegister")}
        title={t("loginOrRegister")}
      >
        <i className="far fa-user"></i>
        <span className="sf-icon-text">{t("loginAction")}</span>
      </Link>
    )
  }

  return (
    <div className="sf-account-menu" ref={menuRef}>
      <button
        type="button"
        ref={toggleRef}
        className={cx("sf-icon-link sf-account-link sf-account-toggle", isActive && "active")}
        aria-label={t("myAccount")}
        title={t("myAccount")}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="sf-account-dropdown"
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-user"></i>
        <span className="sf-icon-text">{`${account.fullName || ""}`.split(" ")[0]}</span>
        <i className="fas fa-chevron-down sf-account-caret"></i>
      </button>
      <div className="sf-account-dropdown" id="sf-account-dropdown" hidden={!isOpen}>
        <div className="sf-account-dropdown-head">
          <b>{account.fullName}</b>
          <span>{account.email}</span>
        </div>
        <Link href="/account" className="sf-account-dropdown-item" onClick={() => setIsOpen(false)}>
          <i className="fas fa-user-circle"></i>
          <span>{t("myAccount")}</span>
        </Link>
        <Link href="/account/orders" className="sf-account-dropdown-item" onClick={() => setIsOpen(false)}>
          <i className="fas fa-receipt"></i>
          <span>{t("myOrders")}</span>
        </Link>
        <Link href="/account/reviews" className="sf-account-dropdown-item" onClick={() => setIsOpen(false)}>
          <i className="far fa-star"></i>
          <span>{t("myReviews")}</span>
        </Link>
        <LogoutButton className="sf-account-dropdown-item is-logout">
          <i className="fas fa-sign-out-alt"></i>
          <span>{t("logout")}</span>
        </LogoutButton>
      </div>
    </div>
  )
}

// Chọn ngôn ngữ: mở /language/ru (app/(client)/language/[lang]/route.ts lưu cookie rồi quay lại trang đang xem)
// Dùng thẻ a thường (không dùng Link) để tải lại toàn bộ trang theo ngôn ngữ mới
export function LanguageLinks({ short }: { short?: boolean }) {
  const { ctx } = useShop()
  return (
    <>
      {languageList.map(item => (
        <a
          key={item.id}
          href={`/language/${item.id}`}
          className={item.id == ctx.lang ? "active" : ""}
          title={short ? item.name : undefined}
          hrefLang={item.id}
        >
          {short ? item.shortName : item.name}
        </a>
      ))}
    </>
  )
}

// Nút ☰ mở menu trên điện thoại
export function MobileMenuButton() {
  const { t, setMobileMenuOpen } = useShop()
  return (
    <button
      aria-controls="offcanvasWithBothOptions"
      className="mobile_menu_icon"
      type="button"
      aria-label={t("menu")}
      onClick={() => setMobileMenuOpen(true)}
    >
      <i className="fas fa-bars menu_icon_bar"></i>
    </button>
  )
}
