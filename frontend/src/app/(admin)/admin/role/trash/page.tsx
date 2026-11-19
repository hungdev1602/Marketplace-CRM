import { HeaderLink, StatusBadge, TrashActions, activeStatusMap } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác nhóm quyền: /admin/role/trash

const path = "/role/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function RoleTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const roleList: any[] = data.roleList || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <HeaderLink href="/role/list" icon="fa-solid fa-arrow-left">Danh sách nhóm quyền</HeaderLink>
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
                        <TrashActions undoApi={`/role/undo/${item.id}`} deleteApi={`/role/delete-permanently/${item.id}`} />
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
