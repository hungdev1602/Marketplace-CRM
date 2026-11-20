// Các khối giao diện nhỏ dùng lại ở nhiều trang khách hàng (giống các mixin trong server/views/client/mixins)
// Không có "use client": dùng được ở cả server component và client component
import Link from "@/components/client/ShopLink"
import { cx, formatNumber, htmlToText } from "@/lib/format"
import { mediaSrcSet, mediaUrl, translator, type ViewCtx } from "@/lib/view-ctx"
import { CartControl } from "./CartControl"
import { WishlistButton } from "./WishlistButton"

type Ctx = Pick<ViewCtx, "lang" | "fileUrl" | "productOptions" | "clientAccount">

// Thẻ sản phẩm (trang chủ, danh sách sản phẩm, sản phẩm tương tự, yêu thích)
// product có thêm thông tin từ addProductDisplayInfo (server/helpers/client-product.helper.ts)
export function ProductCard({ product, ctx }: { product: any, ctx: Ctx }) {
  const { t, tName, tOption, tCount } = translator(ctx)
  const productName = tName(product)
  const productUrl = `/product/${product.slug}`
  const inStock = product.stock > 0

  const metaList: string[] = []
  if(product.netWeight) metaList.push(`${formatNumber(product.netWeight)} ${tOption(ctx.productOptions.netWeightUnitList, product.netWeightUnit)}`)
  if(product.origin && product.origin != "other") metaList.push(tOption(ctx.productOptions.originList, product.origin))

  return (
    <div className={cx("sf-product-card", !inStock && "is-out")}>
      <Link href={productUrl} className="sf-product-img">
        <img src={mediaUrl(ctx, product.cardImage, 320)} srcSet={mediaSrcSet(ctx, product.cardImage, 320)} alt={productName} loading="lazy" decoding="async" />
        <ul className="sf-badges">
          {product.discountPercent ? <li className="sf-badge sf-badge-sale">−{product.discountPercent}%</li> : null}
          {product.newArrival && <li className="sf-badge sf-badge-new">{t("badgeNew")}</li>}
          {product.featured && <li className="sf-badge sf-badge-hit">{t("badgeHit")}</li>}
        </ul>
        {(product.storageType == "frozen" || product.storageType == "chilled") && (
          <span
            className={`sf-storage-icon sf-storage-${product.storageType}`}
            title={tOption(ctx.productOptions.storageList, product.storageType)}
          >
            <i className={product.storageType == "frozen" ? "fas fa-snowflake" : "fas fa-thermometer-quarter"}></i>
          </span>
        )}
        {!inStock && <span className="sf-out-label">{t("outOfStock")}</span>}
      </Link>
      {/* Nút ♡ ở góc trên bên phải ảnh (đặt ngoài link ảnh để bấm không mở trang sản phẩm) */}
      <WishlistButton product={{ id: product.id, name: product.name, nameRu: product.nameRu }} />
      <div className="sf-product-body">
        {product.brand && <p className="sf-product-brand">{product.brand}</p>}
        <Link href={productUrl} className="sf-product-title">{productName}</Link>
        {/* Số sao (giống Wildberries: ★ 4,8 · 12 оценок) */}
        {product.ratingCount > 0 && (
          <Link
            href={`${productUrl}#reviews`}
            className="sf-card-rating"
            aria-label={`${t("reviewStarsLabel")} ${formatNumber(product.rating)} ${t("ratingOutOf")}, ${tCount(product.ratingCount, "ratingCount")}`}
          >
            <i className="fas fa-star"></i>
            <b>{formatNumber(product.rating)}</b>
            <span>· {tCount(product.ratingCount, "ratingCount")}</span>
          </Link>
        )}
        {metaList.length > 0 && <p className="sf-product-meta">{metaList.join(" · ")}</p>}
        <div className={cx("sf-product-price", product.discountPercent && "is-sale")}>
          <span className="sf-price">{product.priceFormat}</span>
          {product.discountPercent ? <del>{product.priceOldFormat}</del> : null}
        </div>
        <CartControl product={{ id: product.id, stock: product.stock, name: product.name, nameRu: product.nameRu }} />
      </div>
    </div>
  )
}

// Ngôi sao hiển thị điểm đánh giá (0-5, có số lẻ, ví dụ 4,3 sao tô 86%), vẽ bằng CSS (.sf-stars)
// - size: "sm" (thẻ sản phẩm, danh sách), "lg" (tổng quan ở trang sản phẩm), để trống là cỡ thường
export function RatingStars({ rating, size, lang }: { rating: number, size?: "sm" | "lg", lang: string }) {
  const { t } = translator({ lang })
  const ratingValue = Math.max(0, Math.min(5, Number(rating) || 0))
  return (
    <span
      className={cx("sf-stars", size && `sf-stars-${size}`)}
      role="img"
      aria-label={`${t("reviewStarsLabel")} ${formatNumber(ratingValue)} ${t("ratingOutOf")}`}
    >
      <span className="sf-stars-fill" style={{ width: `${ratingValue / 5 * 100}%` }}></span>
    </span>
  )
}

// 5 ngôi sao bấm được (trang đơn hàng, "Мои отзывы"): bấm sao nào thì mở trang viết đánh giá chọn sẵn số sao đó
// - urlList: link của 1 sao, 2 sao, ..., 5 sao
// Thẻ a xếp ngược (5 => 1) và hiện từ phải sang trái (CSS row-reverse) để rê chuột tô được các sao bên trái
export function StarLinks({ urlList, lang }: { urlList: string[], lang: string }) {
  const { t } = translator({ lang })
  return (
    <span className="sf-star-links">
      {[5, 4, 3, 2, 1].map(star => (
        <Link
          key={star}
          href={urlList[star - 1]}
          title={t(`ratingHint${star}`)}
          aria-label={`${t("reviewRateAction")}: ${star} ${t("ratingOutOf")}`}
        >
          <i className="fas fa-star"></i>
        </Link>
      ))}
    </span>
  )
}

// Phân trang, link các trang server tạo sẵn (buildClientPagination ở server/helpers/pagination.helper.ts)
export function Pagination({ pagination, lang }: { pagination: any, lang: string }) {
  const { t } = translator({ lang })
  if(!pagination || !(pagination.totalPage > 1)) return null

  return (
    <nav className="pagination_area sf-pagination" aria-label="pagination">
      <ul className="pagination justify-content-center">
        <li className="page-item">
          {pagination.prevUrl ? (
            <Link className="page-link" href={pagination.prevUrl} aria-label={t("previous")} rel="prev">
              <i className="fas fa-arrow-left"></i>
            </Link>
          ) : (
            <span className="page-link disabled"><i className="fas fa-arrow-left"></i></span>
          )}
        </li>
        {pagination.items.map((item: any, index: number) => (
          <li className="page-item" key={index}>
            {item.dots ? (
              <span className="page-link disabled">…</span>
            ) : (
              <Link
                className={cx("page-link", item.active && "active")}
                href={item.url}
                aria-current={item.active ? "page" : undefined}
              >
                {item.page}
              </Link>
            )}
          </li>
        ))}
        <li className="page-item">
          {pagination.nextUrl ? (
            <Link className="page-link" href={pagination.nextUrl} aria-label={t("next")} rel="next">
              <i className="fas fa-arrow-right"></i>
            </Link>
          ) : (
            <span className="page-link disabled"><i className="fas fa-arrow-right"></i></span>
          )}
        </li>
      </ul>
    </nav>
  )
}

// Tiêu đề trang + đường dẫn (breadcrumb) ở đầu các trang con
// - breadcrumbList: [{ name, url }], mục cuối không cần url
export function PageBanner({ title, breadcrumbList, lang, children }: {
  title: string
  breadcrumbList: { name: string, url?: string }[]
  lang: string
  children?: React.ReactNode
}) {
  const { t } = translator({ lang })
  return (
    <section className="sf-page-banner">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="sf-breadcrumb">
            <li>
              <Link href="/">
                <i className="fas fa-home"></i>
                {t("home")}
              </Link>
            </li>
            {breadcrumbList.map((item, index) => (
              <li key={index}>
                {item.url ? <Link href={item.url}>{item.name}</Link> : <span>{item.name}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{title}</h1>
        {children}
      </div>
    </section>
  )
}

// Tiêu đề mỗi mục ở trang chủ, có link "Xem tất cả" (không bắt buộc)
export function SectionHeading({ title, subtitle, viewAllUrl, lang }: {
  title: string
  subtitle?: string
  viewAllUrl?: string
  lang: string
}) {
  const { t } = translator({ lang })
  return (
    <div className="sf-section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {viewAllUrl && (
        <Link href={viewAllUrl} className="sf-view-all">
          {t("viewAll")}
          <i className="fas fa-arrow-right"></i>
        </Link>
      )}
    </div>
  )
}

// Thẻ bài viết (trang chủ, trang blog)
export function ArticleCard({ article, ctx }: { article: any, ctx: Ctx }) {
  const { t } = translator(ctx)
  const articleUrl = `/blog/${article.slug}`
  const category = article.categoryList?.[0]
  return (
    <article className="sf-article-card">
      <Link href={articleUrl} className="sf-article-img">
        <img src={mediaUrl(ctx, article.avatar, 480)} srcSet={mediaSrcSet(ctx, article.avatar, 480)} alt={article.name} loading="lazy" decoding="async" />
      </Link>
      <div className="sf-article-body">
        <p className="sf-article-meta">
          <span>
            <i className="fas fa-calendar-alt"></i>
            {article.publishedAtFormat}
          </span>
          {category && <Link href={`/blog/category/${category.slug}`}>{category.name}</Link>}
        </p>
        <Link href={articleUrl} className="sf-article-title">{article.name}</Link>
        {article.description && <p className="sf-article-desc">{htmlToText(article.description, 140)}</p>}
        <Link href={articleUrl} className="sf-read-more">
          {t("readMore")}
          <i className="fas fa-arrow-right"></i>
        </Link>
      </div>
    </article>
  )
}

// Lời nhắc ở trang giỏ hàng, yêu thích
// - Chưa đăng nhập: giỏ hàng / yêu thích mất khi tắt trình duyệt, mời đăng nhập / đăng ký (xong quay lại trang đang xem)
// - Đã đăng nhập: đã lưu trong tài khoản
export function GuestNote({ backUrl, ctx }: { backUrl: string, ctx: Ctx }) {
  const { t } = translator(ctx)
  if(ctx.clientAccount) {
    return (
      <p className="sf-saved-note">
        <i className="fas fa-check-circle"></i>
        {t("accountSavedNote")}
      </p>
    )
  }

  return (
    <div className="sf-guest-note">
      <i className="fas fa-exclamation-circle"></i>
      <div>
        <p>
          <b>{t("guestNote")}</b> {t("guestNoteAction")}
        </p>
        <div className="sf-guest-note-buttons">
          <Link href={`/account/login?next=${encodeURIComponent(backUrl)}`} className="sf-btn sf-btn-dark sf-btn-sm">{t("loginAction")}</Link>
          <Link href={`/account/register?next=${encodeURIComponent(backUrl)}`} className="sf-btn sf-btn-light sf-btn-sm">{t("registerAction")}</Link>
        </div>
      </div>
    </div>
  )
}

// Khối "Vì sao nên có tài khoản" bên cạnh form đăng nhập / đăng ký
export function AccountBenefits({ lang }: { lang: string }) {
  const { t } = translator({ lang })
  return (
    <aside className="sf-auth-benefits">
      <h2>{t("benefitTitle")}</h2>
      <ul>
        <li>
          <span className="sf-auth-benefit-icon"><i className="fas fa-shopping-basket"></i></span>
          {t("benefitSave")}
        </li>
        <li>
          <span className="sf-auth-benefit-icon"><i className="fas fa-mobile-alt"></i></span>
          {t("benefitDevices")}
        </li>
        <li>
          <span className="sf-auth-benefit-icon"><i className="fas fa-heart"></i></span>
          {t("benefitMerge")}
        </li>
      </ul>
    </aside>
  )
}
