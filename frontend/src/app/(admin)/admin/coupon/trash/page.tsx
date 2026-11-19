import { BackLink, TrashActions } from "@/components/admin/list"
import { CardHeader, EmptyRow } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác mã giảm giá: /admin/coupon/trash

const path = "/coupon/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function CouponTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const couponList: any[] = data.couponList || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <BackLink href="/coupon/list" />
            </CardHeader>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Mã giảm giá</th>
                    <th>Mức giảm</th>
                    <th className="text-center">Đã dùng</th>
                    <th>Thời gian xoá (giờ Moscow)</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {couponList.length > 0 ? couponList.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="fw-bold font-monospace">{item.code}</div>
                        <div className="small">{item.name}</div>
                      </td>
                      <td className="text-nowrap">{item.discountText}</td>
                      <td className="text-center">{item.usedCount}</td>
                      <td className="text-nowrap">{item.deletedAtFormat}</td>
                      <td className="text-end text-nowrap">
                        <TrashActions undoApi={`/coupon/undo/${item.id}`} deleteApi={`/coupon/delete-permanently/${item.id}`} />
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={6} text="Thùng rác trống" />}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  })
}
