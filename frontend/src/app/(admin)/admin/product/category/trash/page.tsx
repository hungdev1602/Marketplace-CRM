import { BackLink, StatusBadge, Thumb, TrashActions, activeStatusMap } from "@/components/admin/list"
import { CardHeader, EmptyRow } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác danh mục sản phẩm: /admin/product/category/trash

const path = "/product/category/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ProductCategoryTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const allCategory: any[] = data.allCategory || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <BackLink href="/product/category" />
            </CardHeader>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Ảnh</th>
                    <th>Tên danh mục</th>
                    <th>Danh mục cha</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategory.length > 0 ? allCategory.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>
                        <div className="fw-medium">{item.name}</div>
                        {item.nameRu && <small className="text-muted">{item.nameRu}</small>}
                      </td>
                      <td>{item.parentName}</td>
                      <td><StatusBadge value={item.status} map={activeStatusMap} /></td>
                      <td className="text-end text-nowrap">
                        <TrashActions undoApi={`/product/category/undo/${item.id}`} deleteApi={`/product/category/delete-permanently/${item.id}`} />
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
