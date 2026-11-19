import { AdminPagination, CardHeader, EmptyRow, FilterForm } from "@/components/admin/ui"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh sách đơn hàng: /admin/order/list
// Dữ liệu: hàm list ở server/controller/admin/order.controller.ts

const path = "/order/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function OrderListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const orderList: any[] = data.orderList || []
    const filter = data.filter || {}
    const options = data.options || {}
    const select = (name: string, label: string, list: any[], className: string) => (
      <div className={className}>
        <label className="form-label" htmlFor={`filter-${name}`}>{label}</label>
        <select className="form-select" id={`filter-${name}`} name={name} defaultValue={filter[name] || ""}>
          <option value="">-- Tất cả --</option>
          {(list || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
    )

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {data.waitingShipmentCount > 0 && (
                <a className="btn btn-info" href={adminUrl("/order/list?status=paid")}>
                  <i className="fa-solid fa-box me-1"></i>
                  {data.waitingShipmentCount} đơn chờ gửi hàng
                </a>
              )}
            </CardHeader>
            <div className="card-body pt-0">
              <FilterForm className="row g-2 align-items-end mb-3">
                <div className="col-md-6 col-lg-3">
                  <label className="form-label" htmlFor="filter-keyword">Từ khoá</label>
                  <input className="form-control" id="filter-keyword" type="text" name="keyword" placeholder="Mã đơn, tên, số điện thoại, email..." defaultValue={filter.keyword} />
                </div>
                {select("status", "Trạng thái đơn", options.statusList, "col-md-6 col-lg-3")}
                {select("paymentStatus", "Thanh toán", options.paymentStatusList, "col-md-6 col-lg-2")}
                {select("deliveryType", "Cách giao", options.deliveryTypeList, "col-md-6 col-lg-2")}
                <div className="col-md-12 col-lg-2">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <a className="btn btn-secondary" href={adminUrl("/order/list")}>Xoá lọc</a>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} đơn hàng</p>
            </div>
            <div className="table-responsive">
              <table className="table table-striped mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Giao hàng</th>
                    <th className="text-end">Tổng tiền</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Xem</th>
                  </tr>
                </thead>
                <tbody>
                  {orderList.length > 0 ? orderList.map(order => {
                    const delivery = order.delivery || {}
                    return (
                      <tr key={order.id}>
                        <td className="text-nowrap">
                          <a className="fw-bold font-monospace" href={adminUrl(`/order/detail/${order.id}`)}>{order.code}</a>
                          <div className="small text-muted">{order.createdAtFormat}</div>
                        </td>
                        <td style={{ minWidth: "180px" }}>
                          <div className="fw-medium">{order.customer?.fullName}</div>
                          <div className="small">{order.customer?.phone}</div>
                          <div className="small text-muted">{order.customer?.email}</div>
                        </td>
                        <td style={{ minWidth: "200px" }}>
                          <div>
                            <i className={delivery.type == "point" ? "fa-solid fa-store me-1 text-secondary" : "fa-solid fa-truck me-1 text-secondary"}></i>
                            {order.providerNameText}
                            <span className="text-muted"> · {delivery.tariffName}</span>
                          </div>
                          <div className="small text-muted">
                            {delivery.type == "point" && delivery.point ? delivery.point.address : delivery.address}
                          </div>
                          {order.shipment?.providerNumber && (
                            <div className="small">
                              Mã vận đơn: <span className="fw-bold font-monospace">{order.shipment.providerNumber}</span>
                            </div>
                          )}
                        </td>
                        <td className="text-end text-nowrap">
                          <div className="fw-bold">{order.totalFormat}</div>
                          <div className="small text-muted">{order.totalQuantity} sản phẩm</div>
                        </td>
                        <td>{order.paymentStatusInfo && <span className={`badge ${order.paymentStatusInfo.color}`}>{order.paymentStatusInfo.name}</span>}</td>
                        <td>
                          {order.statusInfo && <span className={`badge ${order.statusInfo.color}`}>{order.statusInfo.name}</span>}
                          {order.shipment?.error && order.status == "paid" && (
                            <div className="small text-danger mt-1">
                              <i className="fa-solid fa-triangle-exclamation me-1"></i>
                              Lỗi vận đơn
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <a href={adminUrl(`/order/detail/${order.id}`)} title="Xem chi tiết">
                            <i className="fa-solid fa-eye text-secondary" style={{ fontSize: "1.2rem" }}></i>
                          </a>
                        </td>
                      </tr>
                    )
                  }) : <EmptyRow colSpan={7} text="Không tìm thấy đơn hàng" />}
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
