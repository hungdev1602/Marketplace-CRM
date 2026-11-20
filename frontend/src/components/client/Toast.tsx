"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { usePathname } from "next/navigation"

// ===== Thông báo nhỏ ở cuối màn hình (đã thêm vào giỏ hàng,...), tự ẩn sau vài giây =====
// Đặt ở layout nên chuyển trang thông báo vẫn còn

export type ToastType = "success" | "warning" | "error"
export type ToastLink = { url: string, text: string } | null | undefined

type ToastItem = { id: number, message: string, type: ToastType, link: ToastLink, show: boolean }

type ToastContextValue = {
  // - type: "success", "warning", "error"
  // - link: { url, text } hiện thêm link, ví dụ "Перейти в корзину"
  showToast: (message: string | undefined, type?: ToastType, link?: ToastLink) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export const useToast = () => useContext(ToastContext)

// Thông báo hiện ở trang tiếp theo sau khi chuyển trang (ví dụ "Отзыв отправлен на проверку")
export const saveToastForNextPage = (message: string) => {
  try { sessionStorage.setItem("sf-toast", message) } catch {}
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastList, setToastList] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const pathname = usePathname()

  const showToast = useCallback((message: string | undefined, type: ToastType = "success", link: ToastLink = null) => {
    if(!message) return
    const id = nextId.current++

    // Chỉ giữ 3 thông báo mới nhất
    setToastList(list => [...list, { id, message, type, link, show: false }].slice(-3))

    // Hiện từ từ, 3,5 giây sau ẩn từ từ rồi bỏ
    requestAnimationFrame(() => {
      setToastList(list => list.map(item => item.id === id ? { ...item, show: true } : item))
    })
    setTimeout(() => {
      setToastList(list => list.map(item => item.id === id ? { ...item, show: false } : item))
      setTimeout(() => setToastList(list => list.filter(item => item.id !== id)), 300)
    }, 3500)
  }, [])

  // Thông báo trang trước để lại
  useEffect(() => {
    try {
      const savedToast = sessionStorage.getItem("sf-toast")
      if(savedToast) {
        sessionStorage.removeItem("sf-toast")
        showToast(savedToast, "success")
      }
    } catch {}
  }, [pathname, showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="sf-toast-area" aria-live="polite">
        {toastList.map(toast => (
          <div
            key={toast.id}
            className={`sf-toast sf-toast-${toast.type}${toast.show ? " is-show" : ""}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <i className={toast.type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle"}></i>
            <span>{toast.message}</span>
            {toast.link?.url && <Link href={toast.link.url}>{toast.link.text}</Link>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
