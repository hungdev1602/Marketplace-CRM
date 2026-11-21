import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"
import { AdminLink } from "@/components/admin/AdminLink"

// Cài đặt cửa hàng: /admin/setting/list
// Khoá API của dịch vụ bên ngoài (Т-Банк, ApiShip, email) và cách gửi hàng, đóng gói, hoá đơn điện tử nằm ở trang Kết nối API

const path = "/setting/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function SettingListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const canIntegration = (data.permissions || []).some((item: string) => ["integration-view", "integration-edit"].includes(item))
    return (
      <>
        <div className="row mb-3 align-items-center">
          <div className="col">
            <h4 className="mb-1">{data.pageTitle}</h4>
            <p className="text-muted mb-0">
              Các cài đặt của website, sửa là có hiệu lực ngay, không cần sửa code hay khởi động lại server.
              {canIntegration && <> Khoá API, cách gửi hàng, đóng gói, hoá đơn điện tử (54-ФЗ) ở trang <AdminLink href={adminUrl("/integration/list")}>Kết nối API</AdminLink>.</>}
            </p>
          </div>
        </div>
        <div className="row">
          {(data.views || []).map((view: any) => {
            const definition = view.definition
            return (
              <div className="col-lg-6 col-xxl-3 mb-3" key={definition.key}>
                <div className="card h-100 integration-card">
                  <div className="card-body">
                    <div className="d-flex align-items-start gap-3">
                      <div className="integration-icon"><i className={definition.icon}></i></div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1">{definition.name}</h5>
                        {view.customCount > 0
                          ? <span className="badge bg-success-subtle text-success">{view.customCount} mục đã sửa</span>
                          : <span className="badge bg-secondary-subtle text-secondary">Đang dùng mặc định</span>}
                      </div>
                    </div>
                    <p className="text-muted small mt-2 mb-2">{definition.description}</p>
                    {view.updatedAtFormat && <div className="small text-muted">Sửa lúc {view.updatedAtFormat} · {view.updatedBy}</div>}
                  </div>
                  <div className="card-footer bg-transparent text-end">
                    <AdminLink className="btn btn-sm btn-primary" href={adminUrl(`/setting/edit/${definition.key}`)}>
                      <i className="fa-solid fa-pen me-1"></i>
                      Sửa
                    </AdminLink>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  })
}
