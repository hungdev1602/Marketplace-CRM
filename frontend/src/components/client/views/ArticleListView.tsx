import Link from "@/components/client/ShopLink"
import { ClientShell } from "@/components/client/Shell"
import { ArticleCard, PageBanner, Pagination } from "@/components/client/common"
import { cx } from "@/lib/format"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang danh sách bài viết: /blog và /blog/category/:slug
// Dữ liệu: hàm list ở server/controller/client/article.controller.ts
export function ArticleListView({ data }: { data: any }) {
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const { category, pagination } = data
  const allCategory: any[] = data.allCategory || []
  const articleList: any[] = data.articleList || []

  const breadcrumbList = category
    ? [{ name: t("blog"), url: "/blog" }, { name: category.name }]
    : [{ name: t("blog") }]

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={data.title} breadcrumbList={breadcrumbList} lang={ctx.lang}>
        {!category && <p className="sf-page-banner-sub">{t("blogSub")}</p>}
      </PageBanner>
      <section className="sf-section sf-section-first">
        <div className="container">
          {allCategory.length > 0 && (
            <div className="sf-chip-list sf-blog-categories">
              <Link href="/blog" className={cx("sf-chip", !category && "active")}>{t("allArticles")}</Link>
              {allCategory.map(item => (
                <Link
                  key={item.id}
                  href={`/blog/category/${item.slug}`}
                  className={cx("sf-chip", category && category.id == item.id && "active")}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}
          {articleList.length > 0 ? (
            <>
              <div className="sf-article-grid">
                {articleList.map(article => (
                  <ArticleCard key={article.id} article={article} ctx={ctx} />
                ))}
              </div>
              <Pagination pagination={pagination} lang={ctx.lang} />
            </>
          ) : (
            <div className="sf-empty">
              <i className="fas fa-newspaper"></i>
              <p>{t("noArticles")}</p>
            </div>
          )}
        </div>
      </section>
    </ClientShell>
  )
}
