import { CardHeader } from "@/components/admin/ui"
import { ProductCategoryForm } from "@/components/admin/views/ProductForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo danh mục sản phẩm: /admin/product/category/create

type Props = AdminPageProps

const path = "/product/category/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ProductCategoryCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ProductCategoryForm categoryTree={data.categoryTree || []} />
      </div>
    </div>
  ))
}
