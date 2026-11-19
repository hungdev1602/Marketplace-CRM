import { CardHeader } from "@/components/admin/ui"
import { ArticleForm } from "@/components/admin/views/ArticleForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo bài viết: /admin/article/create

type Props = AdminPageProps

const path = "/article/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ArticleCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ArticleForm categoryList={data.categoryList || []} />
      </div>
    </div>
  ))
}
