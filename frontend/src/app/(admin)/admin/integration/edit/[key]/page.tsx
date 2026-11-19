import { CopyInput, IntegrationForm } from "@/components/admin/views/Integration"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Cấu hình 1 kết nối API: /admin/integration/edit/:key
// Dữ liệu: hàm edit ở server/controller/admin/integration.controller.ts

type Props = AdminPageProps<{ key: string }>

const path = ({ key }: { key: string }) => `/integration/edit/${encodeURIComponent(key)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function IntegrationEditPage(props: Props) {
  return adminPage(path, props, (data) => {
    const view = data.view
    const definition = view.definition
    const isSetting = Boolean(data.isSettingPage)
    const listUrl = adminUrl(isSetting ? "/setting/list" : "/integration/list")

    return (
      <>
        <div className="row mb-3 align-items-center">
          <div className="col">
            <a className="text-muted" href={listUrl}>
              <i className="fa-solid fa-arrow-left me-1"></i>
              {isSetting ? "Cài đặt cửa hàng" : "Kết nối API"}
            </a>
            <h4 className="mt-2 mb-0">
              <i className={`${definition.icon} me-2`}></i>
              {definition.name}
              {!isSetting && view.status && <span className={`badge ${view.status.color} ms-2 align-middle`}>{view.status.name}</span>}
            </h4>
            <div className="text-muted small mt-1">
              {definition.description}
              {view.updatedBy && <><br />Sửa gần nhất: {view.updatedBy} lúc {view.updatedAtFormat}</>}
            </div>
          </div>
        </div>

        {!isSetting && !data.canEncrypt && (
          <div className="alert alert-danger">
            Chưa có INTEGRATION_SECRET_KEY (hoặc JWT_SECRET) trong file .env nên không lưu được khoá API. Xem file .env.example.
          </div>
        )}

        <div className="row">
          <div className="col-lg-8">
            <IntegrationForm view={view} groups={data.groups || []} isSetting={isSetting} siteUrl={data.siteUrl} siteUrlHttps={Boolean(data.siteUrlHttps)} />
          </div>
          {isSetting ? (
            <div className="col-lg-4">
              <div className="card">
                <div className="card-body small">
                  <p className="mb-2">
                    <i className="fa-solid fa-circle-info me-1"></i>
                    Lưu là có hiệu lực ngay trên website, không cần khởi động lại server.
                  </p>
                  <p className="mb-2">Ô để trống = dùng giá trị mặc định (chữ mờ trong ô, lấy từ file config/variable.config.ts).</p>
                  <p className="mb-0">Mọi thay đổi được ghi vào Nhật ký hoạt động.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="col-lg-4">
              {/* Kết quả kiểm tra gần nhất */}
              <div className="card">
                <div className="card-header"><h4 className="card-title mb-0">Kiểm tra kết nối gần nhất</h4></div>
                <div className="card-body">
                  {view.lastTest ? (
                    <>
                      <div className={view.lastTest.ok ? "text-success fw-medium" : "text-danger fw-medium"}>
                        <i className={view.lastTest.ok ? "fa-solid fa-circle-check me-1" : "fa-solid fa-circle-xmark me-1"}></i>
                        {view.lastTest.message}
                      </div>
                      {(view.lastTest.details || []).length > 0 && (
                        <ul className="small mt-2 mb-2 ps-3">
                          {view.lastTest.details.map((line: string, index: number) => <li key={index}>{line}</li>)}
                        </ul>
                      )}
                      <div className="small text-muted">{view.lastTestAtFormat} · {view.lastTest.accountName}</div>
                    </>
                  ) : (
                    <p className="text-muted mb-0">Chưa kiểm tra. Bấm «Lưu &amp; kiểm tra kết nối».</p>
                  )}
                </div>
              </div>

              {/* Địa chỉ nhận thông báo của Т-Банк */}
              {definition.key == "tbank" && (
                <div className="card">
                  <div className="card-header"><h4 className="card-title mb-0">Địa chỉ nhận thông báo (webhook)</h4></div>
                  <div className="card-body">
                    <p className="small text-muted mb-2">Dán vào cài đặt terminal Т-Банк → Уведомления → по протоколу HTTP:</p>
                    <CopyInput value={data.tbankNotificationUrl || ""} />
                    {!data.siteUrlHttps && (
                      <div className="small text-warning mt-2">
                        SITE_URL trong .env chưa phải https: Т-Банк chỉ gửi thông báo tới tên miền thật có https.
                        {" "}Trên máy vẫn chạy được (server tự hỏi Т-Банк trạng thái thanh toán mỗi phút).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hướng dẫn từng bước (khai báo trong server/config/integration.config.ts, có thể chứa link) */}
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title mb-0">
                    <i className="fa-solid fa-book-open me-2"></i>
                    Hướng dẫn
                  </h4>
                </div>
                <div className="card-body integration-guide">
                  {(definition.guide || []).map((section: any, index: number) => (
                    <div key={index}>
                      <h6 className="fw-semibold mt-2">{section.title}</h6>
                      <ol className="small ps-3">
                        {(section.steps || []).map((step: string, stepIndex: number) => (
                          <li className="mb-1" key={stepIndex} dangerouslySetInnerHTML={{ __html: step }}></li>
                        ))}
                      </ol>
                    </div>
                  ))}
                  {(definition.website || definition.docsUrl) && (
                    <div className="small mt-2">
                      {definition.website && (
                        <a className="me-3" href={definition.website} target="_blank" rel="noopener">
                          <i className="fa-solid fa-globe me-1"></i>
                          Trang chủ
                        </a>
                      )}
                      {definition.docsUrl && (
                        <a href={definition.docsUrl} target="_blank" rel="noopener">
                          <i className="fa-solid fa-code me-1"></i>
                          Tài liệu API
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    )
  })
}
