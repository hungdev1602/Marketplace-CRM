import { CardHeader } from "@/components/admin/ui"
import { CouponForm } from "@/components/admin/views/CouponForm"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa mã giảm giá: /admin/coupon/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/coupon/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function CouponEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <CouponForm
          coupon={data.couponDetail}
          selectedProducts={(data.selectedProducts || []).map((product: any) => ({
            id: product.id,
            name: product.name,
            nameRu: product.nameRu,
            sku: product.sku,
            avatar: product.avatar,
            priceFormat: product.priceFormat,
            deleted: product.deleted
          }))}
          categoryTree={data.categoryTree || []}
          options={data.options || {}}
        />
      </div>
    </div>
  ))
}
