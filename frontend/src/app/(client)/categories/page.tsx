import Link from "next/link"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, mediaUrl, translator } from "@/lib/view-ctx"

// Trang tất cả danh mục: /categories

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/categories", await searchParams)
  return clientMetadata(data)
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/categories", await searchParams)
  const ctx = makeCtx(data)
  const { t, tName } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("allCategories")} breadcrumbList={[{ name: t("allCategories") }]} lang={ctx.lang}>
        <p className="sf-page-banner-sub">{t("allCategoriesSub")}</p>
      </PageBanner>
      <section className="sf-section sf-section-first">
        <div className="container">
          {ctx.categoryTree.length > 0 ? (
            <div className="sf-category-tree">
              {ctx.categoryTree.map(item => (
                <div className="sf-category-tree-item" key={item.id}>
                  <Link href={`/category/${item.slug}`} className="sf-category-tree-head">
                    <span className="sf-category-img">
                      {item.avatar
                        ? <img src={mediaUrl(ctx, item.avatar)} alt={tName(item)} loading="lazy" />
                        : <i className="fas fa-utensils"></i>}
                    </span>
                    <b>{tName(item)}</b>
                  </Link>
                  {item.children.length > 0 && (
                    <ul>
                      {item.children.map((child: any) => (
                        <li key={child.id}>
                          <Link href={`/category/${child.slug}`}>{tName(child)}</Link>
                          {child.children.length > 0 && (
                            <ul>
                              {child.children.map((grandChild: any) => (
                                <li key={grandChild.id}>
                                  <Link href={`/category/${grandChild.slug}`}>{tName(grandChild)}</Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="sf-empty">
              <i className="fas fa-th-large"></i>
              <p>{t("noCategories")}</p>
            </div>
          )}
        </div>
      </section>
    </ClientShell>
  )
}
