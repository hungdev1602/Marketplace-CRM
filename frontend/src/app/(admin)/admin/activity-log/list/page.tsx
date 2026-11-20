import { AdminPagination, FilterForm } from "@/components/admin/ui"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"
import { AdminLink } from "@/components/admin/AdminLink"

// Nhật ký hoạt động: /admin/activity-log/list (chỉ Super Admin xem được)
// Dữ liệu: server/controller/admin/activity-log.controller.ts

const path = "/activity-log/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ActivityLogPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const logList: any[] = data.logList || []
    const filter = data.filter || {}
    const select = (name: string, label: string, emptyLabel: string, list: any[], className: string, render?: (item: any) => string) => (
      <div className={className}>
        <label className="form-label" htmlFor={`filter-${name}`}>{label}</label>
        <select className="form-select" id={`filter-${name}`} name={name} defaultValue={filter[name] || ""}>
          <option value="">{emptyLabel}</option>
          {(list || []).map((item: any) => <option key={item.id} value={item.id}>{render ? render(item) : item.name}</option>)}
        </select>
      </div>
    )

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h4 className="card-title">{data.pageTitle}</h4>
                  <p className="text-muted mb-0">
                    Lịch sử thao tác của các tài khoản quản trị. Chỉ tài khoản Super Admin xem được, không ai sửa hay xoá được nhật ký.
                    {" "}Nhật ký được lưu {data.retentionMonths} tháng, cũ hơn sẽ tự động bị xoá.
                  </p>
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              <FilterForm className="row g-2 align-items-end mb-3">
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filter-keyword">Từ khoá</label>
                  <input className="form-control" id="filter-keyword" type="text" name="keyword" placeholder="Họ tên, email, nội dung..." defaultValue={filter.keyword} />
                </div>
                {select("accountId", "Tài khoản", "-- Tất cả tài khoản --", data.accountList, "col-md-6 col-lg-4",
                  item => `${item.fullName} (${item.email})${item.deleted ? " - đã xoá" : ""}`)}
                {select("module", "Chức năng", "-- Tất cả chức năng --", data.moduleList, "col-md-6 col-lg-4")}
                {select("action", "Hành động", "-- Tất cả hành động --", data.actionList, "col-md-6 col-lg-3")}
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filter-startDate">Từ ngày</label>
                  <input className="form-control" id="filter-startDate" type="date" name="startDate" defaultValue={filter.startDate} />
                </div>
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filter-endDate">Đến ngày</label>
                  <input className="form-control" id="filter-endDate" type="date" name="endDate" defaultValue={filter.endDate} />
                </div>
                <div className="col-md-6 col-lg-3">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <AdminLink className="btn btn-secondary" href={adminUrl("/activity-log/list")}>Xoá bộ lọc</AdminLink>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} bản ghi</p>
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>STT</th>
                      <th>Thời gian</th>
                      <th>Tài khoản</th>
                      <th>Chức năng</th>
                      <th>Hành động</th>
                      <th>Nội dung</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logList.length > 0 ? logList.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{data.pagination.skip + index + 1}</td>
                        <td className="text-nowrap">{item.createdAtFormat}</td>
                        <td>
                          <div className="fw-medium">{item.accountFullName}</div>
                          <small className="text-muted">{item.accountEmail}</small>
                        </td>
                        <td className="text-nowrap">{item.moduleName}</td>
                        <td><span className={`badge ${item.actionColor}`}>{item.actionName}</span></td>
                        <td style={{ minWidth: "250px" }}>{item.description}</td>
                        {/* Rê chuột vào IP để xem trình duyệt, thiết bị */}
                        <td className="text-nowrap" title={item.userAgent}>{item.ip}</td>
                      </tr>
                    )) : (
                      <tr><td className="text-center text-muted" colSpan={7}>Chưa có nhật ký hoạt động nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
