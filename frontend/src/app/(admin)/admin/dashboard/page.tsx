import { DashboardChart } from "@/components/admin/DashboardChart"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"
import { formatNumber } from "@/lib/format"

// Trang tổng quan: /admin/dashboard
// Dữ liệu: server/controller/admin/dashboard.controller.ts (chỉ có số liệu của các chức năng tài khoản được xem)

const path = "/dashboard"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

function StatCard({ label, value, note, icon, iconColor, link }: {
  label: string
  value: string
  note?: string
  icon: string
  iconColor: string
  link?: string
}) {
  return (
    <div className="card dashboard-stat-card flex-fill">
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-grow-1">
            <p className="text-muted mb-1">{label}</p>
            <h3 className="fw-bold mb-1">{value}</h3>
            {note && <p className="small text-muted mb-0">{note}</p>}
          </div>
          <div className="d-flex justify-content-center align-items-center thumb-lg rounded-circle bg-light ms-2">
            <i className={`${icon} fs-4 ${iconColor}`}></i>
          </div>
        </div>
        {link && <a className="stretched-link" href={link} aria-label={label}></a>}
      </div>
    </div>
  )
}

function Dashboard({ data }: { data: any }) {
  const permissions: string[] = data.permissions || []
  const can = (permission: string) => permissions.includes(permission)
  const { productStats, couponStats, articleStats, activityList, lowStockThreshold } = data
  const fileUrl: string = data.domainFileManager || ""

  return (
    <>
      <div className="row align-items-center mb-3">
        <div className="col">
          <h4 className="mb-1">{data.pageTitle}</h4>
          <p className="text-muted small mb-0">Số liệu lúc {data.updatedAt} (giờ Moscow). Tải lại trang để cập nhật.</p>
        </div>
        <div className="col-auto mt-2 mt-md-0">
          {can("product-create") && (
            <a className="btn btn-primary btn-sm me-1 mb-1" href={adminUrl("/product/create")}>
              <i className="fa-solid fa-plus me-1"></i>
              Tạo sản phẩm
            </a>
          )}
          {can("product-import") && (
            <a className="btn btn-outline-success btn-sm me-1 mb-1" href={adminUrl("/product/import")}>
              <i className="fa-solid fa-file-import me-1"></i>
              Nhập Excel
            </a>
          )}
          {can("coupon-create") && (
            <a className="btn btn-outline-primary btn-sm me-1 mb-1" href={adminUrl("/coupon/create")}>
              <i className="fa-solid fa-ticket me-1"></i>
              Tạo mã giảm giá
            </a>
          )}
          {can("article-create") && (
            <a className="btn btn-outline-secondary btn-sm mb-1" href={adminUrl("/article/create")}>
              <i className="fa-solid fa-pen me-1"></i>
              Viết bài
            </a>
          )}
        </div>
      </div>

      {!productStats && !couponStats && !articleStats && !activityList && (
        <div className="card">
          <div className="card-body text-center text-muted py-5">
            Tài khoản chưa được cấp quyền xem chức năng nào để hiện số liệu. Vui lòng liên hệ quản trị viên.
          </div>
        </div>
      )}

      {productStats && (
        <>
          <div className="row">
            <div className="col-md-6 col-xl-3 d-flex">
              <StatCard
                label="Sản phẩm"
                value={formatNumber(productStats.totalCount)}
                note={`${formatNumber(productStats.activeCount)} đang bán · ${formatNumber(productStats.inactiveCount)} ngừng bán`}
                icon="iconoir-shopping-bag"
                iconColor="text-primary"
                link={adminUrl("/product/list")}
              />
            </div>
            <div className="col-md-6 col-xl-3 d-flex">
              <StatCard
                label="Hết hàng"
                value={formatNumber(productStats.outOfStockCount)}
                note="Sản phẩm đang bán, tồn kho bằng 0"
                icon="iconoir-warning-triangle"
                iconColor={productStats.outOfStockCount > 0 ? "text-danger" : "text-success"}
                link={adminUrl("/product/list?status=active&stock=out")}
              />
            </div>
            <div className="col-md-6 col-xl-3 d-flex">
              <StatCard
                label="Sắp hết hàng"
                value={formatNumber(productStats.lowStockCount)}
                note={`Sản phẩm đang bán, tồn kho từ 1 đến ${lowStockThreshold}`}
                icon="iconoir-box-iso"
                iconColor={productStats.lowStockCount > 0 ? "text-warning" : "text-success"}
                link={adminUrl("/product/list?status=active&stock=low")}
              />
            </div>
            <div className="col-md-6 col-xl-3 d-flex">
              <StatCard
                label="Giá trị hàng tồn kho (giá nhập)"
                value={productStats.stockCostValueFormat}
                note={`Theo giá bán: ${productStats.stockPriceValueFormat}` + (productStats.missingCostPriceCount ? ` · ${formatNumber(productStats.missingCostPriceCount)} sản phẩm còn hàng chưa nhập giá nhập` : "")}
                icon="iconoir-coins"
                iconColor="text-info"
              />
            </div>
          </div>

          <div className="row">
            <div className="col-lg-5 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h4 className="card-title">Sản phẩm theo danh mục</h4>
                  <p className="small text-muted mb-0">Tính cả danh mục con, 1 sản phẩm có thể thuộc nhiều danh mục</p>
                </div>
                <div className="card-body pt-0">
                  <DashboardChart chart={productStats.categoryChart} />
                </div>
              </div>
            </div>
            <div className="col-lg-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h4 className="card-title">Sản phẩm theo xuất xứ</h4>
                </div>
                <div className="card-body pt-0">
                  <DashboardChart chart={productStats.originChart} />
                </div>
              </div>
            </div>
            <div className="col-lg-3 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h4 className="card-title">Điều kiện bảo quản</h4>
                  <p className="small text-muted mb-0">Hàng mát, đông lạnh cần xe / hộp giữ lạnh khi giao</p>
                </div>
                <div className="card-body pt-0">
                  <ul className="list-group list-group-flush">
                    {productStats.storageList.map((item: any) => (
                      <li className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0" key={item.id}>
                        <span className={`badge ${item.color} text-wrap text-start`}>{item.name}</span>
                        <a className="fw-semibold" href={adminUrl(`/product/list?storageType=${item.id}`)}>{formatNumber(item.count)}</a>
                      </li>
                    ))}
                    {productStats.noStorageCount > 0 && (
                      <li className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0">
                        <span className="text-muted">Chưa chọn</span>
                        <span className="fw-semibold">{formatNumber(productStats.noStorageCount)}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-7 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col">
                      <h4 className="card-title">Sản phẩm cần nhập thêm hàng</h4>
                      <p className="small text-muted mb-0">Sản phẩm đang bán có tồn kho từ {lowStockThreshold} trở xuống, ít nhất trước</p>
                    </div>
                    <div className="col-auto">
                      <a className="btn btn-sm btn-light" href={adminUrl("/product/list?status=active&sort=stock-asc")}>Xem tất cả</a>
                    </div>
                  </div>
                </div>
                <div className="card-body pt-0">
                  {productStats.lowStockList.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Sản phẩm</th>
                            <th className="text-center">Tồn kho</th>
                            <th className="text-end"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStats.lowStockList.map((item: any) => (
                            <tr key={item.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  {item.avatar && (
                                    <img className="thumb-md rounded me-2" src={`${fileUrl}${item.avatar}`} alt="" style={{ objectFit: "contain" }} />
                                  )}
                                  <div>
                                    <div className="fw-medium">{item.name}</div>
                                    {item.sku && <div className="small text-muted">SKU: {item.sku}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center text-nowrap">
                                {!(item.stock > 0) ? (
                                  <span className="badge bg-danger">Hết hàng</span>
                                ) : (
                                  <>
                                    <span className="badge bg-warning">{item.stock}</span>
                                    {item.unitName && <span className="small text-muted"> {item.unitName}</span>}
                                  </>
                                )}
                              </td>
                              <td className="text-end">
                                {can("product-edit") && (
                                  <a href={adminUrl(`/product/edit/${item.id}`)} title="Chỉnh sửa">
                                    <i className="fa-solid fa-pen-to-square text-secondary fs-5"></i>
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-success my-4">
                      <i className="fa-solid fa-circle-check me-1"></i>
                      Tất cả sản phẩm đang bán đều đủ hàng
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-lg-5 d-flex">
              <div className="card flex-fill">
                <div className="card-header">
                  <h4 className="card-title">Thông tin sản phẩm còn thiếu</h4>
                  <p className="small text-muted mb-0">
                    Nhãn hàng nhập khẩu tại Nga cần tên tiếng Nga, thành phần, hạn sử dụng, nhà nhập khẩu, chứng nhận ЕАЭС. Bấm vào số để xem sản phẩm.
                  </p>
                </div>
                <div className="card-body pt-0">
                  <ul className="list-group list-group-flush">
                    {productStats.missingInfoList.map((item: any) => (
                      <li className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0" key={item.id}>
                        <span>{item.name}</span>
                        {item.count > 0 ? (
                          <a className="badge bg-warning-subtle text-warning fs-6" href={adminUrl(`/product/list?missing=${item.id}`)} title="Xem các sản phẩm còn thiếu">
                            Thiếu {formatNumber(item.count)}
                          </a>
                        ) : (
                          <span className="text-success" title="Đã đủ"><i className="fa-solid fa-circle-check"></i></span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {(couponStats || articleStats) && (
        <div className="row">
          {couponStats && (
            <div className={articleStats ? "col-lg-8 d-flex" : "col-12 d-flex"}>
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col">
                      <h4 className="card-title">Mã giảm giá</h4>
                    </div>
                    <div className="col-auto">
                      <a className="btn btn-sm btn-light" href={adminUrl("/coupon/list")}>Xem tất cả</a>
                    </div>
                  </div>
                </div>
                <div className="card-body pt-0">
                  <div className="row g-2 mb-3">
                    {couponStats.statusList.map((item: any) => (
                      <div className="col" key={item.id}>
                        <a className="d-block border rounded text-center p-2 h-100" href={adminUrl(`/coupon/list?status=${item.id}`)}>
                          <div className="fs-4 fw-bold text-body">{formatNumber(item.count)}</div>
                          <span className={`badge ${item.color}`}>{item.name}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  <h6 className="mb-2">Sắp hết hạn trong 7 ngày</h6>
                  {couponStats.endingSoonList.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table mb-0">
                        <tbody>
                          {couponStats.endingSoonList.map((item: any) => (
                            <tr key={item.code}>
                              <td className="ps-0">
                                <span className="fw-bold font-monospace">{item.code}</span>
                                <div className="small text-muted">{item.name}</div>
                              </td>
                              <td>{item.discountText}</td>
                              <td className="text-end text-nowrap pe-0">
                                <div>{item.endAtFormat}</div>
                                <span className="badge bg-warning-subtle text-warning">{item.timeLeft}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="small text-muted mb-0">Không có mã nào đang chạy sắp hết hạn.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {articleStats && (
            <div className={couponStats ? "col-lg-4 d-flex" : "col-12 d-flex"}>
              <div className="card flex-fill">
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col">
                      <h4 className="card-title">Bài viết</h4>
                    </div>
                    <div className="col-auto">
                      <a className="btn btn-sm btn-light" href={adminUrl("/article/list")}>Xem tất cả</a>
                    </div>
                  </div>
                </div>
                <div className="card-body pt-0">
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                      <span><span className="badge bg-success me-1">Đã xuất bản</span></span>
                      <span className="fw-semibold">{formatNumber(articleStats.publishedCount)}</span>
                    </li>
                    <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                      <span><span className="badge bg-danger me-1">Bản nháp</span></span>
                      <span className="fw-semibold">{formatNumber(articleStats.draftCount)}</span>
                    </li>
                    <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                      <span><span className="badge bg-dark border me-1">Đã lưu trữ</span></span>
                      <span className="fw-semibold">{formatNumber(articleStats.archivedCount)}</span>
                    </li>
                    <li className="list-group-item bg-transparent d-flex justify-content-between px-0">
                      <span className="fw-medium">Tổng</span>
                      <span className="fw-bold">{formatNumber(articleStats.totalCount)}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activityList && (
        <div className="card">
          <div className="card-header">
            <div className="row align-items-center">
              <div className="col">
                <h4 className="card-title">Hoạt động gần đây</h4>
              </div>
              <div className="col-auto">
                <a className="btn btn-sm btn-light" href={adminUrl("/activity-log/list")}>Xem nhật ký</a>
              </div>
            </div>
          </div>
          <div className="card-body pt-0">
            {activityList.length > 0 ? (
              <div className="table-responsive">
                <table className="table mb-0">
                  <tbody>
                    {activityList.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="text-nowrap text-muted small ps-0">{item.createdAtFormat}</td>
                        <td className="text-nowrap">{item.accountFullName}</td>
                        <td><span className={`badge ${item.actionColor}`}>{item.actionName}</span></td>
                        <td style={{ minWidth: "250px" }}>{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="small text-muted mb-0">Chưa có hoạt động nào.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default async function DashboardPage(props: AdminPageProps) {
  return adminPage(path, props, data => <Dashboard data={data} />)
}
