import { makeCtx, type ViewCtx } from "@/lib/view-ctx"
import { Footer } from "./Footer"
import { Header, MainMenu } from "./Header"
import { MobileMenu } from "./MobileMenu"
import { ScrollButton } from "./ScrollButton"
import { ShopProvider } from "./ShopProvider"
import { ThemeScript } from "./ThemeScript"

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
        wishlistMap: data.wishlistMap || {},
        compareCount: data.compareCount || 0,
        compareMap: data.compareMap || {}
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
