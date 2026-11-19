import Link from "next/link"
import { ReviewForm } from "@/components/client/ReviewForm"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Trang viết / sửa đánh giá sản phẩm: /review/write/:code/:productId?key=...&rating=5
// Chỉ khách đã nhận đơn hàng có sản phẩm này mới viết được
// Dữ liệu: hàm write ở server/controller/client/review.controller.ts

type Props = PageProps<{ code: string, productId: string }>

const load = async ({ params, searchParams }: Props) => {
  const { code, productId } = await params
  return loadClientPage(`/review/write/${encodeURIComponent(code)}/${encodeURIComponent(productId)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function ReviewWritePage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const { review, order, product } = data
  const isEdit = !!review
  const title = t(isEdit ? "reviewEditTitle" : "reviewWriteTitle")

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner
        title={title}
        breadcrumbList={[{ name: `${t("orderTitle")} ${order.code}`, url: data.orderUrl }, { name: title }]}
        lang={ctx.lang}
      />
      <section className="sf-shop sf-review-page">
        <div className="container">
          <div className="sf-review-layout">
            <div className="sf-account-box sf-review-product">
              <span className="sf-order-item-img">
                <img src={mediaUrl(ctx, data.productImage)} alt="" />
              </span>
              <div>
                {product && product.status == "active"
                  ? <Link href={`/product/${product.slug}`}>{data.productName}</Link>
                  : <b>{data.productName}</b>}
                <small>{t("orderTitle")} {order.code} · {data.orderDateText}</small>
              </div>
            </div>

            {data.blockedKey ? (
              // Không viết được: đơn chưa giao, đã quá hạn sửa,...
              <div className="sf-account-box">
                <p className="sf-order-message is-warning">
                  <i className="fas fa-exclamation-circle"></i>
                  {t(data.blockedKey)}
                </p>
                <Link href={data.backUrl} className="sf-btn sf-btn-dark">
                  <i className="fas fa-arrow-left"></i>
                  {t("back")}
                </Link>
              </div>
            ) : (
              <ReviewForm
                lang={ctx.lang}
                fileUrl={ctx.fileUrl}
                formAction={data.formAction}
                accessKey={data.accessKey || ""}
                review={review ? {
                  status: review.status,
                  rejectReason: review.rejectReason,
                  pros: review.pros,
                  cons: review.cons,
                  comment: review.comment,
                  photos: review.photos,
                  anonymous: review.anonymous
                } : null}
                statusName={data.statusName || ""}
                initialRating={Number(data.rating) || 0}
                authorName={data.authorName || ""}
                limits={data.limits}
                moderation={Boolean(data.moderation)}
                editUntilText={data.editUntilText || ""}
              />
            )}
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
