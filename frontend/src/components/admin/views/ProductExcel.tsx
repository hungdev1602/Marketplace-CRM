"use client"

import { useEffect, useRef, useState } from "react"
import Swal from "sweetalert2"
import { adminApiUrl, adminRequest } from "../api"
import { drawNotify, notifyError, notifySuccess } from "../notify"

// ===== Xuất / nhập sản phẩm bằng file Excel =====

// Đóng cửa sổ modal của Bootstrap
const hideModal = (selector: string) => {
  const element = document.querySelector(selector)
  const bootstrap = (window as any).bootstrap
  if(element && bootstrap) bootstrap.Modal.getOrCreateInstance(element).hide()
}

// Cửa sổ "Xuất sản phẩm ra Excel" ở trang danh sách sản phẩm
// Giữ nguyên bộ lọc, sắp xếp đang chọn trên đường dẫn, thêm phạm vi xuất (scope) và nhóm thông tin cần xuất (groups)
export function ProductExportModal({ totalRecord, groupList }: { totalRecord: number, groupList: any[] }) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const groups = formData.getAll("groups").map(value => `${value}`)
    if(groups.length === 0) {
      notifyError("Vui lòng chọn ít nhất 1 nhóm thông tin cần xuất!")
      return
    }

    const scope = `${formData.get("scope")}`
    const url = new URL(adminApiUrl("/product/export"), window.location.origin)
    if(scope === "filter") {
      new URL(window.location.href).searchParams.forEach((value, key) => {
        if(key !== "page") url.searchParams.set(key, value)
      })
    }
    url.searchParams.set("scope", scope)
    url.searchParams.set("groups", groups.join(","))

    // Server trả về file nên trình duyệt chỉ tải file xuống, vẫn ở trang hiện tại
    window.location.href = url.href
    hideModal("#modalProductExport")
    notifySuccess("Đang tạo file Excel, file sẽ tự động tải xuống...")
  }

  return (
    <div className="modal fade" id="modalProductExport" tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">Xuất sản phẩm ra Excel</h5>
            <button className="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <label className="form-label fw-medium">Sản phẩm cần xuất</label>
            <div className="form-check">
              <input className="form-check-input" id="exportScopeFilter" type="radio" name="scope" value="filter" defaultChecked />
              <label className="form-check-label" htmlFor="exportScopeFilter">Theo bộ lọc đang chọn ({totalRecord} sản phẩm)</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" id="exportScopeAll" type="radio" name="scope" value="all" />
              <label className="form-check-label" htmlFor="exportScopeAll">Tất cả sản phẩm (không tính thùng rác)</label>
            </div>
            <label className="form-label fw-medium mt-3">Thông tin cần xuất</label>
            <p className="small text-muted mb-2">
              Cột ID sản phẩm, Mã SKU, Tên sản phẩm luôn được xuất để nhập lại cập nhật được sản phẩm. Chỉ cần sửa giá và tồn kho thì chỉ chọn nhóm &quot;Giá &amp; kho hàng&quot;.
            </p>
            {groupList.map(group => (
              <div className="form-check" key={group.id}>
                <input className="form-check-input" id={`exportGroup-${group.id}`} type="checkbox" name="groups" value={group.id} defaultChecked />
                <label className="form-check-label" htmlFor={`exportGroup-${group.id}`}>
                  <span>{group.name}</span>
                  <span className="small text-muted"> - {group.description}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Huỷ</button>
            <button className="btn btn-success" type="submit">
              <i className="fa-solid fa-download me-1"></i>
              Tải file Excel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Gọi API trả về file (ví dụ file lỗi) rồi tải xuống; API trả về JSON là bị lỗi
const downloadFileFromApi = async (path: string, formData: FormData) => {
  const response = await fetch(adminApiUrl(path), { method: "POST", body: formData })
  if((response.headers.get("Content-Type") || "").includes("application/json")) {
    const data = await response.json()
    notifyError(data.message)
    return
  }
  // Tên file trong header Content-Disposition
  const disposition = response.headers.get("Content-Disposition") || ""
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^";]+)"?/i)
  const link = document.createElement("a")
  link.href = URL.createObjectURL(await response.blob())
  link.download = match ? decodeURIComponent(match[1]) : "file.xlsx"
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10000)
}

type Preview = {
  summary: { totalRows: number, createCount: number, updateCount: number, errorCount: number, imageCount: number }
  columnList: string[]
  ignoredHeaders: string[]
  errorList: { row: number, sku: string, name: string, messages: string[] }[]
}

type Progress = { percent: number, text: string }

// Bước 2, 3 của trang nhập sản phẩm từ Excel (/admin/product/import)
// - Kiểm tra file (POST /product/import/preview): hiện số dòng thêm mới, cập nhật, lỗi
// - Xác nhận nhập (POST /product/import): server nhập dần, trang hỏi tiến độ mỗi 1,5 giây
// - processingImportId: đang có lượt nhập chưa xong (ví dụ tải lại trang khi đang nhập) thì tiếp tục theo dõi
export function ProductImportForm({ modeList, processingImportId }: { modeList: any[], processingImportId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  // Lượt theo dõi tiến độ đang chạy: rời trang (chuyển trang không tải lại) thì dừng hỏi server
  const trackIdRef = useRef(0)

  // Dữ liệu gửi lên: file và chế độ nhập
  const getImportFormData = (): FormData | null => {
    const form = formRef.current
    const fileInput = form?.querySelector<HTMLInputElement>("[name='file']")
    const file = fileInput?.files?.[0]
    if(!form || !file) return null
    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", `${new FormData(form).get("mode") || ""}`)
    return formData
  }

  // Theo dõi tiến độ nhập file, xong thì lấy lại dữ liệu trang để xem kết quả ở lịch sử nhập file
  const trackImportProgress = (importId: string) => {
    setIsImporting(true)
    setProgress({ percent: 0, text: "" })
    const trackId = ++trackIdRef.current

    const checkStatus = async () => {
      if(trackId !== trackIdRef.current) return
      const data = await adminRequest(`/product/import/status/${importId}`)
      if(trackId !== trackIdRef.current) return
      if(data.code === "error") {
        // mất kết nối thì thử lại
        if(/kết nối/i.test(data.message || "")) {
          setTimeout(checkStatus, 3000)
          return
        }
        notifyError(data.message || "")
        return
      }

      const item = data.importRecord
      const percent = item.totalRows > 0 ? Math.floor(item.processedRows * 100 / item.totalRows) : 0
      setProgress({
        percent,
        text: `Đã xử lý ${item.processedRows}/${item.totalRows} dòng: thêm mới ${item.createdCount}, cập nhật ${item.updatedCount}, lỗi ${item.failedCount}`
      })

      if(item.status === "done") {
        drawNotify("success", `Nhập file xong: thêm mới ${item.createdCount}, cập nhật ${item.updatedCount}, lỗi ${item.failedCount} dòng`)
        return
      }
      if(item.status === "failed") {
        drawNotify("error", item.message || "Nhập file thất bại!")
        return
      }
      setTimeout(checkStatus, 1500)
    }
    checkStatus()
  }

  useEffect(() => {
    if(processingImportId) trackImportProgress(processingImportId)
    const trackId = trackIdRef // bộ đếm (không phải thẻ HTML), đọc giá trị mới nhất lúc rời trang là đúng ý
    return () => {
      trackId.current++ // rời trang: dừng theo dõi
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bước 2: Kiểm tra file
  const handleCheck = async (event: React.FormEvent) => {
    event.preventDefault()
    const formData = getImportFormData()
    if(!formData) {
      notifyError("Vui lòng chọn file Excel!")
      return
    }

    setIsChecking(true)
    const data = await adminRequest("/product/import/preview", "POST", formData)
    setIsChecking(false)

    if(data.code === "error") {
      notifyError(data.message || "")
      setPreview(null)
      return
    }

    setPreview(data as unknown as Preview)
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  // Tải file lỗi (các dòng lỗi kèm cột "Lỗi", sửa xong nhập lại file này)
  const handleErrorFile = async () => {
    const formData = getImportFormData()
    if(!formData) return
    setIsDownloading(true)
    try {
      await downloadFileFromApi("/product/import/preview-error-file", formData)
    } catch {
      notifyError("Không tải được file lỗi, vui lòng thử lại!")
    }
    setIsDownloading(false)
  }

  // Bước 3: Xác nhận nhập
  const handleConfirm = async () => {
    if(!preview) return
    const { summary } = preview
    const result = await Swal.fire({
      title: "Xác nhận nhập file?",
      text: `Thêm mới ${summary.createCount} và cập nhật ${summary.updateCount} sản phẩm. Các dòng lỗi sẽ bị bỏ qua.`,
      showCancelButton: true,
      confirmButtonText: "Nhập",
      cancelButtonText: "Huỷ"
    })
    if(!result.isConfirmed) return

    const formData = getImportFormData()
    if(!formData) return
    setIsImporting(true)
    const data = await adminRequest("/product/import", "POST", formData)
    if(data.code === "error") {
      notifyError(data.message || "")
      setIsImporting(false)
      return
    }
    setPreview(null)
    trackImportProgress(data.importId)
  }

  const summary = preview?.summary
  const validCount = summary ? summary.createCount + summary.updateCount : 0

  return (
    <>
      <div className="card">
        <div className="card-body">
          <h5 className="mb-3">Bước 2: Tải file lên</h5>
          {/* Đổi file hoặc chế độ nhập thì phải kiểm tra lại */}
          <form ref={formRef} onSubmit={handleCheck} onChange={() => setPreview(null)}>
            <div className="row g-3">
              <div className="col-lg-5">
                <label className="form-label" htmlFor="importFile">File Excel (.xlsx)</label>
                <input
                  className="form-control"
                  id="importFile"
                  type="file"
                  name="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
              </div>
              <div className="col-lg-7">
                <label className="form-label">Chế độ nhập</label>
                {modeList.map((mode, index) => (
                  <div className="form-check" key={mode.id}>
                    <input className="form-check-input" id={`importMode-${mode.id}`} type="radio" name="mode" value={mode.id} defaultChecked={index === 0} />
                    <label className="form-check-label" htmlFor={`importMode-${mode.id}`}>
                      <span className="fw-medium">{mode.name}</span>
                      <span className="small text-muted"> - {mode.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-primary mt-3" type="submit" disabled={isChecking || isImporting}>
              <i className="fa-solid fa-magnifying-glass me-1"></i>
              Kiểm tra file
            </button>
          </form>
        </div>
      </div>

      {preview && summary && (
        <div className="card" ref={previewRef}>
          <div className="card-body">
            <h5 className="mb-3">Bước 3: Kiểm tra và xác nhận</h5>
            <div className="row g-2 mb-3 text-center">
              {[
                { value: summary.totalRows, label: "Tổng số dòng", className: "" },
                { value: summary.createCount, label: "Thêm mới", className: "text-success" },
                { value: summary.updateCount, label: "Cập nhật", className: "text-info" },
                { value: summary.errorCount, label: "Dòng lỗi (bỏ qua)", className: "text-danger" }
              ].map(item => (
                <div className="col-6 col-md" key={item.label}>
                  <div className="border rounded p-2">
                    <div className={`fs-4 fw-semibold ${item.className}`}>{item.value}</div>
                    <div className="small text-muted">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="small text-muted mb-1">Các cột đọc được ({preview.columnList.length}): {preview.columnList.join(", ")}</p>
            {preview.ignoredHeaders.length > 0 && (
              <div className="alert alert-warning small py-2">
                Các cột sau không khớp tên cột của file mẫu nên bị bỏ qua: {preview.ignoredHeaders.join(", ")}
              </div>
            )}
            {summary.imageCount > 0 && (
              <div className="alert alert-info small py-2">
                Có {summary.imageCount} ảnh từ link ngoài sẽ được tải về Quản lý file, quá trình nhập có thể mất vài phút.
              </div>
            )}
            {summary.errorCount > 0 && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0 text-danger">Danh sách dòng lỗi</h6>
                  <button className="btn btn-outline-danger btn-sm" type="button" disabled={isDownloading} onClick={handleErrorFile}>
                    <i className="fa-solid fa-download me-1"></i>
                    Tải file lỗi
                  </button>
                </div>
                {summary.errorCount > preview.errorList.length && (
                  <p className="small text-muted mb-2">Đang hiện {preview.errorList.length}/{summary.errorCount} dòng lỗi, tải file lỗi để xem tất cả.</p>
                )}
                <div className="table-responsive" style={{ maxHeight: "400px" }}>
                  <table className="table table-sm table-striped mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Dòng</th>
                        <th>Mã SKU</th>
                        <th>Tên sản phẩm</th>
                        <th>Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.errorList.map(item => (
                        <tr key={item.row}>
                          <td>{item.row}</td>
                          <td>{item.sku}</td>
                          <td>{item.name}</td>
                          <td className="text-danger">
                            {item.messages.map((message, index) => <div key={index}>{message}</div>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-3">
              <button className="btn btn-success" type="button" disabled={validCount === 0 || isImporting} onClick={handleConfirm}>
                <i className="fa-solid fa-file-import me-1"></i> Xác nhận nhập {validCount} dòng hợp lệ
              </button>
              <span className="small text-muted ms-2">Chỉ nhập các dòng hợp lệ.</span>
            </div>
          </div>
        </div>
      )}

      {progress && (
        <div className="card">
          <div className="card-body">
            <h5 className="mb-2">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Đang nhập file, vui lòng không tắt server...
            </h5>
            <div className="progress mb-2" style={{ height: "20px" }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${progress.percent}%` }}>{progress.percent}%</div>
            </div>
            <p className="small text-muted mb-0">{progress.text}</p>
          </div>
        </div>
      )}
    </>
  )
}
