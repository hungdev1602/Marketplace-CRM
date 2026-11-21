import "server-only"
import { Fragment } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdminShell, Forbidden } from "@/components/admin/AdminShell"
import { adminUrl } from "./admin"
import { loadPage, toQueryString, type SearchParams } from "./server-api"

// ===== Trang admin: lấy dữ liệu của trang từ server Express rồi dựng trong khung admin =====
// Server tự kiểm tra đăng nhập và quyền:
// - Chưa đăng nhập: server muốn chuyển về trang đăng nhập (loadPage tự chuyển)
// - Không có quyền: server trả về trang "admin/pages/error-403" => hiện thông báo không có quyền

export type AdminPageProps<Params = object> = {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}

// path: đường dẫn sau /admin, ví dụ "/product/list", hoặc hàm tạo đường dẫn từ tham số ([id])
type PathInput<Params> = string | ((params: Params) => string)

const resolvePath = async <Params,>(path: PathInput<Params>, props: AdminPageProps<Params>): Promise<string> => {
  return typeof path === "function" ? path(await props.params) : path
}

const loadAdminPage = async <Params,>(path: PathInput<Params>, props: AdminPageProps<Params>) => {
  const page = await loadPage(adminUrl(await resolvePath(path, props)), await props.searchParams)
  // Đường dẫn admin không tồn tại: server trả về trang 404 của trang khách hàng
  if(!page.view.startsWith("admin/")) notFound()
  return page
}

// Tiêu đề trang (thẻ <title>)
export const adminMetadata = async <Params,>(path: PathInput<Params>, props: AdminPageProps<Params>): Promise<Metadata> => {
  const page = await loadAdminPage(path, props)
  return { title: page.data.pageTitle }
}

// Tham số trên đường dẫn dạng { tên: giá trị đầu tiên } (để điền lại ô tìm kiếm, bộ lọc)
export type Query = { [key: string]: string }

const toQuery = (searchParams: SearchParams): Query => {
  const query: Query = {}
  for (const [key, value] of Object.entries(searchParams || {})) {
    const first = Array.isArray(value) ? value[0] : value
    if(first !== undefined) query[key] = first
  }
  return query
}

// Dựng 1 trang admin: render nhận dữ liệu của trang (và tham số trên đường dẫn), trả về nội dung trang
// - blank: trang không có menu (trang quản lý file mở trong iframe)
export const adminPage = async <Params,>(
  path: PathInput<Params>,
  props: AdminPageProps<Params>,
  render: (data: any, query: Query) => React.ReactNode,
  options: { blank?: boolean } = {}
) => {
  const page = await loadAdminPage(path, props)
  const searchParams = await props.searchParams
  const query = toQuery(searchParams)
  const isForbidden = page.view.startsWith("admin/pages/error-403")
  // Chuyển trang không tải lại (Next.js) sang cùng trang nhưng khác tham số (trang 2, lọc khác, sửa sản phẩm khác...):
  // key đổi thì nội dung trang được dựng lại từ đầu, các ô lọc / ô nhập hiện đúng giá trị mới (như khi tải lại trang)
  const contentKey = `${await resolvePath(path, props)}${toQueryString(searchParams)}`

  return (
    <AdminShell data={page.data} blank={options.blank || page.view === "admin/pages/error-403-iframe"}>
      {isForbidden ? <Forbidden data={page.data} /> : <Fragment key={contentKey}>{render(page.data, query)}</Fragment>}
    </AdminShell>
  )
}
