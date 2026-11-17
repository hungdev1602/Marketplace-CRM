import { CardHeader } from "@/components/admin/ui"
import { ProductForm } from "@/components/admin/views/ProductForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo sản phẩm: /admin/product/create

type Props = AdminPageProps

const path = "/product/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ProductCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ProductForm categoryList={data.categoryList || []} options={data.options || {}} receiptVatNone={Boolean(data.receiptVatNone)} />
      </div>
    </div>
  ))
}
