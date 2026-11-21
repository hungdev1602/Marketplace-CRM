import Link from "@/components/client/ShopLink"
import { AccountForm } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { formatPrice } from "@/lib/format"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang thanh toán giả: /order/:code/test-payment?key=...
// Chỉ dùng khi thử trên máy (PAYMENT_TEST_MODE=true ở server, chưa có terminal Т-Банк)
// Dữ liệu: hàm testPayment ở server/controller/client/order.controller.ts

type Props = PageProps<{ code: string }>

const load = async ({ params, searchParams }: Props) => {
  const { code } = await params
  return loadClientPage(`/order/${encodeURIComponent(code)}/test-payment`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function TestPaymentPage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const { order } = data
  const action = `/order/${order.code}/test-payment`

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first sf-auth-page">
        <div className="container">
          <div className="sf-auth sf-test-payment">
            <div className="sf-auth-card">
              <p className="sf-test-note">
                <i className="fas fa-flask"></i>
                {t("testPaymentNote")}
              </p>
              <h1>{t("testPaymentTitle")}</h1>
              <p className="sf-auth-sub">{t("orderTitle")} {order.code}</p>
              <div className="sf-summary-total">
                <span>{t("total")}</span>
                <b>{formatPrice(order.total)}</b>
              </div>
              {data.canPay ? (
                <div className="sf-test-payment-buttons">
                  <AccountForm
                    lang={ctx.lang}
                    action={action}
                    submitClassName="sf-btn sf-btn-primary"
                    submitLabel={<><i className="fas fa-check"></i>{t("testPaySuccess")}</>}
                  >
                    <input type="hidden" name="key" value={order.accessKey} />
                    <input type="hidden" name="result" value="success" />
                  </AccountForm>
                  <AccountForm
                    lang={ctx.lang}
                    action={action}
                    submitClassName="sf-btn sf-btn-outline"
                    submitLabel={<><i className="fas fa-times"></i>{t("testPayCancel")}</>}
                  >
                    <input type="hidden" name="key" value={order.accessKey} />
                    <input type="hidden" name="result" value="cancel" />
                  </AccountForm>
                </div>
              ) : (
                <Link href={`/order/${order.code}?key=${order.accessKey}`} className="sf-btn sf-btn-dark">{t("backToOrder")}</Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
