import { adminUrl } from "@/lib/admin"
import { cx } from "@/lib/format"
import { Startbar, Topbar } from "./AdminNav"
import { AdminProvider } from "./AdminProvider"
import { FileManagerModal } from "./FileManagerModal"

// Khung của mọi trang admin: thanh trên cùng, menu bên trái, nội dung trang, cửa sổ chọn file
// data: dữ liệu server Express trả về cho trang (có sẵn tài khoản đang đăng nhập và danh sách quyền)
// - blank: trang không có menu (trang quản lý file mở trong iframe)
export function AdminShell({ data, blank, children }: { data: any, blank?: boolean, children: React.ReactNode }) {
  const value = {
    account: data.account || null,
    permissions: data.permissions || [],
    fileUrl: data.domainFileManager || ""
  }

  if(blank) {
    return <AdminProvider value={value}>{children}</AdminProvider>
  }

  return (
    <AdminProvider value={value}>
      <Topbar />
      <Startbar />
      <div className="page-wrapper">
        <div className="page-content">
          <div className="container-xxl">{children}</div>
          <footer className="footer text-center text-sm-start d-print-none">
            <div className="container-xxl">
              <div className="row">
                <div className="col-12">
                  <div className="card mb-0 rounded-bottom-0">
                    <div className="card-body">
                      <p className="text-muted mb-0">
                        © {new Date().getFullYear()}{" "}
                        <span className="text-muted d-none d-sm-inline-block float-end">
                          Crafted with <i className="iconoir-heart text-danger"></i> by Nguyễn Đình Hưng
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
      <FileManagerModal />
    </AdminProvider>
  )
}

// Thông báo "Không có quyền truy cập" (server trả về khi tài khoản không có quyền vào trang)
export function Forbidden({ data }: { data: any }) {
  const permissions: string[] = data.permissions || []
  const canDashboard = permissions.includes("dashboard")

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6 col-md-8">
        <div className="card mt-4">
          <div className="card-body text-center p-5">
            <i className="fa-solid fa-lock text-danger" style={{ fontSize: "3rem" }}></i>
            <h4 className="mt-3 mb-2">{data.pageTitle}</h4>
            <p className={cx("text-muted", canDashboard ? "mb-4" : "mb-0")}>
              Tài khoản của bạn chưa được cấp quyền vào trang này.
              <br />
              {permissions.length > 0
                ? "Hãy chọn chức năng khác ở menu bên trái, hoặc liên hệ Super Admin để được cấp thêm quyền."
                : "Vui lòng liên hệ Super Admin để được cấp quyền."}
            </p>
            {canDashboard && (
              <a className="btn btn-primary" href={adminUrl("/dashboard")}>
                <i className="fa-solid fa-house me-1"></i>
                Về trang tổng quan
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
