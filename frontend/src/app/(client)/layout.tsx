import type { Viewport } from "next"
import { cookies } from "next/headers"
import { ToastProvider } from "@/components/client/Toast"
import { defaultLang, languageList } from "@/lib/i18n"

// Khung HTML của mọi trang khách hàng: CSS giao diện, font chữ
// (đầu trang, menu, chân trang nằm ở components/client/Shell.tsx vì cần dữ liệu của từng trang)

export const viewport: Viewport = {
  themeColor: "#FFFFFF" // nút đổi sáng / tối sẽ đổi lại theo màu nền trang
}

// CSS của giao diện (thư mục public/client/assets/css), sfoodie.css đặt cuối cùng để ghi đè giao diện mẫu
const cssList = [
  "all.min.css",
  "bootstrap.min.css",
  "mobile_menu.css",
  "scroll_button.css",
  "custom_spacing.css",
  "style.css",
  "responsive.css",
  "sfoodie.css"
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  // Ngôn ngữ khách đang chọn (cookie "lang"), chưa chọn thì dùng ngôn ngữ mặc định
  const cookieLang = (await cookies()).get("lang")?.value
  const lang = languageList.some(item => item.id === cookieLang) ? cookieLang : defaultLang

  return (
    // suppressHydrationWarning: thuộc tính data-theme (sáng / tối) được đoạn script đầu trang gắn vào trước khi React chạy
    // data-scroll-behavior="smooth": CSS giao diện bật cuộn mượt (scroll-behavior: smooth), chuyển trang thì
    // Next.js tạm tắt cuộn mượt để nhảy ngay lên đầu trang mới
    <html lang={lang} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link href="/client/assets/images/favicon.ico" rel="icon" />
        <link href="/client/assets/images/apple-touch-icon.png" rel="apple-touch-icon" />
        {/* Tải trước font chữ tiếng Nga (ngôn ngữ mặc định) để chữ hiện đúng font ngay từ đầu */}
        <link href="/client/assets/fonts/nunito-cyrillic-wght-normal.woff2" rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" />
        {cssList.map(file => (
          <link key={file} href={`/client/assets/css/${file}`} rel="stylesheet" />
        ))}
      </head>
      <body className="default_home sfoodie">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
