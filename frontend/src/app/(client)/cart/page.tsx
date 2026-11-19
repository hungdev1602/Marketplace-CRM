import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { CartView } from "@/components/client/views/CartView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang giỏ hàng: /cart
// Dữ liệu: server/controller/client/cart.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/cart", await searchParams)
  return clientMetadata(data)
}

export default async function CartPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/cart", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("cart")} breadcrumbList={[{ name: t("cart") }]} lang={ctx.lang} />
      <section className="sf-shop sf-cart-page">
        <div className="container">
          <CartView initialCartView={data.cartView} />
        </div>
      </section>
    </ClientShell>
  )
}
