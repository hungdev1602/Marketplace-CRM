import Link from "@/components/client/ShopLink"
import { ClientShell } from "@/components/client/Shell"
import { loadPage } from "@/lib/server-api"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang 404 của trang khách hàng (đường dẫn sai, sản phẩm / bài viết không tồn tại)
// Hỏi server 1 đường dẫn không có để lấy dữ liệu chung của trang (menu danh mục, giỏ hàng, tài khoản)

export const metadata = {
  title: "404 — SFoodie"
}

export default async function NotFound() {
  const { data } = await loadPage("/404")
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first">
        <div className="container">
          <div className="sf-empty sf-not-found">
            <span className="sf-not-found-code">404</span>
            <h1>{t("notFoundTitle")}</h1>
            <p>{t("notFoundText")}</p>
            <div className="sf-hero-buttons justify-content-center">
              <Link href="/" className="sf-btn sf-btn-dark">
                <i className="fas fa-home"></i>
                {t("backHome")}
              </Link>
              <Link href="/products" className="sf-btn sf-btn-primary">{t("products")}</Link>
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
