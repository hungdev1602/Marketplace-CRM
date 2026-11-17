import { CardHeader } from "@/components/admin/ui"
import { ArticleForm } from "@/components/admin/views/ArticleForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa bài viết: /admin/article/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/article/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ArticleEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ArticleForm article={data.articleDetail} categoryList={data.categoryList || []} />
      </div>
    </div>
  ))
}
