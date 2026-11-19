import { HeaderLink, StatusBadge, TrashActions } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác tài khoản quản trị: /admin/account-admin/trash

const path = "/account-admin/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

const accountStatusMap: { [value: string]: [string, string] } = {
  active: ["Hoạt động", "bg-success"],
  inactive: ["Tạm dừng", "bg-danger"],
  initial: ["Khởi tạo", "bg-warning"]
}

export default async function AccountAdminTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const allAccount: any[] = data.allAccount || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <HeaderLink href="/account-admin/list" icon="fa-solid fa-arrow-left">Danh sách tài khoản</HeaderLink>
            </CardHeader>
            <div className="card-body pt-0">
              <div className="row">
                <div className="col-lg-12">
                  <SearchForm keyword={query.keyword || ""} />
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>STT</th>
                      <th>Ảnh đại diện</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Nhóm quyền</th>
                      <th>Trạng thái</th>
                      <th className="text-end">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAccount.length > 0 ? allAccount.map((item, index) => (
                      <tr key={item.id}>
                        <td>{data.pagination.skip + index + 1}</td>
                        <td>{item.avatar && <img src={`${data.domainFileManager}${item.avatar}`} className="rounded thumb-lg me-1 d-inline" alt="" />}</td>
                        <td>{item.fullName}</td>
                        <td>{item.email}</td>
                        <td style={{ maxWidth: "200px" }}>
                          {(item.roleName || []).map((roleName: string) => <span key={roleName} className="badge bg-dark me-1">{roleName}</span>)}
                        </td>
                        <td><StatusBadge value={item.status} map={accountStatusMap} /></td>
                        <td className="text-end">
                          <TrashActions undoApi={`/account-admin/undo/${item.id}`} deleteApi={`/account-admin/delete-permanently/${item.id}`} />
                        </td>
                      </tr>
                    )) : <EmptyRow colSpan={7} />}
                  </tbody>
                </table>
              </div>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
