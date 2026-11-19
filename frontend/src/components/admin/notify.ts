"use client"

import { Notyf } from "notyf"
import "notyf/notyf.min.css"

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

// Lưu thông báo rồi tải lại trang (danh sách hiện dữ liệu mới, thông báo hiện sau khi tải lại)
export const drawNotify = (type: string, message: string) => {
  saveNotify(type, message)
  window.location.reload()
}

// Lưu thông báo rồi chuyển sang trang khác
export const notifyAndGo = (type: string, message: string, url: string) => {
  saveNotify(type, message)
  window.location.href = url
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
