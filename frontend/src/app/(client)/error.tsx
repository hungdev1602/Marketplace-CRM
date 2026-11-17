"use client"

import { useEffect } from "react"

// Trang báo lỗi của trang khách hàng: không lấy được dữ liệu từ server Express (server chưa chạy, server lỗi,...)
// Chưa biết ngôn ngữ của khách (không có dữ liệu từ server) nên dùng tiếng Nga là ngôn ngữ mặc định của website
export default function ClientError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main>
      <section className="sf-section sf-section-first">
        <div className="container">
          <div className="sf-empty sf-not-found">
            <span className="sf-not-found-code">500</span>
            <h1>Что-то пошло не так</h1>
            <p>Не удалось загрузить страницу. Попробуйте ещё раз через минуту.</p>
            <div className="sf-hero-buttons justify-content-center">
              <button type="button" className="sf-btn sf-btn-dark" onClick={() => reset()}>
                <i className="fas fa-redo"></i>
                Повторить
              </button>
              {/* Thẻ a thường (không dùng Link): tải lại toàn bộ trang sau khi lỗi */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="sf-btn sf-btn-primary">На главную</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
