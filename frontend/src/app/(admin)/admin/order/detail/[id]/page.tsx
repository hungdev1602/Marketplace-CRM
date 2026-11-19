import { ActionButton, TextPatchForm } from "@/components/admin/ActionButton"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Chi tiết đơn hàng: /admin/order/detail/:id
// Dữ liệu: hàm detail ở server/controller/admin/order.controller.ts
// Nút thao tác gọi API của server (tạo vận đơn, huỷ đơn, đánh dấu đã giao,...) rồi tải lại trang

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/order/detail/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

// Số tiền kiểu Nga, ví dụ 1250 => "1 250"
const money = (value: number | null | undefined) => (value || 0).toLocaleString("ru-RU")

function CardTitle({ icon, children }: { icon: string, children: React.ReactNode }) {
  return (
    <div className="card-header">
      <h4 className="card-title mb-0">
        <i className={`${icon} me-2`}></i>
        {children}
      </h4>
    </div>
  )
}

function Info({ label, className = "col-md-6", children }: { label: string, className?: string, children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="text-muted small">{label}</div>
      {children}
    </div>
  )
}

export default async function OrderDetailPage(props: Props) {
  return adminPage(path, props, (data) => {
    const permissions: string[] = data.permissions || []
    const order = data.order
    const delivery = order.delivery || {}
    const shipment = order.shipment || {}
    const payment = order.payment || {}
    const canEdit = permissions.includes("order-edit")
    const canCancel = permissions.includes("order-cancel")
    const canIntegration = permissions.includes("integration-edit")
    const fileUrl: string = data.domainFileManager || ""
    // Link trang đơn hàng của khách là đường dẫn trên website (Next.js)
    const customerOrderUrl: string = `${data.customerOrderUrl || ""}`.replace(/^https?:\/\/[^/]+/, "")

    return (
      <>
        <div className="row mb-3 align-items-center">
          <div className="col">
            <a className="text-muted" href={adminUrl("/order/list")}>
              <i className="fa-solid fa-arrow-left me-1"></i>
              Danh sách đơn hàng
            </a>
            <h4 className="mt-2 mb-0">
              <span className="font-monospace">{order.code}</span>
              {order.statusInfo && <span className={`badge ${order.statusInfo.color} ms-2 align-middle`}>{order.statusInfo.name}</span>}
              {order.paymentStatusInfo && <span className={`badge ${order.paymentStatusInfo.color} ms-1 align-middle`}>{order.paymentStatusInfo.name}</span>}
            </h4>
            <div className="text-muted small mt-1">Đặt lúc {order.createdAtFormat} (giờ Moscow)</div>
          </div>
          <div className="col-auto">
            <a className="btn btn-outline-secondary me-1" href={customerOrderUrl} target="_blank" rel="noopener" title="Trang đơn hàng khách đang xem">
              <i className="fa-solid fa-up-right-from-square me-1"></i>
              Trang của khách
            </a>
            <ActionButton api={`/order/refresh/${order.id}`} method="PATCH" className="btn btn-outline-primary">
              <i className="fa-solid fa-rotate me-1"></i>
              Cập nhật trạng thái
            </ActionButton>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {/* Giao hàng, vận đơn ApiShip */}
            <div className="card">
              <CardTitle icon="fa-solid fa-truck">Giao hàng (ApiShip)</CardTitle>
              <div className="card-body">
                {!data.apishipConfigured ? (
                  <div className="alert alert-warning">
                    Chưa cấu hình ApiShip (hoặc kết nối ApiShip đang tắt) — chưa tạo được vận đơn.
                    {canIntegration && <> <a href={adminUrl("/integration/edit/apiship")}>Cấu hình ApiShip</a></>}
                  </div>
                ) : data.apishipTest ? (
                  <div className="alert alert-info py-2">
                    <i className="fa-solid fa-flask me-1"></i>
                    Đang dùng máy chủ thử nghiệm của ApiShip (Kết nối API → ApiShip): vận đơn chỉ để thử, hãng vận chuyển không tới lấy hàng.
                  </div>
                ) : null}

                <div className="row g-3">
                  <Info label="Cách giao">
                    <div className="fw-medium">{order.deliveryTypeInfo ? order.deliveryTypeInfo.name : delivery.type}</div>
                  </Info>
                  <Info label="Hãng vận chuyển / tariff">
                    <div className="fw-medium">
                      {order.providerNameText}
                      <span className="text-muted"> · {delivery.tariffName} (id {delivery.tariffId})</span>
                    </div>
                  </Info>
                  {delivery.type == "point" && delivery.point ? (
                    <Info label="Điểm nhận hàng">
                      <div className="fw-medium">{delivery.point.address}</div>
                      <div className="small text-muted">
                        {delivery.point.name}
                        {delivery.point.code && ` · mã điểm ${delivery.point.code}`}
                        {` · id ApiShip ${delivery.point.id}`}
                      </div>
                      {delivery.point.timetable && <div className="small text-muted">{delivery.point.timetable}</div>}
                    </Info>
                  ) : (
                    <Info label="Địa chỉ giao hàng">
                      <div className="fw-medium">{delivery.address}</div>
                    </Info>
                  )}
                  <Info label="Kiện hàng (tính phí)">
                    <div className="fw-medium">
                      {delivery.parcel && `${delivery.parcel.weight} g · ${delivery.parcel.length}×${delivery.parcel.width}×${delivery.parcel.height} cm`}
                    </div>
                  </Info>
                  <Info label="Phí giao hàng">
                    <div className="fw-medium">
                      Khách trả {order.deliveryCost > 0 ? `${money(order.deliveryCost)} ₽` : "0 ₽ (miễn phí)"}
                      <span className="text-muted"> · ApiShip tính {money(order.deliveryCostOriginal)} ₽</span>
                    </div>
                  </Info>
                  {delivery.daysMax ? (
                    <Info label="Thời gian giao dự kiến">
                      <div className="fw-medium">{delivery.daysMin || delivery.daysMax}–{delivery.daysMax} ngày</div>
                    </Info>
                  ) : null}
                  {delivery.comment && (
                    <Info label="Ghi chú của khách cho người giao hàng" className="col-12">
                      <div className="fw-medium">{delivery.comment}</div>
                    </Info>
                  )}
                </div>
                <hr />

                {/* Vận đơn */}
                {shipment.orderId ? (
                  <>
                    <div className="row g-3">
                      <Info label="Vận đơn ApiShip">
                        <div className="fw-bold font-monospace">#{shipment.orderId}</div>
                        <div className="small text-muted">Ngày gửi hàng: {shipment.pickupDate}</div>
                      </Info>
                      <Info label="Mã vận đơn của hãng (khách tra cứu)">
                        {shipment.providerNumber ? (
                          <>
                            <div className="fw-bold font-monospace fs-5">{shipment.providerNumber}</div>
                            {shipment.trackingUrl && <a className="small" href={shipment.trackingUrl} target="_blank" rel="noopener">Tra cứu trên trang hãng vận chuyển</a>}
                          </>
                        ) : (
                          <div className="text-muted">Chưa có (hãng vận chuyển đang xử lý, bấm &quot;Cập nhật trạng thái&quot; sau vài phút)</div>
                        )}
                      </Info>
                      <Info label="Trạng thái giao hàng" className="col-12">
                        <div className="fw-medium">
                          {shipment.statusName || "Đang chờ ApiShip cập nhật"}
                          {shipment.statusKey && <span className="text-muted small"> ({shipment.statusKey})</span>}
                        </div>
                        {shipment.statusDescription && <div className="small text-muted">{shipment.statusDescription}</div>}
                        {data.shipmentStatusFormat && <div className="small text-muted">Cập nhật lúc {data.shipmentStatusFormat}</div>}
                      </Info>
                    </div>
                    {canEdit && (
                      <div className="mt-3 d-flex flex-wrap gap-2">
                        <ActionButton api={`/order/waybill/${order.id}`} method="POST" openUrl className="btn btn-primary">
                          <i className="fa-solid fa-print me-1"></i>
                          In phiếu gửi hàng
                        </ActionButton>
                        {order.status == "shipping" && (
                          <ActionButton
                            api={`/order/cancel-shipment/${order.id}`}
                            method="PATCH"
                            confirm="Huỷ vận đơn này? Chỉ huỷ được khi hãng vận chuyển chưa nhận hàng. Đơn hàng sẽ trở lại trạng thái chờ gửi hàng."
                            className="btn btn-outline-danger"
                          >
                            <i className="fa-solid fa-ban me-1"></i>
                            Huỷ vận đơn
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {shipment.error && (
                      <div className="alert alert-danger">
                        <b>Tạo vận đơn bị lỗi:</b> {shipment.error}
                      </div>
                    )}
                    {data.canCreateShipment ? (
                      <>
                        {data.senderMissing && (
                          <div className="alert alert-warning py-2">
                            <i className="fa-solid fa-triangle-exclamation me-1"></i>
                            Chưa điền đủ địa chỉ kho / người liên hệ (Kết nối API → ApiShip → Kho gửi hàng). Hãng vận chuyển cần thông tin này để lấy hàng.
                            {canIntegration && <> <a href={adminUrl("/integration/edit/apiship")}>Điền ngay</a></>}
                          </div>
                        )}
                        {canEdit && data.apishipConfigured && (
                          <>
                            <p className="mb-2">Khách đã thanh toán. Đóng hàng xong thì chọn ngày giao hàng cho hãng vận chuyển và bấm tạo vận đơn.</p>
                            <div className="row g-2 align-items-end">
                              <div className="col-sm-6 col-md-4">
                                <label className="form-label" htmlFor="pickupDate">Ngày giao cho hãng vận chuyển</label>
                                <input className="form-control" id="pickupDate" type="date" defaultValue={data.defaultPickupDate} />
                              </div>
                              <div className="col-auto">
                                <ActionButton
                                  api={`/order/shipment/${order.id}`}
                                  method="POST"
                                  pickupDateSelector="#pickupDate"
                                  confirm="Tạo vận đơn ApiShip cho đơn hàng này?"
                                  className="btn btn-success"
                                >
                                  <i className="fa-solid fa-truck-fast me-1"></i>
                                  Tạo vận đơn ApiShip
                                </ActionButton>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : order.status == "pending" ? (
                      <p className="text-muted mb-0">
                        <i className="fa-solid fa-lock me-1"></i>
                        Khách chưa thanh toán — chưa tạo được vận đơn (khách phải trả tiền trước mới gửi hàng).
                      </p>
                    ) : order.status == "cancelled" ? (
                      <p className="text-muted mb-0">Đơn hàng đã huỷ.</p>
                    ) : (
                      <p className="text-muted mb-0">Không có vận đơn.</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sản phẩm */}
            <div className="card">
              <CardTitle icon="fa-solid fa-basket-shopping">Sản phẩm ({order.totalQuantity})</CardTitle>
              <div className="table-responsive">
                <table className="table mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Sản phẩm</th>
                      <th className="text-end">Đơn giá</th>
                      <th className="text-center">Số lượng</th>
                      <th className="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item: any, index: number) => (
                      <tr key={`${item.productId}-${index}`}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {item.image && <img src={`${fileUrl}${item.image}`} alt="" style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "6px" }} />}
                            <div>
                              <div className="fw-medium">{item.name}</div>
                              {item.nameRu && <div className="small text-muted">{item.nameRu}</div>}
                              <div className="small text-muted">
                                {item.sku && `SKU: ${item.sku}`}
                                {item.storageType == "chilled" && <span className="badge bg-info ms-1">Bảo quản mát</span>}
                                {item.storageType == "frozen" && <span className="badge bg-primary ms-1">Đông lạnh</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-end text-nowrap">
                          {money(item.price)} ₽
                          {item.priceOld ? <div className="small text-muted text-decoration-line-through">{money(item.priceOld)} ₽</div> : null}
                        </td>
                        <td className="text-center">{item.quantity} {item.unitName}</td>
                        <td className="text-end text-nowrap fw-bold">{money(item.lineTotal)} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="text-end" colSpan={3}>Tiền hàng</td>
                      <td className="text-end text-nowrap">{money(order.subtotal)} ₽</td>
                    </tr>
                    {order.couponDiscount > 0 ? (
                      <tr>
                        <td className="text-end" colSpan={3}>Mã giảm giá {order.couponCode}</td>
                        <td className="text-end text-nowrap text-danger">−{money(order.couponDiscount)} ₽</td>
                      </tr>
                    ) : order.couponCode ? (
                      <tr>
                        <td className="text-end" colSpan={3}>Mã giảm giá {order.couponCode}</td>
                        <td className="text-end text-nowrap">Miễn phí giao hàng</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="text-end" colSpan={3}>Phí giao hàng</td>
                      <td className="text-end text-nowrap">{money(order.deliveryCost)} ₽</td>
                    </tr>
                    <tr>
                      <td className="text-end fw-bold" colSpan={3}>Khách trả</td>
                      <td className="text-end text-nowrap fw-bold fs-5">{order.totalFormat}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Lịch sử */}
            <div className="card">
              <CardTitle icon="fa-solid fa-clock-rotate-left">Lịch sử đơn hàng</CardTitle>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  {[...(order.statusHistory || [])].reverse().map((history: any, index: number) => (
                    <li className="mb-3" key={index}>
                      <div>
                        <span className="fw-medium">{history.atFormat}</span>
                        <span className="badge bg-light text-dark ms-2">{history.statusName}</span>
                      </div>
                      <div>{history.note}</div>
                      <div className="small text-muted">{history.by}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            {/* Khách hàng */}
            <div className="card">
              <CardTitle icon="fa-solid fa-user">Người nhận</CardTitle>
              <div className="card-body">
                <div className="fw-bold">{order.customer?.fullName}</div>
                <div><a href={`tel:${order.customer?.phone}`}>{order.customer?.phone}</a></div>
                <div><a href={`mailto:${order.customer?.email}`}>{order.customer?.email}</a></div>
                <div className="small text-muted mt-2">{order.userId ? "Khách có tài khoản" : "Khách chưa đăng nhập khi đặt hàng"}</div>
              </div>
            </div>

            {/* Thanh toán */}
            <div className="card">
              <CardTitle icon="fa-solid fa-credit-card">Thanh toán</CardTitle>
              <div className="card-body">
                <div className="mb-1">
                  {order.paymentStatusInfo && <span className={`badge ${order.paymentStatusInfo.color}`}>{order.paymentStatusInfo.name}</span>}
                </div>
                <div className="small">
                  Cổng thanh toán: <b>{payment.provider == "test" ? "Thanh toán giả (thử trên máy)" : "Т-Банк Интернет-эквайринг"}</b>
                </div>
                {payment.paymentId && <div className="small text-muted text-break">Mã giao dịch: {payment.paymentId}</div>}
                {payment.method && <div className="small">Cách thanh toán: {payment.method}</div>}
                {data.paidAtFormat && <div className="small">Thanh toán lúc: {data.paidAtFormat}</div>}
                {order.status == "pending" && <div className="small text-muted">Hạn thanh toán: {data.paymentExpireFormat} (quá hạn đơn tự huỷ, trả hàng vào kho)</div>}
                {payment.cancelReason && <div className="small text-muted">Lý do chưa thanh toán được: {payment.cancelReason}</div>}
                {data.refundedAtFormat && (
                  <>
                    <div className="small">Hoàn tiền lúc: {data.refundedAtFormat}</div>
                    {payment.refundId && <div className="small text-muted text-break">Mã hoàn tiền: {payment.refundId}</div>}
                  </>
                )}
              </div>
            </div>

            {/* Thao tác */}
            {(canEdit || canCancel) && ["pending", "paid", "shipping"].includes(order.status) && (
              <div className="card">
                <CardTitle icon="fa-solid fa-gear">Thao tác</CardTitle>
                <div className="card-body d-grid gap-2">
                  {canEdit && ["paid", "shipping"].includes(order.status) && (
                    <ActionButton api={`/order/delivered/${order.id}`} method="PATCH" confirm="Đánh dấu đơn hàng đã giao cho khách?" className="btn btn-outline-success">
                      <i className="fa-solid fa-check me-1"></i>
                      Đánh dấu đã giao hàng
                    </ActionButton>
                  )}
                  {canCancel && ["pending", "paid"].includes(order.status) && (
                    <ActionButton
                      api={`/order/cancel/${order.id}`}
                      method="PATCH"
                      reason
                      confirm={order.status == "paid"
                        ? `Huỷ đơn và hoàn ${order.totalFormat} cho khách qua Т-Банк? Sản phẩm được trả lại kho.`
                        : "Huỷ đơn hàng chưa thanh toán? Sản phẩm được trả lại kho."}
                      className="btn btn-outline-danger"
                    >
                      <i className="fa-solid fa-xmark me-1"></i>
                      {order.status == "paid" ? "Huỷ đơn và hoàn tiền" : "Huỷ đơn"}
                    </ActionButton>
                  )}
                </div>
              </div>
            )}

            {/* Ghi chú nội bộ */}
            <div className="card">
              <CardTitle icon="fa-solid fa-note-sticky">Ghi chú nội bộ</CardTitle>
              <div className="card-body">
                <TextPatchForm
                  api={`/order/note/${order.id}`}
                  field="adminNote"
                  defaultValue={order.adminNote || ""}
                  rows={4}
                  maxLength={2000}
                  placeholder="Chỉ nhân viên thấy, khách không thấy"
                  disabled={!canEdit}
                  submitLabel={canEdit ? "Lưu ghi chú" : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  })
}
