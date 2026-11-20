"use client"

import { goTo, reloadPage } from "@/lib/top-loader"

// ===== Chuyển trang / lấy lại dữ liệu trang admin mà không tải lại cả trang =====
// AdminProvider (có trên mọi trang admin) đăng ký bộ điều khiển chuyển trang của Next.js ở đây, để các hàm thường
// (sau khi lưu form, xoá, đổi trạng thái, phân trang, lọc...) dùng được.
// Chưa có bộ điều khiển (trang đăng nhập, lỗi JS) thì tải lại cả trang như cũ.

export type AdminNavigator = {
  push: (url: string) => void // mở trang khác
  refresh: () => void // lấy lại dữ liệu mới của trang đang xem, dựng lại nội dung trang
}

let current: AdminNavigator | null = null

export const setAdminNavigator = (value: AdminNavigator | null) => {
  current = value
}

export const getAdminNavigator = (): AdminNavigator | null => current

// Mở trang admin khác, ví dụ adminGo("/admin/product/list?page=2")
export const adminGo = (url: string) => {
  if(current) current.push(url)
  else goTo(url)
}

// Lấy lại dữ liệu mới của trang đang xem (sau khi xoá, lưu, đổi trạng thái...):
// giống tải lại trang (ô nhập, nút đang chờ trở về như mới) nhưng nhanh hơn vì không tải lại CSS, JS, menu
export const adminReload = () => {
  if(current) current.refresh()
  else reloadPage()
}
