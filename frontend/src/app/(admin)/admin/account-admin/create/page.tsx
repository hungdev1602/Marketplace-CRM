import { CardHeader } from "@/components/admin/ui"
import { AccountAdminForm } from "@/components/admin/views/AccountForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo tài khoản quản trị: /admin/account-admin/create

type Props = AdminPageProps

const path = "/account-admin/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function AccountAdminCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <AccountAdminForm roleList={data.roleList || []} />
      </div>
    </div>
  ))
}
