import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { CompareView } from "@/components/client/views/CompareView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang so sánh sản phẩm: /compare
// Dữ liệu: server/controller/client/compare.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/compare", await searchParams)
  return {
    ...clientMetadata(data),
    // Trang riêng của từng khách (danh sách trong cookie), không cần Google / Yandex lưu lại
    robots: { index: false, follow: true }
  }
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/compare", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("compare")} breadcrumbList={[{ name: t("compare") }]} lang={ctx.lang}>
        <p className="sf-page-banner-sub">{t("compareSub")}</p>
      </PageBanner>
      <section className="sf-shop sf-compare-page">
        <div className="container">
          <CompareView productList={data.productList || []} maxItems={data.compareMaxItems || 4} />
        </div>
      </section>
    </ClientShell>
  )
}
