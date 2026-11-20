import { adminUrl } from "@/lib/admin"
import { AdminLink } from "@/components/admin/AdminLink"

// Trang 404 của trang admin
export const metadata = { title: "Không tìm thấy trang" }

export default function AdminNotFound() {
  return (
    <div className="container-xxl">
      <div className="row vh-100 d-flex justify-content-center">
        <div className="col-12 align-self-center">
          <div className="row">
            <div className="col-lg-5 col-md-8 mx-auto">
              <div className="card">
                <div className="card-body text-center p-5">
                  <h1 className="display-3 fw-bold mb-2">404</h1>
                  <h4 className="mb-3">Không tìm thấy trang</h4>
                  <p className="text-muted mb-4">Đường dẫn không đúng hoặc dữ liệu đã bị xoá.</p>
                  <AdminLink className="btn btn-primary" href={adminUrl("/dashboard")}>
                    <i className="fa-solid fa-house me-1"></i>
                    Về trang tổng quan
                  </AdminLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
