"use client"

import { adminApiUrl } from "@/lib/admin"
import { notifyError } from "./notify"

// ===== Gọi API admin của server Express từ trình duyệt =====
// path là đường dẫn sau /admin, ví dụ adminRequest("/article/delete/123", "PATCH")
// => gọi /api/admin/article/delete/123, Next.js chuyển tiếp sang server Express (next.config.ts)

export type AdminResult = { code: string, message?: string, [key: string]: any }

export { adminApiUrl }

// body: FormData (form có nhiều ô), object (gửi dạng JSON) hoặc để trống
export const adminRequest = async (path: string, method: string = "GET", body?: FormData | object): Promise<AdminResult> => {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData
    const response = await fetch(adminApiUrl(path), {
      method: method,
      headers: {
        "Accept": "application/json",
        "X-Response-Format": "json",
        ...(body && !isForm ? { "Content-Type": "application/json" } : {})
      },
      body: body ? (isForm ? body as FormData : JSON.stringify(body)) : undefined
    })
    const data = await response.json()
    // Phiên đăng nhập đã hết: server muốn chuyển về trang đăng nhập
    if(data?.code === "redirect") {
      window.location.href = data.url
      return { code: "error", message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!" }
    }
    return data
  } catch {
    return { code: "error", message: "Không kết nối được máy chủ, vui lòng thử lại!" }
  }
}

// Gọi API, lỗi thì hiện thông báo lỗi. Trả về dữ liệu nếu thành công, null nếu lỗi
export const adminCall = async (path: string, method: string = "GET", body?: FormData | object): Promise<AdminResult | null> => {
  const data = await adminRequest(path, method, body)
  if(data.code !== "success") {
    notifyError(data.message || "Có lỗi xảy ra")
    return null
  }
  return data
}
