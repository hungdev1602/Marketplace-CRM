import Link from "next/link"
import { ClampText } from "@/components/client/ClampText"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner, RatingStars, StarLinks } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Đánh giá của tôi: /account/reviews
// - Sản phẩm đã nhận hàng, chờ đánh giá
// - Các đánh giá đã viết (trạng thái duyệt, trả lời của cửa hàng)
// Dữ liệu: hàm accountReviews ở server/controller/client/review.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/reviews", await searchParams)
  return clientMetadata(data)
}

export default async function AccountReviewsPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/reviews", await searchParams)
  const ctx = makeCtx(data)
  const { t, tName, tCount } = translator(ctx)
  const lang = ctx.lang
  const waitingViewList: any[] = data.waitingViewList || []
  const myReviewViewList: any[] = data.myReviewViewList || []

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("myReviews")} breadcrumbList={[{ name: t("myAccount"), url: "/account" }, { name: t("myReviews") }]} lang={lang} />
      <section className="sf-shop sf-account-page">
        <div className="container">
          <div className="sf-account-reviews">
            <div className="sf-account-box">
              <h2>
                {t("reviewWaitingTitle")}
                {waitingViewList.length > 0 && <span className="sf-order-count">{tCount(waitingViewList.length, "productCount")}</span>}
              </h2>
              {waitingViewList.length == 0 ? (
                <p className="sf-muted">{t("reviewWaitingEmpty")}</p>
              ) : (
                <ul className="sf-review-waiting">
                  {waitingViewList.map((waiting, index) => (
                    <li key={index}>
                      <Link href={`/product/${waiting.product.slug}`} className="sf-order-item-img">
                        <img src={mediaUrl(ctx, waiting.product.cardImage || waiting.item.image)} alt="" loading="lazy" />
                      </Link>
                      <div className="sf-review-waiting-info">
                        <Link href={`/product/${waiting.product.slug}`}>{tName(waiting.product)}</Link>
                        <small>{t("orderTitle")} {waiting.order.code}</small>
                        <StarLinks urlList={waiting.starUrls} lang={lang} />
                      </div>
                      <Link href={waiting.writeUrl} className="sf-btn sf-btn-dark sf-btn-sm">{t("reviewRateAction")}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sf-account-box">
              <h2>
                {t("myReviews")}
                {myReviewViewList.length > 0 && <span className="sf-order-count">{myReviewViewList.length}</span>}
              </h2>
              {myReviewViewList.length == 0 ? (
                <p className="sf-muted">{t("reviewMineEmpty")}</p>
              ) : (
                <ul className="sf-my-reviews">
                  {myReviewViewList.map(view => {
                    const review = view.review
                    return (
                      <li className="sf-my-review" key={review.id}>
                        <div className="sf-my-review-head">
                          {view.product && (
                            <Link href={`/product/${view.product.slug}`} className="sf-order-item-img">
                              <img src={mediaUrl(ctx, view.product.cardImage)} alt="" loading="lazy" />
                            </Link>
                          )}
                          <div className="sf-my-review-title">
                            {view.product
                              ? <Link href={`/product/${view.product.slug}#reviews`}>{tName(view.product)}</Link>
                              : <b>{t("reviewProductDeleted")}</b>}
                            <span>
                              <RatingStars rating={review.rating} size="sm" lang={lang} />
                              <small>{view.dateText}</small>
                            </span>
                          </div>
                          <span className={`sf-review-badge is-${review.status}`}>{view.statusName}</span>
                        </div>
                        {review.status == "rejected" && (
                          <p className="sf-order-message is-warning">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>
                              {t("reviewRejectedText")}
                              {review.rejectReason && `: ${review.rejectReason}`}. {t("reviewRejectedHint")}
                            </span>
                          </p>
                        )}
                        {(review.pros || review.cons || review.comment) && (
                          <ClampText moreLabel={t("reviewReadMore")}>
                            {review.pros && (
                              <div className="sf-review-block">
                                <h4>{t("reviewPros")}</h4>
                                <p>{review.pros}</p>
                              </div>
                            )}
                            {review.cons && (
                              <div className="sf-review-block">
                                <h4>{t("reviewCons")}</h4>
                                <p>{review.cons}</p>
                              </div>
                            )}
                            {review.comment && (
                              <div className="sf-review-block">
                                <h4>{t("reviewComment")}</h4>
                                <p>{review.comment}</p>
                              </div>
                            )}
                          </ClampText>
                        )}
                        {review.photos && review.photos.length > 0 && (
                          <ul className="sf-review-photos">
                            {review.photos.map((photo: string) => (
                              <li key={photo}>
                                <span>
                                  <img src={mediaUrl(ctx, photo)} alt="" loading="lazy" />
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {review.reply && review.reply.text && (
                          <div className="sf-review-reply">
                            <div className="sf-review-reply-head">
                              <b>
                                <i className="fas fa-store"></i>
                                {t("reviewShopReply")}
                              </b>
                              {view.replyDateText && <span>{view.replyDateText}</span>}
                            </div>
                            <p>{review.reply.text}</p>
                          </div>
                        )}
                        {view.canEdit && (
                          <div className="sf-my-review-actions">
                            <Link href={view.editUrl} className="sf-btn sf-btn-outline sf-btn-sm">
                              <i className="fas fa-pen"></i>
                              {t("reviewEditAction")}
                            </Link>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
