import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { CheckoutView } from "@/components/client/views/CheckoutView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang đặt hàng: /checkout (giỏ hàng trống thì server chuyển về trang giỏ hàng)
// Dữ liệu: hàm index ở server/controller/client/checkout.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/checkout", await searchParams)
  return clientMetadata(data)
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/checkout", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("checkoutTitle")} breadcrumbList={[{ name: t("cart"), url: "/cart" }, { name: t("checkoutTitle") }]} lang={ctx.lang} />
      <section className="sf-shop sf-checkout-page">
        <div className="container">
          <CheckoutView
            data={{
              cartView: data.cartView,
              prefill: data.prefill,
              deliveryTypeList: data.deliveryTypeList,
              freeDelivery: Boolean(data.freeDelivery),
              freeDeliveryFrom: data.freeDeliveryFrom || 0,
              minOrderValue: data.minOrderValue || 0,
              belowMinOrder: Boolean(data.belowMinOrder),
              paymentProvider: data.paymentProvider || "",
              canOrder: Boolean(data.canOrder),
              paymentTimeoutMinutes: data.paymentTimeoutMinutes || 0,
              mapTileUrl: data.mapTileUrl || "",
              mapAttribution: data.mapAttribution || ""
            }}
          />
        </div>
      </section>
    </ClientShell>
  )
}
