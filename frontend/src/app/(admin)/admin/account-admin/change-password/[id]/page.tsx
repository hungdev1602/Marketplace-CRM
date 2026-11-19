import { CardHeader } from "@/components/admin/ui"
import { ChangePasswordForm } from "@/components/admin/views/AccountForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Đổi mật khẩu tài khoản quản trị: /admin/account-admin/change-password/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/account-admin/change-password/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function ChangePasswordPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <ChangePasswordForm accountDetail={data.accountDetail} />
      </div>
    </div>
  ))
}
