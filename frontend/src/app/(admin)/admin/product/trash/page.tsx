import { BackLink, Thumb, TrashActions } from "@/components/admin/list"
import { CardHeader, EmptyRow } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Thùng rác sản phẩm: /admin/product/trash

const path = "/product/trash"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ProductTrashPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const allProduct: any[] = data.allProduct || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              <BackLink href="/product/list" />
            </CardHeader>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Ảnh</th>
                    <th>Sản phẩm</th>
                    <th>Giá bán</th>
                    <th className="text-center">Tồn kho</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allProduct.length > 0 ? allProduct.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>
                        <div className="fw-medium">{item.name}</div>
                        {item.nameRu && <div className="small text-muted">{item.nameRu}</div>}
                        {item.sku && <div className="small text-muted">SKU: {item.sku}</div>}
                      </td>
                      <td className="text-nowrap">{item.priceFormat}</td>
                      <td className="text-center">{item.stock}</td>
                      <td>{item.status == "active" ? <span className="badge bg-success">Đang bán</span> : <span className="badge bg-danger">Ngừng bán</span>}</td>
                      <td className="text-end text-nowrap">
                        <TrashActions undoApi={`/product/undo/${item.id}`} deleteApi={`/product/delete-permanently/${item.id}`} />
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={7} text="Thùng rác trống" />}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  })
}
