import { DeleteButton, EditLink, HeaderLink, StatusBadge, Thumb, activeStatusMap } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh mục bài viết: /admin/article/category

const path = "/article/category"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ArticleCategoryPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const allCategory: any[] = data.allCategory || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("article-category-trash") && <HeaderLink href="/article/category/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("article-category-create") && <HeaderLink href="/article/category/create" icon="fa-solid fa-plus">Tạo danh mục</HeaderLink>}
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
                    <th>Tên danh mục</th>
                    <th>Danh mục cha</th>
                    <th>Trạng thái</th>
                    <th>Lượt xem</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategory.length > 0 ? allCategory.map((item, index) => (
                    <tr key={item.id}>
                      <td>{data.pagination.skip + index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>{item.name}</td>
                      <td>{item.parentName}</td>
                      <td><StatusBadge value={item.status} map={activeStatusMap} /></td>
                      <td>{item.view}</td>
                      <td className="text-end">
                        {can("article-category-edit") && <EditLink href={`/article/category/edit/${item.id}`} />}
                        {can("article-category-delete") && <DeleteButton api={`/article/category/delete/${item.id}`} />}
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={7} />}
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
