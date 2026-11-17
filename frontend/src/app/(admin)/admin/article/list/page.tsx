import { DeleteButton, EditLink, HeaderLink, StatusBadge, Thumb, articleStatusMap } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh sách bài viết: /admin/article/list
// Dữ liệu: hàm list ở server/controller/admin/article.controller.ts

const path = "/article/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ArticleListPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const allArticle: any[] = data.allArticle || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("article-trash") && <HeaderLink href="/article/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("article-create") && <HeaderLink href="/article/create" icon="fa-solid fa-plus">Tạo bài viết</HeaderLink>}
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
                    <th>Avatar</th>
                    <th>Tên bài viết</th>
                    <th>Trạng thái</th>
                    <th>Lượt xem</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allArticle.length > 0 ? allArticle.map((item, index) => (
                    <tr key={item.id}>
                      <td>{data.pagination.skip + index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>{item.name}</td>
                      <td><StatusBadge value={item.status} map={articleStatusMap} /></td>
                      <td>{item.view}</td>
                      <td className="text-end">
                        {can("article-edit") && <EditLink href={`/article/edit/${item.id}`} />}
                        {can("article-delete") && <DeleteButton api={`/article/delete/${item.id}`} />}
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={6} />}
                </tbody>
              </table>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
