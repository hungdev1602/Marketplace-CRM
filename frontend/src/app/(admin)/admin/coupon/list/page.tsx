import { DeleteButton, EditLink, HeaderLink } from "@/components/admin/list"
import { AdminPagination, ApiButton, CardHeader, CopyButton, EmptyRow, FilterForm } from "@/components/admin/ui"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh sách mã giảm giá: /admin/coupon/list
// Dữ liệu: hàm list ở server/controller/admin/coupon.controller.ts

const path = "/coupon/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function CouponListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const couponList: any[] = data.couponList || []
    const filter = data.filter || {}
    const options = data.options || {}

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("coupon-trash") && <HeaderLink href="/coupon/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("coupon-create") && <HeaderLink href="/coupon/create" icon="fa-solid fa-plus">Tạo mã giảm giá</HeaderLink>}
            </CardHeader>
            <div className="card-body pt-0">
              <FilterForm className="row g-2 align-items-end mb-3">
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filterKeyword">Từ khoá</label>
                  <input className="form-control" id="filterKeyword" type="text" name="keyword" placeholder="Mã giảm giá, tên chương trình..." defaultValue={filter.keyword} />
                </div>
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filterStatus">Trạng thái</label>
                  <select className="form-select" id="filterStatus" name="status" defaultValue={filter.status || ""}>
                    <option value="">-- Tất cả trạng thái --</option>
                    {(options.statusList || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filterDiscountType">Loại giảm giá</label>
                  <select className="form-select" id="filterDiscountType" name="discountType" defaultValue={filter.discountType || ""}>
                    <option value="">-- Tất cả --</option>
                    {(options.typeList || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-lg-2">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <a className="btn btn-secondary" href={adminUrl("/coupon/list")}>Xoá lọc</a>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} mã giảm giá</p>
            </div>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Mã giảm giá</th>
                    <th>Mức giảm</th>
                    <th>Điều kiện</th>
                    <th>Thời gian (giờ Moscow)</th>
                    <th className="text-center">Lượt dùng</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {couponList.length > 0 ? couponList.map((item, index) => {
                    const nameList: string[] = item.applyToNameList || []
                    return (
                      <tr key={item.id}>
                        <td>{data.pagination.skip + index + 1}</td>
                        <td style={{ minWidth: "200px" }}>
                          <div>
                            <span className="fw-bold font-monospace fs-6 me-1">{item.code}</span>
                            <CopyButton content={item.code} title="Copy mã"><i className="fa-regular fa-copy text-secondary"></i></CopyButton>
                          </div>
                          <div className="small">{item.name}</div>
                          {item.description && <div className="small text-muted">{item.description}</div>}
                        </td>
                        <td className="text-nowrap">{item.discountText}</td>
                        <td style={{ minWidth: "200px" }}>
                          <div className="small">
                            {item.minOrderValue ? `Đơn từ ${item.minOrderValueFormat}` : <span className="text-muted">Không yêu cầu đơn tối thiểu</span>}
                          </div>
                          <div className="small">
                            {item.applyTo == "category" ? (
                              `Danh mục: ${nameList.join(", ")}`
                            ) : item.applyTo == "product" ? (
                              <>
                                Sản phẩm: {nameList.slice(0, 3).join(", ")}
                                {nameList.length > 3 && <span className="text-muted"> và {nameList.length - 3} sản phẩm khác</span>}
                              </>
                            ) : item.discountType != "free-shipping" ? (
                              <span className="text-muted">Tất cả sản phẩm</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="small text-nowrap">
                          <div>Từ: {item.startAtFormat}</div>
                          {item.endAt ? <div>Đến: {item.endAtFormat}</div> : <div className="text-muted">Không hết hạn</div>}
                        </td>
                        <td className="text-center text-nowrap">
                          <div>
                            <span className="fw-medium">{item.usedCount}</span>
                            <span className="text-muted"> / {item.usageLimit || "∞"}</span>
                          </div>
                          {item.usageLimitPerCustomer ? <div className="small text-muted">Mỗi khách: {item.usageLimitPerCustomer} lần</div> : null}
                        </td>
                        <td>{item.statusInfo && <span className={`badge ${item.statusInfo.color}`}>{item.statusInfo.name}</span>}</td>
                        <td className="text-end text-nowrap">
                          {can("coupon-edit") && (
                            <>
                              <ApiButton api={`/coupon/change-status/${item.id}`} method="PATCH" style={{ margin: "5px" }} title={item.status == "active" ? "Tạm dừng" : "Bật lại"}>
                                {item.status == "active"
                                  ? <i className="fa-solid fa-pause text-secondary" style={{ fontSize: "1.2rem" }}></i>
                                  : <i className="fa-solid fa-play text-success" style={{ fontSize: "1.2rem" }}></i>}
                              </ApiButton>
                              <EditLink href={`/coupon/edit/${item.id}`} />
                            </>
                          )}
                          {can("coupon-delete") && <DeleteButton api={`/coupon/delete/${item.id}`} />}
                        </td>
                      </tr>
                    )
                  }) : <EmptyRow colSpan={8} />}
                </tbody>
              </table>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
