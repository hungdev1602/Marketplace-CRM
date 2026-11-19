import { IntegrationTestButton, IntegrationToggle } from "@/components/admin/views/Integration"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Kết nối API bên thứ 3: /admin/integration/list (Т-Банк, ApiShip, email)
// Dữ liệu: hàm list ở server/controller/admin/integration.controller.ts

const path = "/integration/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function IntegrationListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const canEdit = (data.permissions || []).includes("integration-edit")
    const categories: any[] = data.categories || []

    return (
      <>
        <div className="row mb-3 align-items-center">
          <div className="col">
            <h4 className="mb-1">{data.pageTitle}</h4>
            <p className="text-muted mb-0">
              Khoá API của các dịch vụ bên ngoài mà website dùng: thanh toán, vận chuyển, email.
              {" "}Nhập ở đây là có hiệu lực ngay, không cần sửa file .env hay khởi động lại server.
            </p>
          </div>
          <div className="col-auto">
            <a className="btn btn-outline-secondary" href={adminUrl("/integration/log")}>
              <i className="fa-solid fa-list-ul me-1"></i>
              Nhật ký gọi API
            </a>
          </div>
        </div>

        {!data.canEncrypt ? (
          <div className="alert alert-danger">
            <i className="fa-solid fa-triangle-exclamation me-1"></i>
            Chưa có INTEGRATION_SECRET_KEY (hoặc JWT_SECRET) trong file .env nên không lưu được khoá API. Xem hướng dẫn trong file .env.example.
          </div>
        ) : !data.hasDedicatedSecretKey ? (
          <div className="alert alert-warning py-2">
            <i className="fa-solid fa-key me-1"></i>
            Khoá API đang được mã hoá bằng JWT_SECRET. Nên thêm INTEGRATION_SECRET_KEY riêng vào file .env (xem .env.example)
            {" "}— nếu sau này đổi JWT_SECRET thì các khoá đã lưu ở đây phải nhập lại.
          </div>
        ) : null}

        {categories.map(category => (
          <div key={category.id || category.name}>
            <h5 className="mt-4 mb-3">
              <i className={`${category.icon} me-2 text-muted`}></i>
              {category.name}
            </h5>
            <div className="row">
              {(category.views || []).map((view: any) => {
                const definition = view.definition
                const stat = view.stat || {}
                return (
                  <div className="col-lg-6 col-xxl-4 mb-3" key={definition.key}>
                    <div className="card h-100 integration-card">
                      <div className="card-body">
                        <div className="d-flex align-items-start gap-3">
                          <div className="integration-icon"><i className={definition.icon}></i></div>
                          <div className="flex-grow-1">
                            <h5 className="mb-1">{definition.name}</h5>
                            {view.status && <span className={`badge ${view.status.color}`}>{view.status.name}</span>}
                            {view.modeInfo && <span className="badge bg-light text-dark border ms-1">{view.modeInfo.name}</span>}
                            {view.isTestMode && view.modeInfo && !view.modeInfo.isTest && <span className="badge bg-light text-dark border ms-1">Terminal DEMO</span>}
                          </div>
                        </div>
                        <p className="text-muted small mt-2 mb-2">{definition.description}</p>
                        {view.hasBrokenSecrets && (
                          <div className="alert alert-danger py-2 small mb-2">
                            Không giải mã được khoá đã lưu (INTEGRATION_SECRET_KEY / JWT_SECRET đã bị đổi). Vào Cấu hình để nhập lại.
                          </div>
                        )}
                        {(view.missingFields || []).length > 0 && view.enabled && (
                          <div className="alert alert-warning py-2 small mb-2">Còn thiếu: {view.missingFields.join(", ")}</div>
                        )}
                        <ul className="list-unstyled small mb-0 integration-meta">
                          <li>
                            <span className="text-muted">Cấu hình lấy từ:</span> {view.savedInAdmin ? "trang admin" : "file .env / mặc định"}
                            {view.updatedAtFormat && <span className="text-muted"> · sửa lúc {view.updatedAtFormat}</span>}
                          </li>
                          <li>
                            <span className="text-muted">24 giờ qua:</span> {stat.total} lần gọi
                            {stat.errors > 0 && <span className="text-danger fw-medium"> · {stat.errors} lỗi</span>}
                            {stat.total > 0 && <span className="text-muted"> · trung bình {stat.avgMs} ms</span>}
                          </li>
                          {stat.lastError && (
                            <li className="text-truncate" title={stat.lastError.message}>
                              <span className="text-muted">Lỗi gần nhất ({stat.lastError.atFormat}):</span>
                              <span className="text-danger"> {stat.lastError.message}</span>
                            </li>
                          )}
                          <li>
                            <span className="text-muted">Kiểm tra gần nhất:</span>
                            {view.lastTest ? (
                              <>
                                <span className={view.lastTest.ok ? "text-success" : "text-danger"}>
                                  <i className={view.lastTest.ok ? "fa-solid fa-circle-check mx-1" : "fa-solid fa-circle-xmark mx-1"}></i>
                                  {view.lastTest.message}
                                </span>
                                <span className="text-muted"> ({view.lastTestAtFormat})</span>
                              </>
                            ) : " chưa kiểm tra"}
                          </li>
                        </ul>
                      </div>
                      <div className="card-footer bg-transparent d-flex align-items-center gap-2 flex-wrap">
                        {canEdit ? (
                          <>
                            <IntegrationToggle integrationKey={definition.key} name={definition.name} enabled={Boolean(view.enabled)} />
                            <div className="d-flex gap-2">
                              <IntegrationTestButton integrationKey={definition.key} />
                              <a className="btn btn-sm btn-primary" href={adminUrl(`/integration/edit/${definition.key}`)}>
                                <i className="fa-solid fa-gear me-1"></i>
                                Cấu hình
                              </a>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted small">Bạn chỉ có quyền xem.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </>
    )
  })
}
