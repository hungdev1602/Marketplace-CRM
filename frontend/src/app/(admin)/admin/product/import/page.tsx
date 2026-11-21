import { ProductImportForm } from "@/components/admin/views/ProductExcel"
import { adminApiUrl, adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"
import { AdminLink } from "@/components/admin/AdminLink"

// Nhập sản phẩm từ Excel: /admin/product/import
// Dữ liệu: hàm importPage ở server/controller/admin/product-excel.controller.ts

const path = "/product/import"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function ProductImportPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const can = (permission: string) => data.permissions.includes(permission)
    const importList: any[] = data.importList || []

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h4 className="card-title">{data.pageTitle}</h4>
                  <p className="text-muted mb-0">Thêm mới hoặc cập nhật hàng loạt sản phẩm bằng file Excel (.xlsx).</p>
                </div>
                <div className="col-auto">
                  {can("product-list") && (
                    <AdminLink className="btn btn-secondary" href={adminUrl("/product/list")}>
                      <i className="fa-solid fa-list me-1"></i>
                      Danh sách sản phẩm
                    </AdminLink>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              <h5 className="mb-2">Bước 1: Chuẩn bị file</h5>
              <div className="row g-3">
                <div className="col-lg-6">
                  <div className="border rounded p-3 h-100">
                    <h6>
                      <i className="fa-solid fa-file-circle-plus me-1 text-success"></i>
                      Thêm sản phẩm mới
                    </h6>
                    <p className="small text-muted mb-2">
                      Tải file mẫu, mỗi dòng nhập 1 sản phẩm. File mẫu có sẵn danh sách thả xuống (danh mục, xuất xứ, đơn vị...) và sheet &quot;Hướng dẫn&quot; giải thích từng cột.
                    </p>
                    <a className="btn btn-success btn-sm" href={adminApiUrl("/product/import/template")}>
                      <i className="fa-solid fa-download me-1"></i>
                      Tải file mẫu
                    </a>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="border rounded p-3 h-100">
                    <h6>
                      <i className="fa-solid fa-file-pen me-1 text-info"></i>
                      Cập nhật hàng loạt sản phẩm đã có
                    </h6>
                    <p className="small text-muted mb-2">
                      Vào Danh sách sản phẩm, lọc sản phẩm cần sửa rồi bấm &quot;Xuất Excel&quot;. Sửa giá, tồn kho... trong file đó rồi tải lên lại. Ô để trống giữ nguyên thông tin cũ.
                    </p>
                    {can("product-export") && can("product-list") && (
                      <AdminLink className="btn btn-info btn-sm" href={adminUrl("/product/list")}>
                        <i className="fa-solid fa-file-export me-1"></i>
                        Đến trang xuất Excel
                      </AdminLink>
                    )}
                  </div>
                </div>
              </div>
              <ul className="small text-muted mt-3 mb-0">
                <li>Mỗi lần nhập tối đa {data.maxRows} dòng, file .xlsx không quá {data.maxFileSize}MB.</li>
                <li>Ảnh: dán đường dẫn copy ở trang Quản lý file (/media/...) hoặc link ảnh trên mạng (https://...). Ảnh từ link ngoài được tự động tải về thư mục &quot;{data.imageFolder}&quot; trong Quản lý file.</li>
                <li>Dòng bị lỗi sẽ không được nhập, các dòng hợp lệ vẫn được nhập bình thường. Tải file lỗi để xem lỗi từng dòng, sửa rồi nhập lại file đó.</li>
              </ul>
            </div>
          </div>

          <ProductImportForm modeList={data.modeList || []} processingImportId={data.processingImport ? data.processingImport.id : ""} />

          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Lịch sử nhập file</h4>
              <p className="text-muted mb-0">Lưu {data.retentionDays} ngày gần nhất.</p>
            </div>
            <div className="card-body pt-0">
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Thời gian</th>
                      <th>Người nhập</th>
                      <th>Tên file</th>
                      <th>Chế độ</th>
                      <th>Trạng thái</th>
                      <th className="text-center">Thêm mới</th>
                      <th className="text-center">Cập nhật</th>
                      <th className="text-center">Lỗi</th>
                      <th className="text-end">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importList.length > 0 ? importList.map(item => (
                      <tr key={item.id}>
                        <td className="text-nowrap">{item.createdAtFormat}</td>
                        <td>{item.accountFullName}</td>
                        <td style={{ maxWidth: "260px" }}>{item.fileName}</td>
                        <td className="text-nowrap">{item.modeName}</td>
                        <td>
                          {item.statusInfo && <span className={`badge ${item.statusInfo.color}`}>{item.statusInfo.name}</span>}
                          {item.status == "processing" && <div className="small text-muted">{item.processedRows}/{item.totalRows} dòng</div>}
                          {item.message && <div className="small text-danger">{item.message}</div>}
                        </td>
                        <td className="text-center text-success">{item.createdCount}</td>
                        <td className="text-center text-info">{item.updatedCount}</td>
                        <td className="text-center text-danger">{item.failedCount}</td>
                        <td className="text-end text-nowrap">
                          {item.failedCount > 0 && item.status != "processing" && (
                            <a className="btn btn-outline-danger btn-sm" href={adminApiUrl(`/product/import/error-file/${item.id}`)}>
                              <i className="fa-solid fa-download me-1"></i>
                              File lỗi
                            </a>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={9} className="text-center">Chưa có lượt nhập file nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  })
}
