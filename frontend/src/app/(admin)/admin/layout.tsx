import type { Metadata } from "next"
import Script from "next/script"
import { TopLoader } from "@/components/TopLoader"

// Khung HTML của mọi trang admin: CSS giao diện admin, JS của Bootstrap (menu thả xuống, cửa sổ modal)
// (thanh trên cùng, menu trái nằm ở components/admin/AdminShell.tsx vì cần dữ liệu tài khoản của từng trang)

export const metadata: Metadata = {
  // Trang admin không cho Google / Yandex lập chỉ mục
  robots: { index: false, follow: false }
}

const cssList = ["bootstrap.min.css", "icons.min.css", "app.min.css", "main.css"]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: nút đổi sáng / tối và menu trái đổi thuộc tính của html, body bằng JS
    // data-scroll-behavior="smooth": CSS Bootstrap bật cuộn mượt, chuyển trang thì Next.js tạm tắt để nhảy ngay lên đầu trang
    <html data-bs-theme="dark" data-startbar="dark" data-scroll-behavior="smooth" dir="ltr" lang="vi" suppressHydrationWarning>
      <head>
        {/* ?v=2 để trình duyệt tải favicon mới thay cho favicon cũ đã lưu */}
        <link rel="icon" href="/admin/assets/images/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/admin/assets/images/apple-touch-icon.png?v=2" />
        {cssList.map(file => (
          <link key={file} rel="stylesheet" type="text/css" href={`/admin/assets/css/${file}`} />
        ))}
      </head>
      <body suppressHydrationWarning>
        {/* Thanh loading mỏng ở trên cùng khi chuyển trang, màu chính (xanh lá) của trang admin */}
        <TopLoader color="var(--bs-primary)" />
        {children}
        <Script src="/admin/assets/libs/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
