"use client"

import { Notyf } from "notyf"
import "notyf/notyf.min.css"
import { goTo, reloadPage } from "@/lib/top-loader"
import { adminGo, adminReload, getAdminNavigator } from "./navigation"

// ===== Thông báo ở góc trên bên phải trang admin (thư viện Notyf) =====

let notyf: Notyf | null = null
const getNotyf = (): Notyf => {
  if(!notyf) {
    notyf = new Notyf({
      duration: 3000,
      position: { x: "right", y: "top" },
      dismissible: true
    })
  }
  return notyf
}

export const notifySuccess = (message: string) => { getNotyf().success(message || "Thành công") }
export const notifyError = (message: string) => { getNotyf().error(message || "Có lỗi xảy ra") }

// Lưu thông báo để hiện ở trang tiếp theo (sau khi tải lại / chuyển trang)
export const saveNotify = (type: string, message: string) => {
  try {
    sessionStorage.setItem("notify", JSON.stringify({ type, message }))
  } catch {}
}

const showNotify = (type: string, message: string) => {
  if(type === "success") notifySuccess(message)
  else if(type === "error") notifyError(message)
}

// Hiện thông báo rồi lấy lại dữ liệu mới của trang (danh sách hiện dữ liệu mới)
// Không chuyển trang được kiểu Next.js (trang đăng nhập,...) thì lưu thông báo, tải lại cả trang rồi mới hiện
export const drawNotify = (type: string, message: string) => {
  if(getAdminNavigator()) {
    showNotify(type, message)
    adminReload()
    return
  }
  saveNotify(type, message)
  reloadPage()
}

// Hiện thông báo rồi chuyển sang trang khác (thông báo vẫn hiện ở trang mới vì không tải lại cả trang)
export const notifyAndGo = (type: string, message: string, url: string) => {
  if(getAdminNavigator()) {
    showNotify(type, message)
    adminGo(url)
    return
  }
  saveNotify(type, message)
  goTo(url)
}

// Hiện thông báo trang trước để lại (gọi 1 lần khi trang admin mở ra)
export const showSavedNotify = () => {
  try {
    const notifyData = sessionStorage.getItem("notify")
    if(!notifyData) return
    sessionStorage.removeItem("notify")
    const { type, message } = JSON.parse(notifyData)
    if(type === "success") notifySuccess(message)
    else if(type === "error") notifyError(message)
  } catch {}
}
