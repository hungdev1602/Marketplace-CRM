"use client"

// Chọn giao diện sáng / tối trước khi trang hiện ra (tránh bị nháy trắng khi khách đang dùng giao diện tối)
// - Khách đã bấm đổi giao diện: dùng lựa chọn đã lưu (localStorage "sf-theme")
// - Chưa bấm lần nào: dùng mặc định ở Admin => Cài đặt cửa hàng, "system" là theo cài đặt của máy khách
//
// Đoạn script chỉ cần chạy khi trình duyệt tải trang lần đầu (chuyển trang trong website thì thuộc tính
// data-theme trên thẻ <html> vẫn còn). Vì vậy:
// - Lúc server dựng HTML: type="text/javascript", trình duyệt chạy script ngay khi đọc tới
// - Lúc React dựng trên trình duyệt (bấm link chuyển trang): type="text/plain", script không chạy,
//   React cũng không báo "Encountered a script tag while rendering React component"
// Phải là client component ("use client") thì đoạn kiểm tra typeof window mới chạy trên trình duyệt
// (theo hướng dẫn "Preventing flash before hydration" của Next.js)
export function ThemeScript({ defaultTheme }: { defaultTheme: string }) {
  const theme = ["light", "dark"].includes(defaultTheme) ? defaultTheme : "system"
  const code = `(function () {
  var theme = null
  try { theme = localStorage.getItem("sf-theme") } catch (error) {}
  if(theme !== "light" && theme !== "dark") { theme = "${theme}" }
  if(theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  document.documentElement.setAttribute("data-theme", theme)
})()`

  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  )
}
