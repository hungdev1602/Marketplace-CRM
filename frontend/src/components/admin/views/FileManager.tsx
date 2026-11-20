"use client"

import { useEffect, useRef, useState } from "react"
import Swal from "sweetalert2"
import { adminApiUrl, adminUrl } from "@/lib/admin"
import { adminRequest } from "../api"
import { useAdmin } from "../AdminProvider"
import { drawNotify, notifyError, notifySuccess } from "../notify"
import { AdminPagination } from "../ui"
import { AdminLink } from "../AdminLink"

// ===== Trang Quản lý file (/admin/file-manager) =====
// File lưu ở server quản lý file (repo file-manager-microservice), server Express chuyển tiếp các thao tác sang đó
// Trang này mở cả trong cửa sổ "Chọn File" (iframe) ở các form: bấm nút copy cạnh file rồi dán đường dẫn vào ô

type FileItem = { id: string, folder: string, filename: string, mimetype: string, createdAtFormat: string, sizeFormat: string }
type FolderItem = { name: string, createdAtFormat: string }

// Đường dẫn trang quản lý file của 1 thư mục con (folderPath: "Folder 1/Folder 2")
const folderUrl = (folderPath: string) => adminUrl("/file-manager") + (folderPath ? `?folderPath=${encodeURIComponent(folderPath)}` : "")

// Khung tải file lên (thư viện Uppy), file được tải lên thư mục đang xem
function UploadBox({ folderPath }: { folderPath: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let uppy: any = null
    let isCancelled = false

    // Thư viện Uppy chỉ tải ở trang có khung upload
    Promise.all([
      import("@uppy/core"),
      import("@uppy/dashboard"),
      import("@uppy/xhr-upload"),
      import("@uppy/core/css/style.min.css" as string),
      import("@uppy/dashboard/css/style.min.css" as string)
    ]).then(([core, dashboard, xhrUpload]) => {
      if(isCancelled || !boxRef.current) return
      const Uppy: any = core.default
      const Dashboard: any = dashboard.default
      const XHRUpload: any = xhrUpload.default

      uppy = new Uppy()
      uppy.use(Dashboard, { target: boxRef.current, inline: true, width: "100%" })
      uppy.use(XHRUpload, {
        // mặc định method="POST", gửi nhiều file trong 1 lần (bundle), trường "files" bên server nhận
        endpoint: adminApiUrl(`/file-manager/upload?folderPath=${encodeURIComponent(folderPath)}`),
        fieldName: "files",
        bundle: true
      })
      uppy.on("upload-success", (_file: any, response: any) => {
        if(response?.body?.code === "success") drawNotify("success", "Upload file thành công")
        else notifyError("Upload file thất bại")
      })
      setStatus("ready")
    }).catch((error) => {
      console.error("Không tải được thư viện Uppy", error)
      if(!isCancelled) setStatus("error")
    })

    return () => {
      isCancelled = true
      uppy?.destroy?.()
    }
  }, [folderPath])

  return (
    <div ref={boxRef}>
      {status === "loading" && <div className="text-muted">Đang tải khung upload...</div>}
      {status === "error" && <div className="text-danger">Không tải được khung upload, vui lòng tải lại trang (F5).</div>}
    </div>
  )
}

// Hiện ảnh / video / âm thanh / PDF trong cửa sổ "Xem"
function PreviewModal({ file, onClose }: { file: { src: string, mimetype: string, name: string } | null, onClose: () => void }) {
  if(!file) return null
  const { src, mimetype } = file
  let content: React.ReactNode = null
  if(mimetype.includes("image")) {
    content = (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "600px", overflow: "hidden" }}>
        <img src={src} alt="" style={{ height: "600px", width: "auto", objectFit: "cover" }} />
      </div>
    )
  }
  else if(mimetype.includes("video")) content = <video src={src} controls width="100%" height="600"></video>
  else if(mimetype.includes("audio")) {
    content = (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "600px" }}>
        <audio src={src} controls></audio>
      </div>
    )
  }
  else if(mimetype.includes("pdf")) content = <iframe src={src} width="100%" height="600"></iframe>

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" onClick={event => { if(event.target === event.currentTarget) onClose() }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">{file.name}</h1>
              <button className="btn-close" aria-label="Close" type="button" onClick={onClose}></button>
            </div>
            <div className="modal-body">{content}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  )
}

export function FileManager({ listFile, listFolder, pagination, page, folderPath }: {
  listFile: FileItem[]
  listFolder: FolderItem[]
  pagination: any
  page: number
  folderPath: string
}) {
  const { fileSrc } = useAdmin()
  const [preview, setPreview] = useState<{ src: string, mimetype: string, name: string } | null>(null)

  // Đường dẫn các thư mục cha (breadcrumb)
  const pathList = folderPath ? folderPath.split("/") : []

  // Đóng cửa sổ xem bằng phím Esc
  useEffect(() => {
    if(!preview) return
    const onKeyDown = (event: KeyboardEvent) => { if(event.key === "Escape") setPreview(null) }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [preview])

  // Tạo thư mục con trong thư mục đang xem
  const handleCreateFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const folderName = `${new FormData(event.currentTarget).get("folderName") || ""}`.trim()
    if(!folderName) {
      notifyError("Vui lòng nhập tên folder")
      return
    }
    const formData = new FormData()
    formData.append("folderName", folderName)
    if(folderPath) formData.append("folderPath", folderPath)
    const data = await adminRequest("/file-manager/folder/create", "POST", formData)
    if(data.code === "success") drawNotify("success", data.message || "")
    else notifyError(data.message || "")
  }

  // Xoá thư mục (cả file bên trong)
  const handleDeleteFolder = async (folderName: string) => {
    const result = await Swal.fire({
      title: `Bạn có chắc muốn xoá Folder ${folderName} không? Sau khi xoá sẽ không khôi phục được dữ liệu`,
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Xoá",
      denyButtonText: "Không xoá"
    })
    if(!result.isConfirmed) return
    const folderFinal = `/media${folderPath ? `/${folderPath}` : ""}/${folderName}`
    const data = await adminRequest(`/file-manager/folder/delete?folderPath=${encodeURIComponent(folderFinal)}`, "DELETE")
    if(data.code === "success") drawNotify("success", data.message || "")
    else notifyError(data.message || "")
  }

  // Đổi tên file
  const handleRename = async (file: FileItem) => {
    const result = await Swal.fire({
      title: "Đổi tên File",
      input: "text",
      inputValue: file.filename,
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Huỷ"
    })
    const fileName = result.isConfirmed ? `${result.value || ""}`.trim() : ""
    if(!fileName) return
    const formData = new FormData()
    formData.append("fileName", fileName)
    const data = await adminRequest(`/file-manager/change-file-name/${file.id}`, "PATCH", formData)
    if(data.code === "success") drawNotify("success", data.message || "")
    else notifyError(data.message || "")
  }

  // Xoá file
  const handleDeleteFile = async (file: FileItem) => {
    const result = await Swal.fire({
      title: `Bạn có chắc muốn xoá File: ${file.filename}?`,
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Xoá",
      denyButtonText: "Không xoá"
    })
    if(!result.isConfirmed) return
    const data = await adminRequest(`/file-manager/delete-file/${file.id}`, "DELETE")
    if(data.code === "success") drawNotify("success", data.message || "")
    else notifyError(data.message || "")
  }

  // Copy đường dẫn file (dán vào ô "Ảnh đại diện", album ảnh,...)
  const handleCopy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      notifySuccess("Đã copy!")
    } catch {
      prompt("Copy đường dẫn bên dưới:", path)
    }
  }

  const iconAction = (icon: string, title: string, onClick: () => void) => (
    <a href="#" title={title} onClick={event => { event.preventDefault(); onClick() }}>
      <i className={`las ${icon} text-secondary fs-3 ms-1`}></i>
    </a>
  )

  return (
    <>
      <ul className="list-group list-group-horizontal-md mb-3">
        <li className="list-group-item bg-dark">
          <AdminLink href={folderUrl("")}><i className="la la-angle-double-right text-info me-2"></i>Quản lý file</AdminLink>
        </li>
        {pathList.map((item, index) => (
          <li className="list-group-item bg-dark" key={index}>
            <AdminLink href={folderUrl(pathList.slice(0, index + 1).join("/"))}><i className="la la-angle-double-right text-info me-2"></i>{item}</AdminLink>
          </li>
        ))}
      </ul>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center g-2">
            <div className="col-lg-12"><h4 className="card-title">Danh sách folder</h4></div>
            <div className="col-lg-4">
              <form onSubmit={handleCreateFolder}>
                <div className="input-group">
                  <input className="form-control" placeholder="Tên folder" type="text" name="folderName" />
                  <button className="btn btn-secondary">Tạo folder</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tên</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {listFolder.length > 0 ? listFolder.map(folder => (
                  <tr key={folder.name}>
                    <td>
                      <AdminLink href={folderUrl(folderPath ? `${folderPath}/${folder.name}` : folder.name)}>
                        <div className="d-inline-flex justify-content-center align-items-center thumb-md bg-secondary-subtle rounded mx-auto me-1">
                          <i className="fa-solid fa-folder fs-18 align-self-center mb-0 text-secondary"></i>
                        </div>
                        <span>{folder.name}</span>
                      </AdminLink>
                    </td>
                    <td>{folder.createdAtFormat}</td>
                    <td className="text-end">
                      <a href="#" title="Xoá folder" onClick={event => { event.preventDefault(); handleDeleteFolder(folder.name) }}>
                        <i className="las la-trash-alt text-secondary fs-18 ms-1"></i>
                      </a>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3}><div className="text-center">Không có dữ liệu</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col"><h4 className="card-title">Danh sách file</h4></div>
          </div>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tên</th>
                  <th>Ngày tạo</th>
                  <th>Kích thước</th>
                  <th className="text-end">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {listFile.length > 0 ? listFile.map(file => {
                  const path = `${file.folder}/${file.filename}`
                  const src = fileSrc(path)
                  const typeIcon = file.mimetype.includes("video") ? "fa-video"
                    : file.mimetype.includes("audio") ? "fa-headphones"
                    : file.mimetype.includes("pdf") ? "fa-file-pdf"
                    : ""
                  return (
                    <tr key={file.id}>
                      <td>
                        {file.mimetype.includes("image") ? (
                          <img src={fileSrc(path, 160)} className="rounded thumb-md me-1 d-inline" alt="" loading="lazy" />
                        ) : typeIcon ? (
                          <div className="d-inline-flex justify-content-center align-items-center thumb-md bg-blue-subtle rounded mx-auto me-1">
                            <i className={`fa-solid ${typeIcon} fs-18 align-self-center mb-0 text-blue`}></i>
                          </div>
                        ) : null}
                        <span>{file.filename}</span>
                      </td>
                      <td>{file.createdAtFormat}</td>
                      <td>{file.sizeFormat}</td>
                      <td className="text-end text-nowrap">
                        {iconAction("la-copy", "Copy đường dẫn", () => handleCopy(path))}
                        {iconAction("la-eye", "Xem", () => setPreview({ src, mimetype: file.mimetype, name: file.filename }))}
                        {iconAction("la-pen", "Đổi tên", () => handleRename(file))}
                        <a href={`${src}?type=download`} title="Tải xuống"><i className="las la-download text-secondary fs-3 ms-1"></i></a>
                        {iconAction("la-trash-alt", "Xoá", () => handleDeleteFile(file))}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={4}><div className="text-center">Không có dữ liệu</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination totalPage={pagination?.totalPage} page={page} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col"><h4 className="card-title">Upload file</h4></div>
          </div>
        </div>
        <div className="card-body pt-0">
          <UploadBox folderPath={folderPath} />
        </div>
      </div>

      <PreviewModal file={preview} onClose={() => setPreview(null)} />
    </>
  )
}
