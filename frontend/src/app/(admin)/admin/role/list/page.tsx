import { DeleteButton, EditLink, HeaderLink, StatusBadge, activeStatusMap } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh sách nhóm quyền: /admin/role/list

const path = "/role/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function RoleListPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const roleList: any[] = data.roleList || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("role-trash") && <HeaderLink href="/role/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("role-create") && <HeaderLink href="/role/create" icon="fa-solid fa-plus">Tạo nhóm quyền</HeaderLink>}
            </CardHeader>
            <div className="card-body pt-0">
              <div className="row">
                <div className="col-lg-12">
                  <SearchForm keyword={query.keyword || ""} />
                </div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Tên nhóm quyền</th>
                    <th>Mô tả</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {roleList.length > 0 ? roleList.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(data.pagination?.skip || 0) + index + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.description}</td>
                      <td><StatusBadge value={item.status} map={activeStatusMap} /></td>
                      <td className="text-end">
                        {can("role-edit") && <EditLink href={`/role/edit/${item.id}`} />}
                        {can("role-delete") && <DeleteButton api={`/role/delete/${item.id}`} />}
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={5} />}
                </tbody>
              </table>
              <AdminPagination totalPage={data.pagination?.totalPage} page={data.page || Number(query.page) || 1} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
