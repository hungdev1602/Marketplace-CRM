import { CardHeader } from "@/components/admin/ui"
import { ArticleCategoryForm } from "@/components/admin/views/ArticleForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa danh mục bài viết: /admin/article/category/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/article/category/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ArticleCategoryEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ArticleCategoryForm category={data.category} categoryTree={data.categoryTree || []} />
      </div>
    </div>
  ))
}
