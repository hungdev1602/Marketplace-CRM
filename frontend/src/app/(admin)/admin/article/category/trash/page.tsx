import { BackLink, StatusBadge, TrashActions, activeStatusMap } from "@/components/admin/list"
import { CardHeader, EmptyRow } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác danh mục bài viết: /admin/article/category/trash

const path = "/article/category/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ArticleCategoryTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const allCategory: any[] = data.allCategory || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <BackLink href="/article/category" />
            </CardHeader>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
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
                      <td>{index + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.parentName}</td>
                      <td><StatusBadge value={item.status} map={activeStatusMap} /></td>
                      <td>{item.view}</td>
                      <td className="text-end">
                        <TrashActions undoApi={`/article/category/undo/${item.id}`} deleteApi={`/article/category/delete-permanently/${item.id}`} />
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={6} text="Thùng rác trống" />}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  })
}
