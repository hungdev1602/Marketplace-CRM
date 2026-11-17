import Link from "next/link"
import { ClientShell } from "@/components/client/Shell"
import { ArticleCard, ProductCard, SectionHeading } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { cx, formatNumber } from "@/lib/format"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Trang chủ: /
// Dữ liệu: server/controller/client/homePage.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/", await searchParams)
  return clientMetadata(data)
}

export default async function HomePage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/", await searchParams)
  const ctx = makeCtx(data)
  const { t, tName, tWord, tCount } = translator(ctx)
  const { featuredList, saleList, newList, bestSellerList, heroProductList, originList, articleList, stats } = data

  const productGrid = (productList: any[]) => (
    <div className="sf-product-grid sf-product-grid-home">
      {productList.map(product => (
        <ProductCard key={product.id} product={product} ctx={ctx} />
      ))}
    </div>
  )

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-hero">
        <div className="container">
          <div className="sf-hero-inner">
            <div className="sf-hero-text">
              <span className="sf-hero-label">{t("heroLabel")}</span>
              <h1>{t("heroTitle")}</h1>
              <p>{t("heroText")}</p>
              <div className="sf-hero-buttons">
                <Link href="/products" className="sf-btn sf-btn-dark">
                  {t("heroButton")}
                  <i className="fas fa-arrow-right"></i>
                </Link>
                {saleList.length > 0 && (
                  <Link href="/products?onSale=1" className="sf-btn sf-btn-light">
                    <i className="fas fa-tags"></i>
                    {t("sale")}
                  </Link>
                )}
              </div>
              {stats.product > 0 && (
                <ul className="sf-hero-stats">
                  <li>
                    <b>{formatNumber(stats.product)}</b>
                    <span>{tWord(stats.product, "productCount")}</span>
                  </li>
                  {stats.category > 0 && (
                    <li>
                      <b>{formatNumber(stats.category)}</b>
                      <span>{tWord(stats.category, "categoryCount")}</span>
                    </li>
                  )}
                  {stats.country > 0 && (
                    <li>
                      <b>{formatNumber(stats.country)}</b>
                      <span>{tWord(stats.country, "countryCount")}</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className={cx("sf-hero-visual", heroProductList.length === 0 && "is-empty")}>
              {heroProductList.length > 0 ? heroProductList.map((product: any, index: number) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className={`sf-hero-product sf-hero-product-${index + 1}`}
                  title={tName(product)}
                >
                  <img src={mediaUrl(ctx, product.cardImage)} alt={tName(product)} />
                  {product.discountPercent ? <span className="sf-badge sf-badge-sale">−{product.discountPercent}%</span> : null}
                </Link>
              )) : (
                <img src="/client/assets/images/sfoodie-logo.png" alt="SFoodie" className="sf-hero-logo" />
              )}
            </div>
          </div>
        </div>
      </section>

      {ctx.categoryTree.length > 0 && (
        <section className="sf-section">
          <div className="container">
            <SectionHeading title={t("sectionCategories")} subtitle={t("sectionCategoriesSub")} viewAllUrl="/categories" lang={ctx.lang} />
            <div className="sf-category-grid">
              {ctx.categoryTree.slice(0, 12).map(item => (
                <Link key={item.id} href={`/category/${item.slug}`} className="sf-category-card">
                  <span className="sf-category-img">
                    {item.avatar
                      ? <img src={mediaUrl(ctx, item.avatar)} alt={tName(item)} loading="lazy" />
                      : <i className="fas fa-utensils"></i>}
                  </span>
                  <span className="sf-category-name">{tName(item)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredList.length > 0 && (
        <section className="sf-section">
          <div className="container">
            <SectionHeading title={t("sectionFeatured")} subtitle={t("sectionFeaturedSub")} viewAllUrl="/products" lang={ctx.lang} />
            {productGrid(featuredList)}
          </div>
        </section>
      )}

      {saleList.length > 0 && (
        <section className="sf-section sf-section-tint">
          <div className="container">
            <SectionHeading title={t("sectionSale")} subtitle={t("sectionSaleSub")} viewAllUrl="/products?onSale=1" lang={ctx.lang} />
            {productGrid(saleList)}
          </div>
        </section>
      )}

      {newList.length > 0 && (
        <section className="sf-section">
          <div className="container">
            <SectionHeading title={t("sectionNew")} subtitle={t("sectionNewSub")} viewAllUrl="/products?sort=newest" lang={ctx.lang} />
            {productGrid(newList)}
          </div>
        </section>
      )}

      {originList.length > 0 && (
        <section className="sf-section sf-section-tint">
          <div className="container">
            <SectionHeading title={t("sectionOrigin")} subtitle={t("sectionOriginSub")} lang={ctx.lang} />
            <div className="sf-origin-grid">
              {originList.map((origin: any) => (
                <Link key={origin.id} href={`/products?origin=${origin.id}`} className="sf-origin-card">
                  <span className="sf-origin-code">{origin.id}</span>
                  <span className="sf-origin-text">
                    <b>{tName(origin)}</b>
                    <span>{tCount(origin.total, "productCount")}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {bestSellerList.length > 0 && (
        <section className="sf-section">
          <div className="container">
            <SectionHeading title={t("sectionBestSeller")} subtitle={t("sectionBestSellerSub")} viewAllUrl="/products?sort=best-seller" lang={ctx.lang} />
            {productGrid(bestSellerList)}
          </div>
        </section>
      )}

      {stats.product == 0 && (
        <section className="sf-section">
          <div className="container">
            <div className="sf-empty">
              <i className="fas fa-box-open"></i>
              <h3>{t("emptyShopTitle")}</h3>
              <p>{t("emptyShopText")}</p>
            </div>
          </div>
        </section>
      )}

      {articleList.length > 0 && (
        <section className="sf-section sf-section-tint">
          <div className="container">
            <SectionHeading title={t("sectionBlog")} subtitle={t("sectionBlogSub")} viewAllUrl="/blog" lang={ctx.lang} />
            <div className="sf-article-grid">
              {articleList.map((article: any) => (
                <ArticleCard key={article.id} article={article} ctx={ctx} />
              ))}
            </div>
          </div>
        </section>
      )}
    </ClientShell>
  )
}
