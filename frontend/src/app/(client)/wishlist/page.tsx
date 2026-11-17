import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { WishlistView } from "@/components/client/views/WishlistView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang sản phẩm yêu thích: /wishlist
// Dữ liệu: server/controller/client/wishlist.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/wishlist", await searchParams)
  return clientMetadata(data)
}

export default async function WishlistPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/wishlist", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("wishlist")} breadcrumbList={[{ name: t("wishlist") }]} lang={ctx.lang}>
        <p className="sf-page-banner-sub">{t("wishlistSub")}</p>
      </PageBanner>
      <section className="sf-shop sf-wishlist-page">
        <div className="container">
          <WishlistView wishlistView={data.wishlistView} canAddAllToCart={Boolean(data.canAddAllToCart)} />
        </div>
      </section>
    </ClientShell>
  )
}
