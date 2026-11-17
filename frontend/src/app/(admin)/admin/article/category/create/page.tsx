import { CardHeader } from "@/components/admin/ui"
import { ArticleCategoryForm } from "@/components/admin/views/ArticleForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo danh mục bài viết: /admin/article/category/create

type Props = AdminPageProps

const path = "/article/category/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ArticleCategoryCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ArticleCategoryForm categoryTree={data.categoryTree || []} />
      </div>
    </div>
  ))
}
