import { DeleteButton, EditLink, HeaderLink, Thumb } from "@/components/admin/list"
import { AdminPagination, CardHeader, EmptyRow, FilterForm } from "@/components/admin/ui"
import { ProductExportModal } from "@/components/admin/views/ProductExcel"
import { TreeOptions } from "@/components/admin/form"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Danh sách sản phẩm: /admin/product/list (lọc, sắp xếp, xuất Excel)
// Dữ liệu: hàm list ở server/controller/admin/product.controller.ts

const path = "/product/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ProductListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const allProduct: any[] = data.allProduct || []
    const filter = data.filter || {}
    const options = data.options || {}
    const select = (name: string, label: string, emptyLabel: string | null, list: any[], className = "col-md-6 col-lg-2") => (
      <div className={className}>
        <label className="form-label" htmlFor={`filter-${name}`}>{label}</label>
        <select className="form-select" id={`filter-${name}`} name={name} defaultValue={filter[name] || ""}>
          {emptyLabel !== null && <option value="">{emptyLabel}</option>}
          {(list || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
    )

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <CardHeader title={data.pageTitle}>
              {can("product-trash") && <HeaderLink href="/product/trash" icon="fa-solid fa-trash" className="btn btn-danger me-1">Thùng rác</HeaderLink>}
              {can("product-import") && <HeaderLink href="/product/import" icon="fa-solid fa-file-import" className="btn btn-outline-success me-1">Nhập Excel</HeaderLink>}
              {can("product-export") && (
                <button className="btn btn-success me-1" type="button" data-bs-toggle="modal" data-bs-target="#modalProductExport">
                  <i className="fa-solid fa-file-export me-1"></i>
                  Xuất Excel
                </button>
              )}
              {can("product-create") && <HeaderLink href="/product/create" icon="fa-solid fa-plus">Tạo sản phẩm</HeaderLink>}
            </CardHeader>
            <div className="card-body pt-0">
              <FilterForm className="row g-2 align-items-end mb-3">
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filter-keyword">Từ khoá</label>
                  <input className="form-control" id="filter-keyword" type="text" name="keyword" placeholder="Tên (Việt / Nga), SKU, mã vạch, thương hiệu..." defaultValue={filter.keyword} />
                </div>
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filter-category">Danh mục</label>
                  <select className="form-select" id="filter-category" name="category" defaultValue={filter.category || ""}>
                    <option value="">-- Tất cả danh mục --</option>
                    <TreeOptions list={data.categoryTree || []} />
                  </select>
                </div>
                {select("status", "Trạng thái", "-- Tất cả trạng thái --", [{ id: "active", name: "Đang bán" }, { id: "inactive", name: "Ngừng bán" }], "col-md-6 col-lg-4")}
                {select("origin", "Xuất xứ", "-- Tất cả xuất xứ --", options.originList)}
                {select("storageType", "Bảo quản", "-- Tất cả --", options.storageList)}
                {select("stock", "Tồn kho", "-- Tất cả --", data.stockFilterList)}
                {select("missing", "Còn thiếu", "-- Không lọc --", data.missingInfoList)}
                {select("sort", "Sắp xếp", null, data.sortList)}
                <div className="col-md-12 col-lg-2">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <a className="btn btn-secondary" href={adminUrl("/product/list")}>Xoá lọc</a>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} sản phẩm</p>
            </div>
            <div className="table-responsive">
              <table className="table table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th>STT</th>
                    <th>Ảnh</th>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá bán</th>
                    <th className="text-center">Tồn kho</th>
                    <th>Bảo quản</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allProduct.length > 0 ? allProduct.map((item, index) => (
                    <tr key={item.id}>
                      <td>{data.pagination.skip + index + 1}</td>
                      <td><Thumb fileUrl={data.domainFileManager} path={item.avatar} /></td>
                      <td style={{ minWidth: "220px" }}>
                        <div className="fw-medium">{item.name}</div>
                        {item.nameRu && <div className="small text-muted">{item.nameRu}</div>}
                        <div className="small text-muted">
                          {item.sku && <span className="me-2">SKU: {item.sku}</span>}
                          {item.netWeight ? <span className="me-2">{item.netWeight} {item.netWeightUnit}</span> : null}
                          {item.originName && <span>{item.originName}</span>}
                        </div>
                      </td>
                      <td style={{ minWidth: "140px" }}>{(item.categoryName || []).join(", ") || "--"}</td>
                      <td className="text-nowrap">
                        <div className="fw-medium">
                          {item.priceFormat}
                          {item.unitName && <span className="small text-muted"> / {item.unitName}</span>}
                        </div>
                        {item.discountPercent ? (
                          <div className="small">
                            <del className="text-muted me-1">{item.priceOldFormat}</del>
                            <span className="badge bg-danger">-{item.discountPercent}%</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="text-center">
                        {!(item.stock > 0) ? (
                          <span className="badge bg-danger">Hết hàng</span>
                        ) : item.stock <= data.lowStockThreshold ? (
                          <span className="badge bg-warning" title="Sắp hết hàng">{item.stock}</span>
                        ) : (
                          <span>{item.stock}</span>
                        )}
                        <div className="small text-muted">Đã bán: {item.sold}</div>
                      </td>
                      <td>
                        {item.storage && <span className={`badge ${item.storage.color} text-wrap text-start`}>{item.storage.name}</span>}
                      </td>
                      <td>
                        {item.status == "active" ? <span className="badge bg-success">Đang bán</span> : <span className="badge bg-danger">Ngừng bán</span>}
                        {item.featured && <div><span className="badge bg-warning mt-1">Nổi bật</span></div>}
                        {item.newArrival && <div><span className="badge bg-info mt-1">Hàng mới</span></div>}
                        {item.markingRequired && <div><span className="badge bg-dark mt-1" title="Hàng bắt buộc dán mã Честный знак">Честный знак</span></div>}
                      </td>
                      <td className="text-end text-nowrap">
                        {can("product-edit") && <EditLink href={`/product/edit/${item.id}`} />}
                        {can("product-delete") && <DeleteButton api={`/product/delete/${item.id}`} />}
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={9} />}
                </tbody>
              </table>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
        {can("product-export") && <ProductExportModal totalRecord={data.pagination.totalRecord} groupList={data.excelGroupList || []} />}
      </div>
    )
  })
}
