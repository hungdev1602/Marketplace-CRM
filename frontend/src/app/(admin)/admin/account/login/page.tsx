import { LoginForm } from "@/components/admin/views/LoginForm"
import { adminUrl } from "@/lib/admin"
import type { AdminPageProps } from "@/lib/admin-page"
import { loadPage } from "@/lib/server-api"

// Trang đăng nhập quản trị: /admin/account/login (đã đăng nhập thì server chuyển về trang tổng quan)

const load = async (props: AdminPageProps) => loadPage(adminUrl("/account/login"), await props.searchParams)

export async function generateMetadata(props: AdminPageProps) {
  const { data } = await load(props)
  return { title: data.pageTitle }
}

export default async function AdminLoginPage(props: AdminPageProps) {
  await load(props)

  return (
    <div className="container-xxl">
      <div className="row vh-100 d-flex justify-content-center">
        <div className="col-12 align-self-center">
          <div className="card-body">
            <div className="row">
              <div className="col-lg-4 col-md-6 mx-auto">
                <div className="card">
                  <div className="card-body p-0 bg-black auth-header-box rounded-top">
                    <div className="text-center p-3">
                      <img className="auth-logo" src="/admin/assets/images/sfoodie-logo.png" height={50} alt="SFoodie" />
                      <h4 className="mt-3 mb-1 fw-semibold text-white fs-18">Đăng nhập trang quản trị</h4>
                      <p className="text-muted fw-medium mb-0">Vui lòng đăng nhập để tiếp tục</p>
                    </div>
                  </div>
                  <div className="card-body pt-0">
                    <LoginForm />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
