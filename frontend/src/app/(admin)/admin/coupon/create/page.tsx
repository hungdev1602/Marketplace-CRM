import { CardHeader } from "@/components/admin/ui"
import { CouponForm } from "@/components/admin/views/CouponForm"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo mã giảm giá: /admin/coupon/create

const path = "/coupon/create"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function CouponCreatePage(props: AdminPageProps) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <CouponForm categoryTree={data.categoryTree || []} options={data.options || {}} defaultStartAt={data.defaultStartAt} />
      </div>
    </div>
  ))
}
