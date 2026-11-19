import { CardHeader } from "@/components/admin/ui"
import { RoleForm } from "@/components/admin/views/AccountForms"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Sửa nhóm quyền: /admin/role/edit/:id

type Props = AdminPageProps<{ id: string }>

const path = ({ id }: { id: string }) => `/role/edit/${encodeURIComponent(id)}`

export const generateMetadata = (props: Props) => adminMetadata(path, props)

export default async function RoleEditPage(props: Props) {
  return adminPage(path, props, (data) => (
    <div className="card">
      <CardHeader title={data.pageTitle} />
      <div className="card-body pt-0">
        <RoleForm role={data.roleDetail} permissionList={data.permissionList || []} />
      </div>
    </div>
  ))
}
