"use client"

import { useState } from "react"
import Swal from "sweetalert2"
import { cx } from "@/lib/format"
import { adminCall } from "./api"
import { drawNotify, notifySuccess } from "./notify"

// ===== Các khối giao diện nhỏ dùng lại ở nhiều trang admin =====

// Hỏi lại trước khi xoá vĩnh viễn (hộp thoại SweetAlert2)
export const confirmDelete = async (title: string = "Bạn có chắc muốn xoá không? Sau khi xoá sẽ không khôi phục được dữ liệu"): Promise<boolean> => {
  const result = await Swal.fire({
    title: title,
    showDenyButton: true,
    showCancelButton: false,
    confirmButtonText: "Xoá",
    denyButtonText: "Không xoá"
  })
  return result.isConfirmed
}

// Nút / link gọi 1 API admin rồi tải lại trang và hiện thông báo
// (xoá vào thùng rác, khôi phục, xoá vĩnh viễn, đổi trạng thái,...)
// - method DELETE: hỏi lại trước khi xoá
// - api: đường dẫn sau /admin, ví dụ "/article/delete/123"
export function ApiButton({ api, method = "GET", className, style, title, children }: {
  api: string
  method?: string
  className?: string
  style?: React.CSSProperties
  title?: string
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    if(isLoading) return
    if(method == "DELETE" && !(await confirmDelete())) return

    setIsLoading(true)
    const data = await adminCall(api, method)
    if(data) {
      drawNotify(data.code, data.message || "")
      return
    }
    setIsLoading(false)
  }

  return (
    <a href="#" className={className} style={style} title={title} onClick={handleClick}>
      {children}
    </a>
  )
}

// Đổi tham số trên đường dẫn rồi tải lại trang: giá trị trống thì bỏ tham số
// Lọc / tìm lại thì quay về trang 1
const goWithParams = (params: { [key: string]: string }, resetPage: boolean = true) => {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(params)) {
    if(value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  if(resetPage) url.searchParams.delete("page")
  window.location.href = url.href
}

// Ô tìm kiếm theo từ khoá (?keyword=...)
export function SearchForm({ keyword = "" }: { keyword?: string }) {
  return (
    <form
      className="input-group mb-3"
      onSubmit={event => {
        event.preventDefault()
        const value = `${new FormData(event.currentTarget).get("keyword") || ""}`
        goWithParams({ keyword: value }, false)
      }}
    >
      <input className="form-control" placeholder="Từ khóa..." type="text" name="keyword" defaultValue={keyword} />
      <button className="btn btn-secondary">Tìm kiếm</button>
    </form>
  )
}

// Bộ lọc gồm nhiều ô (ví dụ trang nhật ký hoạt động, danh sách sản phẩm)
// Ô nào có giá trị thì thêm vào đường dẫn, ô trống thì bỏ; giá trị đang lọc do server điền sẵn vào ô (defaultValue)
export function FilterForm({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <form
      className={className}
      onSubmit={event => {
        event.preventDefault()
        const params: { [key: string]: string } = {}
        new FormData(event.currentTarget).forEach((value, key) => {
          params[key] = `${value}`.trim()
        })
        goWithParams(params)
      }}
    >
      {children}
    </form>
  )
}

// Ô chọn đổi là lọc lại ngay (ví dụ ô sắp xếp), name là tên tham số trên đường dẫn
export function FilterSelect({ name, value, className = "form-select", children }: {
  name: string
  value: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <select name={name} className={className} defaultValue={value} onChange={event => goWithParams({ [name]: event.target.value })}>
      {children}
    </select>
  )
}

// Phân trang: 1 … 4 5 [6] 7 8 … 20, bấm số trang thì đổi ?page= trên đường dẫn (giữ nguyên bộ lọc đang chọn)
export function AdminPagination({ totalPage, page }: { totalPage: number, page?: number }) {
  const totalPages = totalPage || 0
  const currentPage = page || 1
  if(!(totalPages > 1)) return null

  const go = (event: React.MouseEvent, target: number) => {
    event.preventDefault()
    if(target < 1 || target > totalPages || target === currentPage) return
    goWithParams({ page: `${target}` }, false)
  }

  // Các trang ở giữa (điều chỉnh để hiển thị cân đối ở đầu và cuối danh sách)
  let startPage = Math.max(2, currentPage - 1)
  let endPage = Math.min(totalPages - 1, currentPage + 1)
  if(currentPage <= 3) endPage = Math.min(totalPages - 1, 4)
  if(currentPage >= totalPages - 2) startPage = Math.max(2, totalPages - 3)
  const middleList: number[] = []
  for (let i = startPage; i <= endPage; i++) {
    if(i > 1 && i < totalPages) middleList.push(i)
  }

  const pageItem = (target: number) => (
    <li className={cx("page-item", currentPage === target && "active")} key={target}>
      <a className="page-link" href="#" onClick={event => go(event, target)}>{target}</a>
    </li>
  )

  return (
    <div className="mt-4">
      <nav aria-label="Phân trang">
        <ul className="pagination justify-content-center">
          <li className={cx("page-item", currentPage === 1 && "disabled")}>
            <a className="page-link" href="#" aria-label="Previous" onClick={event => go(event, currentPage - 1)}>&laquo;</a>
          </li>
          {pageItem(1)}
          {currentPage > 3 && (
            <li className="page-item disabled"><span className="page-link">...</span></li>
          )}
          {middleList.map(pageItem)}
          {currentPage < totalPages - 2 && (
            <li className="page-item disabled"><span className="page-link">...</span></li>
          )}
          {pageItem(totalPages)}
          <li className={cx("page-item", currentPage === totalPages && "disabled")}>
            <a className="page-link" href="#" aria-label="Next" onClick={event => go(event, currentPage + 1)}>&raquo;</a>
          </li>
        </ul>
      </nav>
    </div>
  )
}

// Nút copy 1 đoạn chữ (đường dẫn file, địa chỉ webhook,...)
export function CopyButton({ content, className, title, children }: { content: string, className?: string, title?: string, children: React.ReactNode }) {
  return (
    <a
      href="#"
      className={className}
      title={title}
      onClick={async event => {
        event.preventDefault()
        try {
          await navigator.clipboard.writeText(content)
          notifySuccess("Đã copy!")
        } catch {
          prompt("Copy đường dẫn bên dưới:", content)
        }
      }}
    >
      {children}
    </a>
  )
}

// Đầu thẻ: tiêu đề bên trái, các nút bên phải
export function CardHeader({ title, children }: { title: React.ReactNode, children?: React.ReactNode }) {
  return (
    <div className="card-header">
      <div className="row align-items-center">
        <div className="col">
          <h4 className="card-title">{title}</h4>
        </div>
        {children && <div className="col-auto">{children}</div>}
      </div>
    </div>
  )
}

// Dòng "Không tìm thấy dữ liệu" của bảng trống
export function EmptyRow({ colSpan, text = "Không tìm thấy dữ liệu" }: { colSpan: number, text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center">{text}</td>
    </tr>
  )
}
