import { CardHeader } from "@/components/admin/ui"
import { ProductForm } from "@/components/admin/views/ProductForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa sản phẩm: /admin/product/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/product/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ProductEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ProductForm product={data.productDetail} categoryList={data.categoryList || []} options={data.options || {}} receiptVatNone={Boolean(data.receiptVatNone)} />
      </div>
    </div>
  ))
}
