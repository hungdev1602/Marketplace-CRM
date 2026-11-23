import Link from "@/components/client/ShopLink"
import { PageBanner } from "@/components/client/common"
import { PrintButton } from "@/components/client/PrintButton"
import { cx } from "@/lib/format"
import { translator, type ViewCtx } from "@/lib/view-ctx"

// Trang văn bản pháp lý: menu các văn bản (bên trái) + nội dung văn bản
// Nội dung (HTML, tiếng Nga) do server Express tạo: server/helpers/legal.helper.ts, thư mục server/helpers/legal-documents
export function LegalView({ ctx, data }: { ctx: ViewCtx, data: any }) {
  const { t } = translator(ctx)
  const doc = data.legalDoc || {}
  const docList: { slug: string, title: string, icon: string }[] = data.legalDocList || []
  const breadcrumbList = doc.slug
    ? [{ name: t("legalInfo"), url: "/legal" }, { name: doc.title }]
    : [{ name: t("legalInfo") }]
  const ruOnlyNote = t("legalRuOnly")

  return (
    <>
      <PageBanner title={doc.title} breadcrumbList={breadcrumbList} lang={ctx.lang} />
      <section className="sf-section sf-section-first sf-legal-page">
        <div className="container">
          <div className="sf-legal">
            <aside className="sf-legal-nav">
              <h2>{t("legalDocuments")}</h2>
              <ul>
                {docList.map(item => (
                  <li key={item.slug}>
                    <Link href={`/legal/${item.slug}`} className={cx(item.slug === doc.slug && "active")} aria-current={item.slug === doc.slug ? "page" : undefined}>
                      <i className={item.icon}></i>
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
            <article className="sf-legal-body">
              {(ruOnlyNote || doc.slug) && (
                <div className="sf-legal-toolbar">
                  {ruOnlyNote && (
                    <p className="sf-legal-note">
                      <i className="fas fa-info-circle"></i>
                      {ruOnlyNote}
                    </p>
                  )}
                  {doc.slug && <PrintButton label={t("legalPrint")} />}
                </div>
              )}
              {/* Văn bản luôn bằng tiếng Nga (ngôn ngữ có hiệu lực pháp lý) */}
              <div className="sf-content sf-legal-content" lang="ru" dangerouslySetInnerHTML={{ __html: doc.html || "" }}></div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
