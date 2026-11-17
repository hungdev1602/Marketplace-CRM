import { makeCtx, type ViewCtx } from "@/lib/view-ctx"
import { Footer } from "./Footer"
import { Header, MainMenu } from "./Header"
import { MobileMenu } from "./MobileMenu"
import { ScrollButton } from "./ScrollButton"
import { ShopProvider } from "./ShopProvider"

// Chọn giao diện sáng / tối trước khi trang hiện ra (tránh bị nháy trắng khi khách đang dùng giao diện tối)
// - Khách đã bấm đổi giao diện: dùng lựa chọn đã lưu (localStorage "sf-theme")
// - Chưa bấm lần nào: dùng mặc định ở Admin => Cài đặt cửa hàng, "system" là theo cài đặt của máy khách
// Đoạn script chỉ chạy khi trình duyệt tải trang lần đầu (chuyển trang trong website thì giao diện đã chọn rồi)
function ThemeScript({ defaultTheme }: { defaultTheme: string }) {
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

// Khung của mọi trang khách hàng: đầu trang, menu, nội dung trang, chân trang
// data: dữ liệu server Express trả về cho trang (có sẵn tài khoản, giỏ hàng, danh mục,...)
export function ClientShell({ data, ctx, children }: { data: any, ctx?: ViewCtx, children: React.ReactNode }) {
  const viewCtx = ctx || makeCtx(data)

  return (
    <ShopProvider
      ctx={viewCtx}
      initial={{
        cartQuantity: data.cartQuantity || 0,
        cartQuantityMap: data.cartQuantityMap || {},
        wishlistCount: data.wishlistCount || 0,
        wishlistMap: data.wishlistMap || {}
      }}
    >
      <ThemeScript defaultTheme={viewCtx.defaultTheme} />
      <Header />
      <MainMenu />
      <MobileMenu />

      <main>{children}</main>

      <Footer ctx={viewCtx} />
      <ScrollButton />
    </ShopProvider>
  )
}
