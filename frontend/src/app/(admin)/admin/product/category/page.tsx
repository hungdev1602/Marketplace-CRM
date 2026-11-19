import { DeleteButton, EditLink, HeaderLink, StatusBadge, Thumb, activeStatusMap } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, SearchForm } from "@/components/admin/ui"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh mục sản phẩm: /admin/product/category
// Dữ liệu: hàm category ở server/controller/admin/product.controller.ts

const path = "/product/category"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ProductCategoryPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const allCategory: any[] = data.allCategory || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("product-category-trash") && <HeaderLink href="/product/category/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("product-category-create") && <HeaderLink href="/product/category/create" icon="fa-solid fa-plus">Tạo danh mục</HeaderLink>}
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
                    <th>Ảnh</th>
                    <th>Tên danh mục</th>
                    <th>Danh mục cha</th>
                    <th className="text-center">Số sản phẩm</th>
                    <th className="text-center">Vị trí</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategory.length > 0 ? allCategory.map((item, index) => (
                    <tr key={item.id}>
                      <td>{data.pagination.skip + index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td>
                        <div className="fw-medium">{item.name}</div>
                        {item.nameRu && <small className="text-muted">{item.nameRu}</small>}
                      </td>
                      <td>{item.parentName}</td>
                      <td className="text-center">{item.productCount}</td>
                      <td className="text-center">{item.position}</td>
                      <td><StatusBadge value={item.status} map={activeStatusMap} /></td>
                      <td className="text-end text-nowrap">
                        {can("product-category-edit") && <EditLink href={`/product/category/edit/${item.id}`} />}
                        {can("product-category-delete") && <DeleteButton api={`/product/category/delete/${item.id}`} />}
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={8} />}
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
