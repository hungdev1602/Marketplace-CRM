import Link from "next/link"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner, Pagination } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { formatPrice } from "@/lib/format"
import { makeCtx, translator } from "@/lib/view-ctx"

// Đơn hàng của tôi: /account/orders
// Dữ liệu: hàm accountOrders ở server/controller/client/order.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/orders", await searchParams)
  return clientMetadata(data)
}

export default async function AccountOrdersPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/orders", await searchParams)
  const ctx = makeCtx(data)
  const { t, tCount } = translator(ctx)
  const orderViewList: any[] = data.orderViewList || []

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("myOrders")} breadcrumbList={[{ name: t("myAccount"), url: "/account" }, { name: t("myOrders") }]} lang={ctx.lang} />
      <section className="sf-shop sf-account-page">
        <div className="container">
          {orderViewList.length == 0 ? (
            <div className="sf-empty">
              <i className="fas fa-receipt"></i>
              <h3>{t("noOrdersTitle")}</h3>
              <p>{t("noOrdersText")}</p>
              <div className="sf-hero-buttons justify-content-center">
                <Link href="/products" className="sf-btn sf-btn-primary">{t("goShopping")}</Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="sf-order-list">
                {orderViewList.map(view => {
                  const order = view.order
                  return (
                    <li key={order.code}>
                      <Link href={view.orderUrl} className="sf-order-row">
                        <div className="sf-order-row-main">
                          <b>{order.code}</b>
                          <span>{view.createdAtFormat} · {tCount(order.totalQuantity, "productCount")}</span>
                          <span className="sf-order-row-delivery">
                            <i className={order.delivery?.type == "point" ? "fas fa-store" : "fas fa-truck"}></i>
                            {view.providerName}
                            {order.shipment && order.shipment.providerNumber && ` · ${order.shipment.providerNumber}`}
                          </span>
                        </div>
                        <div className="sf-order-row-side">
                          <span className={`sf-order-badge is-${order.status}`}>{view.statusName}</span>
                          <b>{formatPrice(order.total)}</b>
                        </div>
                        <i className="fas fa-chevron-right sf-order-row-arrow"></i>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <Pagination pagination={data.pagination} lang={ctx.lang} />
            </>
          )}
        </div>
      </section>
    </ClientShell>
  )
}
