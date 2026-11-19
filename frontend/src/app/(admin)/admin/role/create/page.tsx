import { CardHeader } from "@/components/admin/ui"
import { RoleForm } from "@/components/admin/views/AccountForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Tạo nhóm quyền: /admin/role/create

type Props = AdminPageProps

const path = "/role/create"

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function RoleCreatePage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <RoleForm permissionList={data.permissionList || []} />
      </div>
    </div>
  ))
}
