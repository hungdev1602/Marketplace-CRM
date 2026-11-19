import { AdminPagination, FilterForm } from "@/components/admin/ui"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Nhật ký gọi API bên thứ 3: /admin/integration/log
// Mỗi lần server gọi Т-Банк, ApiShip, gửi email... ghi 1 dòng. Không lưu dữ liệu gửi đi (khoá API, thông tin khách)

const path = "/integration/log"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function IntegrationLogPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const logList: any[] = data.logList || []
    const filter = data.filter || {}
    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <a className="text-muted small" href={adminUrl("/integration/list")}>
                    <i className="fa-solid fa-arrow-left me-1"></i>
                    Kết nối API
                  </a>
                  <h4 className="card-title mt-1">{data.pageTitle}</h4>
                  <p className="text-muted mb-0">
                    Mỗi lần website gọi dịch vụ bên ngoài (tạo thanh toán, tính phí giao hàng, tạo vận đơn, gửi email...).
                    {" "}Chỉ lưu kết quả và lời báo lỗi, không lưu khoá API hay thông tin khách. Lưu {data.retentionDays} ngày.
                  </p>
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              <FilterForm className="row g-2 align-items-end mb-3">
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filterProvider">Dịch vụ</label>
                  <select className="form-select" id="filterProvider" name="provider" defaultValue={filter.provider || ""}>
                    <option value="">-- Tất cả dịch vụ --</option>
                    {(data.providerList || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filterResult">Kết quả</label>
                  <select className="form-select" id="filterResult" name="result" defaultValue={filter.result || ""}>
                    <option value="">-- Tất cả --</option>
                    <option value="ok">Thành công</option>
                    <option value="error">Lỗi</option>
                  </select>
                </div>
                <div className="col-md-12 col-lg-5">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <a className="btn btn-secondary" href={adminUrl("/integration/log")}>Xoá bộ lọc</a>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} lần gọi</p>
              <div className="table-responsive">
                <table className="table table-striped mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Thời gian (Moscow)</th>
                      <th>Dịch vụ</th>
                      <th>Thao tác</th>
                      <th>Kết quả</th>
                      <th className="text-end text-nowrap">Thời gian chờ</th>
                      <th>Ghi chú / lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logList.length > 0 ? logList.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="text-nowrap">{item.createdAtFormat}</td>
                        <td className="text-nowrap">{item.providerName}</td>
                        <td className="font-monospace small">{item.action}</td>
                        <td className="text-nowrap">
                          {item.ok ? <span className="badge bg-success">Thành công</span> : <span className="badge bg-danger">Lỗi</span>}
                          {item.statusCode && <span className="text-muted small ms-1">HTTP {item.statusCode}</span>}
                        </td>
                        <td className="text-end text-nowrap">{item.durationMs} ms</td>
                        <td className={`small ${item.ok ? "text-muted" : "text-danger"}`} style={{ minWidth: "260px" }}>{item.message}</td>
                      </tr>
                    )) : (
                      <tr><td className="text-center text-muted" colSpan={6}>Chưa có lần gọi API nào</td></tr>
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
