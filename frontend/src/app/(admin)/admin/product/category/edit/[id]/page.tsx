import { CardHeader } from "@/components/admin/ui"
import { ProductCategoryForm } from "@/components/admin/views/ProductForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa danh mục sản phẩm: /admin/product/category/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/product/category/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ProductCategoryEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ProductCategoryForm category={data.categoryDetail} categoryTree={data.categoryTree || []} />
      </div>
    </div>
  ))
}
