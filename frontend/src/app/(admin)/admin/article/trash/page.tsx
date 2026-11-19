import { BackLink, StatusBadge, Thumb, TrashActions, articleStatusMap } from "@/components/admin/list"
import { CardHeader, EmptyRow } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác bài viết: /admin/article/trash (khôi phục, xoá vĩnh viễn)

const path = "/article/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ArticleTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const allArticle: any[] = data.allArticle || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <BackLink href="/article/list" />
            </CardHeader>
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
                      <td>{index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>{item.name}</td>
                      <td><StatusBadge value={item.status} map={articleStatusMap} /></td>
                      <td>{item.view}</td>
                      <td className="text-end">
                        <TrashActions undoApi={`/article/undo/${item.id}`} deleteApi={`/article/delete-permanently/${item.id}`} />
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
