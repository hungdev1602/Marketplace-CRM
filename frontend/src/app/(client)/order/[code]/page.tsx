import Link from "@/components/client/ShopLink"
import { AccountForm } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner, RatingStars, StarLinks } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { cx, formatPrice } from "@/lib/format"
import { makeCtx, mediaSrcSet, mediaUrl, translator } from "@/lib/view-ctx"

// Trang đơn hàng: /order/:code?key=...
// Khách chưa đăng nhập xem đơn bằng mã bí mật key trong link, khách đã đăng nhập xem được đơn của tài khoản
// Dữ liệu: hàm detail ở server/controller/client/order.controller.ts

type Props = PageProps<{ code: string }>

const load = async ({ params, searchParams }: Props) => {
  const { code } = await params
  return loadClientPage(`/order/${encodeURIComponent(code)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function OrderDetailPage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)
  const { t, tName, tCount, tWord } = translator(ctx)
  const lang = ctx.lang

  const view = data.orderView
  const order = view.order
  const delivery = order.delivery || {}
  const shipment = order.shipment || {}
  const payment = order.payment || {}
  const reviewMap: { [productId: string]: { canReview: boolean, review: any } } = data.reviewMap || {}
  const accessKey: string = data.accessKey

  const steps = [
    { id: "pending", text: t("stepCreated"), icon: "fas fa-receipt" },
    { id: "paid", text: t("stepPaid"), icon: "fas fa-credit-card" },
    { id: "shipping", text: t("stepShipping"), icon: "fas fa-truck" },
    { id: "delivered", text: t("stepDelivered"), icon: "fas fa-box-open" }
  ]
  const breadcrumb = ctx.clientAccount && order.userId == ctx.clientAccount.id
    ? [{ name: t("myOrders"), url: "/account/orders" }, { name: order.code }]
    : [{ name: order.code }]
  const unreviewedCount = order.items.filter((item: any) => reviewMap[item.productId] && reviewMap[item.productId].canReview && !reviewMap[item.productId].review).length

  // Link trang viết đánh giá của 1 sản phẩm trong đơn (giống getReviewWriteUrl ở server/helpers/review.helper.ts)
  const reviewWriteUrl = (productId: string, rating?: number) => {
    return `/review/write/${order.code}/${productId}?key=${accessKey}${rating ? `&rating=${rating}` : ""}`
  }

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={`${t("orderTitle")} ${order.code}`} breadcrumbList={breadcrumb} lang={lang}>
        <p className="sf-page-banner-sub">{t("orderFrom")} {view.createdAtFormat}</p>
      </PageBanner>
      <section className="sf-shop sf-order-page">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-8">
              <div className={`sf-account-box sf-order-status-box is-${order.status}`}>
                <div className="sf-order-status-head">
                  <span className={`sf-order-badge is-${order.status}`}>{view.statusName}</span>
                  {order.status == "shipping" && shipment.statusName && (
                    <span className="sf-order-substatus">{shipment.statusName}</span>
                  )}
                </div>

                {order.status == "pending" && (
                  <>
                    {payment.status == "canceled" ? (
                      <p className="sf-order-message is-warning">
                        <i className="fas fa-exclamation-circle"></i>
                        {t("paymentFailedText")}
                      </p>
                    ) : (
                      <p className="sf-order-message">{t("orderPendingText")}</p>
                    )}
                    {view.canPay && (
                      <>
                        <p className="sf-order-deadline">
                          <i className="far fa-clock"></i>
                          {t("payBefore")} {view.paymentExpireFormat} {t("mskTime")}
                        </p>
                        {/* Bấm "Оплатить": server tạo thanh toán và trả về link trang thanh toán của Т-Банк */}
                        <AccountForm
                          lang={lang}
                          action={`/order/${order.code}/pay`}
                          submitClassName="sf-btn sf-btn-primary sf-order-pay-btn"
                          submitLabel={<><i className="fas fa-lock"></i><span>{t("payNow")} {formatPrice(order.total)}</span></>}
                          messageAfterButton
                        >
                          <input type="hidden" name="key" value={accessKey} />
                        </AccountForm>
                      </>
                    )}
                  </>
                )}

                {order.status == "paid" && (
                  <p className="sf-order-message is-success">
                    <i className="fas fa-check-circle"></i>
                    {t("orderPaidText")}
                  </p>
                )}

                {order.status == "shipping" && (
                  <>
                    <p className="sf-order-message">{t("orderShippingText")} {view.providerName}.</p>
                    {shipment.providerNumber ? (
                      <div className="sf-tracking">
                        <span>{t("trackingNumber")}</span>
                        <b>{shipment.providerNumber}</b>
                        {shipment.trackingUrl && (
                          <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-dark sf-btn-sm">
                            {t("trackOrder")}
                            <i className="fas fa-external-link-alt"></i>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="sf-order-note">{t("trackingSoon")}</p>
                    )}
                  </>
                )}

                {order.status == "delivered" && (
                  <>
                    <p className="sf-order-message is-success">
                      <i className="fas fa-check-circle"></i>
                      {t("orderDeliveredText")}
                    </p>
                    {unreviewedCount > 0 && (
                      <a href="#order-items" className="sf-order-review-cta">
                        <i className="fas fa-star"></i>
                        <span>
                          <b>{t("reviewRateProducts")}</b>
                          {t("reviewRateProductsText")}
                        </span>
                        <i className="fas fa-chevron-down"></i>
                      </a>
                    )}
                  </>
                )}

                {order.status == "returned" && (
                  <p className="sf-order-message is-warning">
                    <i className="fas fa-undo"></i>
                    {t("orderReturnedText")}
                  </p>
                )}

                {order.status == "cancelled" && (
                  <p className="sf-order-message is-warning">
                    <i className="fas fa-times-circle"></i>
                    {payment.status == "refunded" ? t("orderRefundedText") : t("orderCancelledText")}
                  </p>
                )}

                {order.status != "cancelled" && order.status != "returned" && (
                  <ol className="sf-order-steps">
                    {steps.map((step, index) => (
                      <li key={step.id} className={cx(index <= view.stepIndex && "is-done", index == view.stepIndex && "is-current")}>
                        <span className="sf-order-step-icon"><i className={step.icon}></i></span>
                        <span>{step.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="sf-account-box" id="order-items">
                <h2>
                  {t("orderItems")}
                  <span className="sf-order-count">{tCount(order.totalQuantity, "productCount")}</span>
                </h2>
                <ul className="sf-order-items">
                  {order.items.map((item: any, index: number) => {
                    const reviewInfo = reviewMap[item.productId]
                    return (
                      <li key={`${item.productId}-${index}`}>
                        <span className="sf-order-item-img">
                          <img src={mediaUrl(ctx, item.image, 160)} srcSet={mediaSrcSet(ctx, item.image, 160)} alt="" loading="lazy" />
                        </span>
                        <div className="sf-order-item-info">
                          {item.slug ? <Link href={`/product/${item.slug}`}>{tName(item)}</Link> : <span>{tName(item)}</span>}
                          <small>{formatPrice(item.price)} × {item.quantity}</small>
                          {/* Đơn đã giao: chấm sao / sửa đánh giá của từng sản phẩm */}
                          {reviewInfo && reviewInfo.canReview && (
                            <div className="sf-order-item-review">
                              {reviewInfo.review ? (
                                <>
                                  <RatingStars rating={reviewInfo.review.rating} size="sm" lang={lang} />
                                  <Link href={reviewWriteUrl(item.productId)}>
                                    <i className="fas fa-pen"></i>
                                    {t("reviewEditAction")}
                                  </Link>
                                </>
                              ) : (
                                <>
                                  <StarLinks urlList={[1, 2, 3, 4, 5].map(star => reviewWriteUrl(item.productId, star))} lang={lang} />
                                  <Link href={reviewWriteUrl(item.productId)}>{t("reviewRateAction")}</Link>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <b>{formatPrice(item.lineTotal)}</b>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            <div className="col-lg-4">
              <aside className="sf-account-card sf-order-side">
                <h3>{t("delivery")}</h3>
                <dl className="sf-order-info">
                  <div>
                    <dt>{t("deliveryMethod")}</dt>
                    <dd>{view.deliveryTypeName}</dd>
                  </div>
                  <div>
                    <dt>{t("deliveryService")}</dt>
                    <dd>
                      {view.providerName}
                      {delivery.tariffName && <small>{delivery.tariffName}</small>}
                    </dd>
                  </div>
                  {delivery.type == "point" && delivery.point ? (
                    <div>
                      <dt>{t("pickupPoint")}</dt>
                      <dd>
                        {delivery.point.address}
                        {delivery.point.timetable && <small>{delivery.point.timetable}</small>}
                      </dd>
                    </div>
                  ) : (
                    <div>
                      <dt>{t("deliveryAddress")}</dt>
                      <dd>{delivery.address}</dd>
                    </div>
                  )}
                  {delivery.daysMax ? (
                    <div>
                      <dt>{t("deliveryTime")}</dt>
                      <dd>
                        {delivery.daysMin && delivery.daysMin != delivery.daysMax
                          ? `${delivery.daysMin}–${delivery.daysMax} ${tWord(delivery.daysMax, "dayCount")}`
                          : `${delivery.daysMax} ${tWord(delivery.daysMax, "dayCount")}`}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t("recipient")}</dt>
                    <dd>
                      {order.customer?.fullName}
                      <small>{order.customer?.phone}</small>
                      <small>{order.customer?.email}</small>
                    </dd>
                  </div>
                  {delivery.comment && (
                    <div>
                      <dt>{t("deliveryComment")}</dt>
                      <dd>{delivery.comment}</dd>
                    </div>
                  )}
                </dl>

                <h3>{t("paymentTitle")}</h3>
                <dl className="sf-summary-list">
                  <div>
                    <dt>{t("itemsTotal")}</dt>
                    <dd>{formatPrice(order.oldSubtotal || order.subtotal)}</dd>
                  </div>
                  {order.oldSubtotal > order.subtotal && (
                    <div className="is-discount">
                      <dt>{t("productDiscount")}</dt>
                      <dd>−{formatPrice(order.oldSubtotal - order.subtotal)}</dd>
                    </div>
                  )}
                  {order.couponDiscount > 0 && (
                    <div className="is-discount">
                      <dt>{t("coupon")} {order.couponCode}</dt>
                      <dd>−{formatPrice(order.couponDiscount)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{t("delivery")}</dt>
                    <dd>
                      {order.deliveryCost > 0 ? formatPrice(order.deliveryCost) : <span className="sf-free">{t("free")}</span>}
                    </dd>
                  </div>
                </dl>
                <div className="sf-summary-total">
                  <span>{t("total")}</span>
                  <b>{formatPrice(order.total)}</b>
                </div>
                <p className="sf-order-payment-status">
                  {t("paymentStatus")}: <b className={`is-${payment.status}`}>{view.paymentStatusName}</b>
                </p>
                {view.paidAtFormat && <p className="sf-order-note">{t("paidAt")} {view.paidAtFormat}</p>}
                {/* Khách chưa đăng nhập: nhắc lưu lại link này để xem đơn hàng */}
                {!ctx.clientAccount && (
                  <p className="sf-order-save-link">
                    <i className="far fa-bookmark"></i>
                    {t("orderSaveLink")}
                  </p>
                )}
              </aside>
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
