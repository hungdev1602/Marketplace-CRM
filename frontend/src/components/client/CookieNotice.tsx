"use client"

import { useEffect, useState } from "react"
import { LinkedText } from "./LinkedText"
import { useShop } from "./ShopProvider"

// Thông báo cookie ở góc dưới màn hình (lần đầu khách vào website)
// Website chỉ dùng cookie cần thiết (giỏ hàng, đăng nhập, ngôn ngữ) nên chỉ cần báo cho khách biết, không cần xin phép.
// Sau này gắn Яндекс Метрика / quảng cáo thì phải đổi thành hỏi đồng ý TRƯỚC khi chạy mã đó (xem docs/huong-dan-trang-phap-ly.md)
// Khách bấm "Понятно" thì trình duyệt nhớ (localStorage), không hiện lại
const storageKey = "sf-cookie-notice"

export function CookieNotice() {
  const { t } = useShop()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let isAccepted = false
    try { isAccepted = localStorage.getItem(storageKey) === "1" } catch {}
    // Chạy sau khi trang hiện xong (server không đọc được localStorage), tránh lệch giao diện giữa server và trình duyệt
    if(!isAccepted) setIsVisible(true)
  }, [])

  if(!isVisible) return null

  const accept = () => {
    try { localStorage.setItem(storageKey, "1") } catch {}
    setIsVisible(false)
  }

  return (
    <div className="sf-cookie-notice" role="region" aria-label="Cookie">
      <i className="fas fa-cookie-bite" aria-hidden="true"></i>
      <p>
        <LinkedText text={t("cookieNotice")} links={{ policy: { href: "/legal/privacy#cookie", text: t("linkPolicyCookie") } }} newTab={false} />
      </p>
      <button type="button" className="sf-btn sf-btn-primary" onClick={accept}>{t("cookieNoticeOk")}</button>
    </div>
  )
}
