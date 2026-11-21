"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { adminUrl } from "@/lib/admin"
import { cx } from "@/lib/format"
import { useAdmin } from "./AdminProvider"
import { AdminLink } from "./AdminLink"

// ===== Thanh trên cùng và menu bên trái của trang admin =====

// Menu bên trái: mỗi mục hiện khi tài khoản có 1 trong các quyền (permissions)
// - children: menu con, bấm vào mục cha để mở / đóng
// - superAdmin: chỉ Super Admin thấy
type MenuItem = {
  label: string
  icon?: string
  href?: string
  permissions?: string[]
  superAdmin?: boolean
  children?: { label: string, href: string, permission: string }[]
}

const menuList: MenuItem[] = [
  { label: "Trang tổng quan", icon: "iconoir-home-simple", href: "/dashboard", permissions: ["dashboard"] },
  {
    label: "Sản phẩm",
    icon: "iconoir-shopping-bag",
    children: [
      { label: "Tạo sản phẩm", href: "/product/create", permission: "product-create" },
      { label: "Danh sách sản phẩm", href: "/product/list", permission: "product-list" },
      { label: "Danh mục sản phẩm", href: "/product/category", permission: "product-category" },
      { label: "Nhập sản phẩm từ Excel", href: "/product/import", permission: "product-import" }
    ]
  },
  { label: "Đơn hàng", icon: "iconoir-cart", href: "/order/list", permissions: ["order-list"] },
  { label: "Đánh giá sản phẩm", icon: "iconoir-chat-bubble-check", href: "/review/list", permissions: ["review-list"] },
  {
    label: "Mã giảm giá",
    icon: "iconoir-percentage-circle",
    children: [
      { label: "Tạo mã giảm giá", href: "/coupon/create", permission: "coupon-create" },
      { label: "Danh sách mã giảm giá", href: "/coupon/list", permission: "coupon-list" }
    ]
  },
  {
    label: "Bài viết",
    icon: "iconoir-journal-page",
    children: [
      { label: "Tạo bài viết", href: "/article/create", permission: "article-create" },
      { label: "Danh sách bài viết", href: "/article/list", permission: "article-list" },
      { label: "Danh mục bài viết", href: "/article/category", permission: "article-category" }
    ]
  },
  {
    label: "Nhóm quyền",
    icon: "iconoir-user-badge-check",
    children: [
      { label: "Tạo nhóm quyền", href: "/role/create", permission: "role-create" },
      { label: "Danh sách nhóm quyền", href: "/role/list", permission: "role-list" }
    ]
  },
  {
    label: "Tài khoản quản trị",
    icon: "iconoir-user-crown",
    children: [
      { label: "Tạo tài khoản", href: "/account-admin/create", permission: "account-admin-create" },
      { label: "Danh sách tài khoản", href: "/account-admin/list", permission: "account-admin-list" }
    ]
  },
  { label: "Quản lý file", icon: "iconoir-page-star", href: "/file-manager/iframe", permissions: ["file-manager"] },
  { label: "Kết nối API", icon: "iconoir-data-transfer-both", href: "/integration/list", permissions: ["integration-view", "integration-edit"] },
  { label: "Cài đặt cửa hàng", icon: "iconoir-settings", href: "/setting/list", permissions: ["setting-edit"] },
  { label: "Nhật ký hoạt động", icon: "iconoir-clock-rotate-right", href: "/activity-log/list", superAdmin: true }
]

// Menu trái tự thu gọn ở màn hình vừa và nhỏ (310px - 1440px), bấm nút ☰ để mở / thu gọn
const getSidebarSize = () => window.innerWidth >= 310 && window.innerWidth <= 1440 ? "collapsed" : "default"

export function Topbar() {
  const { account, fileSrc } = useAdmin()
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const changeSidebarSize = () => document.body.setAttribute("data-sidebar-size", getSidebarSize())
    const onScroll = () => setIsSticky(document.documentElement.scrollTop >= 50)
    changeSidebarSize()
    window.addEventListener("resize", changeSidebarSize)
    window.addEventListener("scroll", onScroll)
    return () => {
      window.removeEventListener("resize", changeSidebarSize)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const toggleSidebar = () => {
    const isCollapsed = document.body.getAttribute("data-sidebar-size") == "collapsed"
    document.body.setAttribute("data-sidebar-size", isCollapsed ? "default" : "collapsed")
  }

  // Đổi giao diện sáng / tối của trang admin
  const toggleTheme = () => {
    const html = document.documentElement
    html.setAttribute("data-bs-theme", html.getAttribute("data-bs-theme") === "light" ? "dark" : "light")
  }

  // Ảnh đại diện của tài khoản đang đăng nhập (chưa có thì dùng ảnh mặc định)
  const accountAvatar = account?.avatar ? fileSrc(account.avatar, 160) : "/admin/assets/images/users/avatar-1.jpg"

  return (
    <div className="topbar d-print-none">
      <div className="container-xxl">
        <nav id="topbar-custom" className={cx("topbar-custom d-flex justify-content-between", isSticky && "nav-sticky")}>
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <li>
              <button id="togglemenu" className="nav-link mobile-menu-btn nav-icon" onClick={toggleSidebar}>
                <i className="iconoir-menu-scale"></i>
              </button>
            </li>
            {/* Logo chỉ hiện khi màn hình < 1200px (lúc này menu trái bị ẩn). Điện thoại: icon vuông, tablet: logo ngang */}
            <li className="topbar-logo d-xl-none">
              <AdminLink href={adminUrl("/dashboard")}>
                <img className="d-sm-none" alt="SFoodie" src="/admin/assets/images/sfoodie-icon.png" />
                <img className="d-none d-sm-inline-block" alt="SFoodie" src="/admin/assets/images/sfoodie-logo.png" />
              </AdminLink>
            </li>
            <li className="mx-3 welcome-text">
              <h3 className="mb-0 fw-bold text-truncate">Hello, {account?.fullName}!</h3>
            </li>
          </ul>
          <ul className="topbar-item list-unstyled d-inline-flex align-items-center mb-0">
            <li className="topbar-item">
              <a id="light-dark-mode" className="nav-link nav-icon" href="#" onClick={event => { event.preventDefault(); toggleTheme() }}>
                <i className="icofont-moon dark-mode"></i>
                <i className="icofont-sun light-mode"></i>
              </a>
            </li>
            <li className="dropdown topbar-item">
              <a className="nav-link dropdown-toggle arrow-none nav-icon" aria-expanded="false" aria-haspopup="false" role="button" href="#" data-bs-toggle="dropdown">
                <img className="thumb-lg rounded-circle" alt="" src={accountAvatar} />
              </a>
              <div className="dropdown-menu dropdown-menu-end py-0">
                <div className="d-flex align-items-center dropdown-item py-2 bg-secondary-subtle">
                  <div className="flex-shrink-0">
                    <img className="thumb-md rounded-circle" alt="" src={accountAvatar} />
                  </div>
                  <div className="flex-grow-1 ms-2 text-truncate align-self-center">
                    <h6 className="my-0 fw-medium text-dark fs-13">{account?.fullName}</h6>
                    <small className="text-muted mb-0">{account?.isSuperAdmin ? "Super Admin" : account?.email}</small>
                  </div>
                </div>
                <div className="dropdown-divider mt-0 mb-0"></div>
                {/* Đăng xuất: server xoá cookie đăng nhập rồi chuyển về trang đăng nhập */}
                <a className="dropdown-item text-danger" href={adminUrl("/account/logout")}>
                  <i className="las la-power-off fs-18 me-1 align-text-bottom"></i>
                  Logout
                </a>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}

export function Startbar() {
  const { account, can, canAny } = useAdmin()
  const pathname = usePathname()
  // Mục menu đang xem: đúng trang, hoặc trang con (ví dụ /product/edit/123 thuộc "Danh sách sản phẩm" thì không tô)
  const isActive = (href: string) => pathname === adminUrl(href)

  // Mục cha đang mở (mặc định mở mục chứa trang đang xem)
  const activeGroup = menuList.find(item => item.children?.some(child => isActive(child.href)))?.label || ""
  const [openGroup, setOpenGroup] = useState(activeGroup)

  return (
    <>
      <div className="startbar d-print-none">
        <div className="brand">
          <AdminLink className="logo" href={adminUrl("/dashboard")}>
            <img className="logo-sm" alt="SFoodie" src="/admin/assets/images/sfoodie-icon.png" />
            <img className="logo-lg" alt="SFoodie" src="/admin/assets/images/sfoodie-logo.png" />
          </AdminLink>
        </div>
        <div className="startbar-menu">
          <div id="startbarCollapse" className="startbar-collapse" style={{ overflowY: "auto" }}>
            <div className="d-flex align-items-start flex-column w-100">
              <ul className="navbar-nav mb-auto w-100">
                <li className="menu-label pt-0 mt-0">
                  <small className="label-border">
                    <div className="border_left hidden-xs"></div>
                    <div className="border_right"></div>
                  </small>
                  <span>Main Menu</span>
                </li>
                {menuList.map(item => {
                  if(item.children) {
                    const childList = item.children.filter(child => can(child.permission))
                    if(childList.length === 0) return null
                    const isOpen = openGroup === item.label
                    return (
                      <li className="nav-item" key={item.label}>
                        <a
                          className={cx("nav-link", item.label === activeGroup && "active")}
                          aria-expanded={isOpen}
                          role="button"
                          href="#"
                          onClick={event => {
                            event.preventDefault()
                            setOpenGroup(isOpen ? "" : item.label)
                          }}
                        >
                          <i className={`${item.icon} menu-icon`}></i>
                          <span>{item.label}</span>
                        </a>
                        <div className={cx("collapse", isOpen && "show")}>
                          <ul className="nav flex-column">
                            {childList.map(child => (
                              <li className={cx("nav-item", isActive(child.href) && "active")} key={child.href}>
                                <AdminLink className={cx("nav-link", isActive(child.href) && "active")} href={adminUrl(child.href)}>{child.label}</AdminLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    )
                  }

                  const isAllowed = item.superAdmin ? Boolean(account?.isSuperAdmin) : canAny(item.permissions || [])
                  if(!isAllowed || !item.href) return null
                  return (
                    <li className={cx("nav-item", isActive(item.href) && "active")} key={item.label}>
                      <AdminLink className={cx("nav-link", isActive(item.href) && "active")} href={adminUrl(item.href)}>
                        <i className={`${item.icon} menu-icon`}></i>
                        <span>{item.label}</span>
                      </AdminLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* Nền mờ phía sau menu trên điện thoại, bấm vào thì thu gọn menu */}
      <div className="startbar-overlay d-print-none" onClick={() => document.body.setAttribute("data-sidebar-size", "collapsed")}></div>
    </>
  )
}
