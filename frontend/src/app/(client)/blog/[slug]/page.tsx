import Link from "next/link"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Trang chi tiết bài viết: /blog/:slug
// Dữ liệu: hàm detail ở server/controller/client/article.controller.ts

type Props = PageProps<{ slug: string }>

const load = async ({ params, searchParams }: Props) => {
  const { slug } = await params
  return loadClientPage(`/blog/${encodeURIComponent(slug)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function ArticleDetailPage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const { article } = data
  const categoryList: any[] = article.categoryList || []
  const latestList: any[] = data.latestList || []
  const allCategory: any[] = data.allCategory || []

  const breadcrumbList: { name: string, url?: string }[] = [{ name: t("blog"), url: "/blog" }]
  if(categoryList.length > 0) {
    breadcrumbList.push({ name: categoryList[0].name, url: `/blog/category/${categoryList[0].slug}` })
  }

  // Nội dung bài viết do admin soạn trong trình soạn thảo nên là HTML
  const contentHtml: string = article.content || article.description || ""

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={article.name} breadcrumbList={breadcrumbList} lang={ctx.lang}>
        <p className="sf-page-banner-sub">
          <i className="fas fa-calendar-alt"></i>
          {article.publishedAtFormat}
        </p>
      </PageBanner>
      <section className="sf-section sf-section-first">
        <div className="container">
          <div className="row g-4 g-xl-5">
            <div className="col-lg-8">
              <article className="sf-article-detail">
                {article.avatar && (
                  <div className="sf-article-detail-img">
                    <img src={mediaUrl(ctx, article.avatar)} alt={article.name} />
                  </div>
                )}
                {contentHtml && <div className="sf-content" dangerouslySetInnerHTML={{ __html: contentHtml }}></div>}
                {categoryList.length > 0 && (
                  <div className="sf-chip-list">
                    {categoryList.map(item => (
                      <Link key={item.slug} href={`/blog/category/${item.slug}`} className="sf-chip">{item.name}</Link>
                    ))}
                  </div>
                )}
              </article>
            </div>
            <div className="col-lg-4">
              <aside className="sf-sidebar">
                {latestList.length > 0 && (
                  <div className="sf-sidebar-box">
                    <h3>{t("latestArticles")}</h3>
                    <ul className="sf-latest-list">
                      {latestList.map(item => (
                        <li key={item.id}>
                          <Link href={`/blog/${item.slug}`} className="sf-latest-img">
                            <img src={mediaUrl(ctx, item.avatar)} alt={item.name} loading="lazy" />
                          </Link>
                          <div>
                            <Link href={`/blog/${item.slug}`}>{item.name}</Link>
                            <span>{item.publishedAtFormat}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {allCategory.length > 0 && (
                  <div className="sf-sidebar-box">
                    <h3>{t("blogCategories")}</h3>
                    <ul className="sf-sidebar-links">
                      {allCategory.map(item => (
                        <li key={item.id}>
                          <Link href={`/blog/category/${item.slug}`}>{item.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
