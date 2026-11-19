import Link from "next/link"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner, Pagination, ProductCard } from "@/components/client/common"
import { ProductFilter, SortSelect } from "@/components/client/ProductFilter"
import { SearchHistoryAdd } from "@/components/client/SearchBox"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang danh sách sản phẩm: /products (tất cả, tìm kiếm) và /category/:slug
// Dữ liệu: hàm list ở server/controller/client/product.controller.ts
export function ProductListView({ data }: { data: any }) {
  const ctx = makeCtx(data)
  const { t, tName, tCount } = translator(ctx)
  const { category, keyword, searchInfo, formAction, filter, hasFilter, pagination } = data
  const categoryPath: any[] = data.categoryPath || []
  const subCategoryList: any[] = data.subCategoryList || []
  const productList: any[] = data.productList || []
  const recommendList: any[] = data.recommendList || []
  const popularQueryList: string[] = data.popularQueryList || []

  // Đường dẫn (breadcrumb): Trang chủ > Sản phẩm > Danh mục cha > Danh mục con
  const breadcrumbList: { name: string, url?: string }[] = [{ name: t("products"), url: "/products" }]
  categoryPath.forEach((item, index) => {
    breadcrumbList.push({ name: tName(item), url: index < categoryPath.length - 1 ? `/category/${item.slug}` : "" })
  })
  if(!category && keyword) breadcrumbList.push({ name: t("searchResult") })
  if(!category && !keyword) breadcrumbList[0].url = ""

  // Danh mục chọn ở ô tìm kiếm (/products?keyword=...&category=slug) được giữ lại khi lọc, sắp xếp
  const searchCategorySlug: string = category && !formAction.startsWith("/category/") ? category.slug : ""
  const buildSearchUrl = (params: { [key: string]: string }) => {
    const urlParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => { if(value) urlParams.set(key, value) })
    const text = urlParams.toString()
    return formAction + (text ? `?${text}` : "")
  }
  // Từ khoá đã được sửa (gõ nhầm bàn phím, sai chính tả) thì lọc / sắp xếp theo từ khoá đúng
  const searchKeyword: string = searchInfo ? searchInfo.keyword : keyword
  const resetUrl = buildSearchUrl({ keyword: searchKeyword, category: searchCategorySlug })

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={data.title} breadcrumbList={breadcrumbList} lang={ctx.lang}>
        {searchInfo && searchInfo.corrected ? (
          <>
            <p className="sf-page-banner-sub sf-search-corrected">
              {t("searchCorrected")}{" "}
              <Link href={buildSearchUrl({ keyword: searchInfo.keyword, category: searchCategorySlug })}>«{searchInfo.keyword}»</Link>
            </p>
            <p className="sf-search-typed">
              {t("searchYouTyped")} «{keyword}»
              {searchInfo.reason == "layout" && ` — ${t("searchWrongLayout")}`}
            </p>
          </>
        ) : keyword ? (
          <p className="sf-page-banner-sub">{t("searchFor")} «{keyword}»</p>
        ) : null}
      </PageBanner>

      <section className="sf-shop">
        {/* Lưu từ khoá vừa tìm vào lịch sử tìm kiếm trên trình duyệt của khách */}
        {searchInfo && <SearchHistoryAdd keyword={searchInfo.keyword} />}
        <div className="container">
          {category && category.description && (
            <div className="sf-category-desc" dangerouslySetInnerHTML={{ __html: category.description }}></div>
          )}
          {subCategoryList.length > 0 && (
            <div className="sf-chip-list">
              <span className="sf-chip-label">{t("subcategories")}:</span>
              {subCategoryList.map(item => (
                <Link key={item.id} href={`/category/${item.slug}`} className="sf-chip">{tName(item)}</Link>
              ))}
            </div>
          )}
          <div className="row">
            <div className="col-xl-3 col-lg-4">
              <ProductFilter
                lang={ctx.lang}
                formAction={formAction}
                keyword={keyword ? searchKeyword : ""}
                searchCategorySlug={searchCategorySlug}
                resetUrl={resetUrl}
                hasFilter={Boolean(hasFilter)}
                filter={filter}
                category={category ? { id: category.id } : null}
                categoryPath={categoryPath.map(item => ({ id: item.id }))}
                categoryTree={ctx.categoryTree}
                originFilterList={data.originFilterList || []}
                storageList={ctx.productOptions.storageList || []}
                dietTagList={ctx.productOptions.dietTagList || []}
              />
            </div>
            <div className="col-xl-9 col-lg-8">
              <div className="sf-shop-toolbar">
                <p>
                  {t("found")}: <b>{tCount(pagination.totalRecord, "productCount")}</b>
                </p>
                <SortSelect
                  lang={ctx.lang}
                  sortList={(data.sortList || []).map((item: any) => ({ id: item.id, key: item.key }))}
                  sort={data.sort || ""}
                />
              </div>
              {productList.length > 0 ? (
                <>
                  <div className="sf-product-grid">
                    {productList.map(product => (
                      <ProductCard key={product.id} product={product} ctx={ctx} />
                    ))}
                  </div>
                  <Pagination pagination={pagination} lang={ctx.lang} />
                </>
              ) : (
                <>
                  <div className="sf-empty">
                    <i className="fas fa-search"></i>
                    <h3>{t("noProducts")}</h3>
                    <p>{keyword && !hasFilter ? t("searchNoResultText") : t("noProductsText")}</p>
                    {hasFilter && <Link href={resetUrl} className="sf-btn sf-btn-primary">{t("filterReset")}</Link>}
                    {popularQueryList.length > 0 && (
                      <div className="sf-chip-list sf-search-try">
                        <span className="sf-chip-label">{t("searchTryPopular")}:</span>
                        {popularQueryList.map(item => (
                          <Link key={item} href={`/products?keyword=${encodeURIComponent(item)}`} className="sf-chip">{item}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {recommendList.length > 0 && (
                    <>
                      <h2 className="sf-search-recommend-title">{t("searchRecommend")}</h2>
                      <div className="sf-product-grid">
                        {recommendList.map(product => (
                          <ProductCard key={product.id} product={product} ctx={ctx} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
