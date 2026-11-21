import Link from "@/components/client/ShopLink"
import { CartControl } from "@/components/client/CartControl"
import { LightboxProvider } from "@/components/client/Lightbox"
import { ProductGallery, ProductTabs } from "@/components/client/ProductDetailParts"
import { ReviewSection } from "@/components/client/ReviewSection"
import { CompareButton } from "@/components/client/CompareButton"
import { ClientShell } from "@/components/client/Shell"
import { WishlistButton } from "@/components/client/WishlistButton"
import { ProductCard, RatingStars } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { formatNumber } from "@/lib/format"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Trang chi tiết sản phẩm: /product/:slug
// Dữ liệu: hàm detail ở server/controller/client/product.controller.ts

type Props = PageProps<{ slug: string }>

const load = async ({ params, searchParams }: Props) => {
  const { slug } = await params
  return loadClientPage(`/product/${encodeURIComponent(slug)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

function InfoRow({ label, value }: { label: string, value: any }) {
  if(!value) return null
  return (
    <tr>
      <th>{label}</th>
      <td>{value}</td>
    </tr>
  )
}

export default async function ProductDetailPage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)
  const { t, tName, tOption, tCount } = translator(ctx)
  const { product, productName, hasNutrition, reviewSummary } = data
  const options = ctx.productOptions
  const mediaList: any[] = data.mediaList || []
  const categoryPath: any[] = data.categoryPath || []
  const productCategoryList: any[] = data.productCategoryList || []
  const relatedList: any[] = data.relatedList || []

  const inStock = product.stock > 0
  const otherName = ctx.lang == "ru" ? product.name : product.nameRu
  const originName = product.origin ? tOption(options.originList, product.origin) : ""
  const unitName = product.unit ? tOption(options.unitList, product.unit) : ""
  const storageName = product.storageType ? tOption(options.storageList, product.storageType) : ""
  const netWeightText = product.netWeight ? `${formatNumber(product.netWeight)} ${tOption(options.netWeightUnitList, product.netWeightUnit)}` : ""
  const shelfLifeText = product.shelfLife && data.shelfLifeKey ? tCount(product.shelfLife, data.shelfLifeKey) : ""
  const allergenList: string[] = (product.allergens || []).map((id: string) => tOption(options.allergenList, id)).filter(Boolean)
  const dietTagList: string[] = (product.dietTags || []).map((id: string) => tOption(options.dietTagList, id)).filter(Boolean)
  const hasComposition = product.ingredients || allergenList.length > 0 || hasNutrition
  const hasStorage = storageName || product.storageNote || shelfLifeText || product.usageInstructions
  const hasInfo = product.manufacturer || product.importer || product.certificateNumber || product.barcode || product.markingRequired
  const hasValue = (value: any) => value !== null && value !== undefined

  const cartProduct = { id: product.id, stock: product.stock, name: product.name, nameRu: product.nameRu }

  // Nội dung các tab (mô tả sản phẩm do admin soạn trong trình soạn thảo nên là HTML)
  const tabs: { id: string, label: string, content: React.ReactNode }[] = [{
    id: "description",
    label: t("tabDescription"),
    content: product.content
      ? <div className="sf-content" dangerouslySetInnerHTML={{ __html: product.content }}></div>
      : product.description
        ? <div className="sf-content" dangerouslySetInnerHTML={{ __html: product.description }}></div>
        : <p className="sf-muted">{t("noInfo")}</p>
  }]

  if(hasComposition) {
    tabs.push({
      id: "composition",
      label: t("tabComposition"),
      content: (
        <>
          {product.ingredients && (
            <>
              <h4>{t("ingredients")}</h4>
              <p className="sf-pre-line">{product.ingredients}</p>
            </>
          )}
          {allergenList.length > 0 && (
            <>
              <h4>{t("allergens")}</h4>
              <div className="sf-chip-list">
                {allergenList.map(item => <span key={item} className="sf-chip sf-chip-warning">{item}</span>)}
              </div>
            </>
          )}
          {hasNutrition && (
            <>
              <h4>{t("nutrition")}</h4>
              <table className="sf-info-table sf-nutrition-table">
                <tbody>
                  {hasValue(product.calories) && (
                    <tr><th>{t("calories")}</th><td>{formatNumber(product.calories)} {t("kcal")}</td></tr>
                  )}
                  {hasValue(product.protein) && (
                    <tr><th>{t("protein")}</th><td>{formatNumber(product.protein)} {t("gram")}</td></tr>
                  )}
                  {hasValue(product.fat) && (
                    <tr><th>{t("fat")}</th><td>{formatNumber(product.fat)} {t("gram")}</td></tr>
                  )}
                  {hasValue(product.carbohydrate) && (
                    <tr><th>{t("carbohydrate")}</th><td>{formatNumber(product.carbohydrate)} {t("gram")}</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )
    })
  }

  if(hasStorage) {
    tabs.push({
      id: "storage",
      label: t("tabStorage"),
      content: (
        <>
          <table className="sf-info-table">
            <tbody>
              <InfoRow label={t("storage")} value={storageName} />
              <InfoRow label={t("shelfLife")} value={shelfLifeText} />
            </tbody>
          </table>
          {product.storageNote && (
            <>
              <h4>{t("storageNote")}</h4>
              <p className="sf-pre-line">{product.storageNote}</p>
            </>
          )}
          {product.usageInstructions && (
            <>
              <h4>{t("usageInstructions")}</h4>
              <p className="sf-pre-line">{product.usageInstructions}</p>
            </>
          )}
        </>
      )
    })
  }

  if(hasInfo) {
    tabs.push({
      id: "info",
      label: t("tabInfo"),
      content: (
        <table className="sf-info-table">
          <tbody>
            <InfoRow label={t("brand")} value={product.brand} />
            <InfoRow label={t("origin")} value={originName} />
            <InfoRow label={t("manufacturer")} value={product.manufacturer} />
            <InfoRow label={t("importer")} value={product.importer} />
            <InfoRow label={t("certificate")} value={product.certificateNumber} />
            <InfoRow label={t("barcode")} value={product.barcode} />
            <InfoRow label={t("marking")} value={product.markingRequired ? t("yes") : ""} />
          </tbody>
        </table>
      )
    })
  }

  return (
    <ClientShell data={data} ctx={ctx}>
      {/* Dữ liệu có cấu trúc (schema.org) cho Google / Yandex: hiện giá, còn hàng, số sao trên trang kết quả tìm kiếm */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: data.structuredDataJson }} />

      <div className="sf-breadcrumb-bar">
        <div className="container">
          <ol className="sf-breadcrumb">
            <li>
              <Link href="/">
                <i className="fas fa-home"></i>
                {t("home")}
              </Link>
            </li>
            <li><Link href="/products">{t("products")}</Link></li>
            {categoryPath.map(item => (
              <li key={item.id}><Link href={`/category/${item.slug}`}>{tName(item)}</Link></li>
            ))}
            <li><span>{productName}</span></li>
          </ol>
        </div>
      </div>

      <section className="sf-product-detail">
        <div className="container">
          <LightboxProvider lang={ctx.lang}>
            <div className="row g-4 g-xl-5">
              <div className="col-lg-6">
                <ProductGallery
                  // Ảnh lớn rộng 960px, ảnh nhỏ bên dưới 160px (server quản lý file thu nhỏ sẵn), video giữ file gốc
                  mediaList={mediaList.map(media => media.isVideo
                    ? { url: mediaUrl(ctx, media.path), isVideo: true }
                    : { url: mediaUrl(ctx, media.path, 960), thumbUrl: mediaUrl(ctx, media.path, 160), isVideo: false })}
                  posterUrl={product.cardImage ? mediaUrl(ctx, product.cardImage, 960) : ""}
                  fallbackUrl={mediaUrl(ctx, "")}
                  productName={productName}
                >
                  <ul className="sf-badges">
                    {product.discountPercent ? <li className="sf-badge sf-badge-sale">−{product.discountPercent}%</li> : null}
                    {product.newArrival && <li className="sf-badge sf-badge-new">{t("badgeNew")}</li>}
                    {product.featured && <li className="sf-badge sf-badge-hit">{t("badgeHit")}</li>}
                  </ul>
                </ProductGallery>
              </div>
              <div className="col-lg-6">
                <div className="sf-product-info">
                  {(product.brand || originName) && (
                    <p className="sf-product-info-brand">
                      {product.brand && <span>{product.brand}</span>}
                      {originName && product.origin != "other" && (
                        <span>
                          <i className="fas fa-globe-asia"></i>
                          {originName}
                        </span>
                      )}
                    </p>
                  )}
                  <h1>{productName}</h1>
                  {otherName && otherName != productName && <p className="sf-product-subname">{otherName}</p>}
                  <a href="#reviews" className="sf-product-rating">
                    {product.ratingCount > 0 ? (
                      <>
                        <RatingStars rating={product.rating} lang={ctx.lang} />
                        <b>{formatNumber(product.rating)}</b>
                        <span>{tCount(product.ratingCount, "ratingCount")}</span>
                      </>
                    ) : (
                      <>
                        <RatingStars rating={0} lang={ctx.lang} />
                        <span>{t("reviewsNone")}</span>
                      </>
                    )}
                  </a>
                  <div className="sf-stock">
                    {!inStock ? (
                      <span className="sf-stock-out">
                        <i className="fas fa-times-circle"></i>
                        {t("outOfStock")}
                      </span>
                    ) : product.isLowStock ? (
                      <span className="sf-stock-low">
                        <i className="fas fa-exclamation-circle"></i>
                        {t("lowStock")}
                      </span>
                    ) : (
                      <span className="sf-stock-in">
                        <i className="fas fa-check-circle"></i>
                        {t("inStock")}
                      </span>
                    )}
                  </div>
                  <div className="sf-detail-price">
                    <span className="sf-price">{product.priceFormat}</span>
                    {unitName && <span className="sf-price-unit">/ {unitName.toLowerCase()}</span>}
                    {product.discountPercent ? (
                      <>
                        <del>{product.priceOldFormat}</del>
                        <span className="sf-saving">{t("youSave")} {product.savingFormat}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="sf-buy-box">
                    <CartControl product={cartProduct} large />
                    <WishlistButton product={cartProduct} withText />
                  </div>
                  {/* Thêm vào trang so sánh (/compare) */}
                  <CompareButton product={cartProduct} withText />
                  {product.description && (
                    <div className="sf-product-short sf-content" dangerouslySetInnerHTML={{ __html: product.description }}></div>
                  )}
                  <ul className="sf-fact-list">
                    {netWeightText && (
                      <li>
                        <i className="fas fa-weight-hanging"></i>
                        <span>{t("netWeight")}</span>
                        <b>{netWeightText}</b>
                      </li>
                    )}
                    {storageName && (
                      <li>
                        <i className={product.storageType == "frozen" ? "fas fa-snowflake" : (product.storageType == "chilled" ? "fas fa-thermometer-quarter" : "fas fa-box")}></i>
                        <span>{t("storage")}</span>
                        <b>{storageName}</b>
                      </li>
                    )}
                    {shelfLifeText && (
                      <li>
                        <i className="fas fa-calendar-alt"></i>
                        <span>{t("shelfLife")}</span>
                        <b>{shelfLifeText}</b>
                      </li>
                    )}
                    {product.sku && (
                      <li>
                        <i className="fas fa-hashtag"></i>
                        <span>{t("sku")}</span>
                        <b>{product.sku}</b>
                      </li>
                    )}
                  </ul>
                  {dietTagList.length > 0 && (
                    <div className="sf-chip-list">
                      {dietTagList.map(tag => <span key={tag} className="sf-chip sf-chip-static">{tag}</span>)}
                    </div>
                  )}
                  {productCategoryList.length > 0 && (
                    <p className="sf-product-categories">
                      <span>{t("categories")}:</span>
                      {productCategoryList.map(item => (
                        <Link key={item.id} href={`/category/${item.slug}`}>{tName(item)}</Link>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <ProductTabs tabs={tabs} />

            <ReviewSection
              lang={ctx.lang}
              fileUrl={ctx.fileUrl}
              productId={product.id}
              rating={product.rating || 0}
              reviewCount={product.reviewCount || 0}
              reviewSummary={reviewSummary}
              reviewSortList={(data.reviewSortList || []).map((item: any) => ({ id: item.id, key: item.key }))}
              reviewViewList={data.reviewViewList || []}
              reviewResult={{ page: data.reviewResult.page, total: data.reviewResult.total, hasMore: Boolean(data.reviewResult.hasMore) }}
              reviewAction={data.reviewAction || null}
            />
          </LightboxProvider>

          {relatedList.length > 0 && (
            <div className="sf-related">
              <div className="sf-section-heading">
                <div>
                  <h2>{t("relatedProducts")}</h2>
                </div>
              </div>
              <div className="sf-product-grid sf-product-grid-home">
                {relatedList.map(item => (
                  <ProductCard key={item.id} product={item} ctx={ctx} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </ClientShell>
  )
}
