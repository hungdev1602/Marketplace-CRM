import { CardHeader } from "@/components/admin/ui"
import { AccountAdminForm } from "@/components/admin/views/AccountForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa tài khoản quản trị: /admin/account-admin/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/account-admin/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function AccountAdminEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <AccountAdminForm accountDetail={data.accountDetail} roleList={data.roleList || []} />
      </div>
    </div>
  ))
}
