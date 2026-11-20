// Các khối dùng lại ở trang danh sách / thùng rác của admin (server component)
import { adminUrl } from "@/lib/admin"
import { sizedUrl } from "@/lib/media"
import { ApiButton } from "./ui"
import { AdminLink } from "./AdminLink"

const iconStyle = { fontSize: "1.2rem" }
const actionStyle = { margin: "5px" }

// Nút "Thùng rác" / "Tạo ..." ở đầu trang danh sách
export function HeaderLink({ href, icon, className = "btn btn-primary", children }: { href: string, icon: string, className?: string, children: React.ReactNode }) {
  return (
    <AdminLink className={className} href={adminUrl(href)}>
      <i className={`${icon} me-1`}></i>
      {children}
    </AdminLink>
  )
}

// Nút "Quay lại danh sách" ở trang thùng rác
export function BackLink({ href }: { href: string }) {
  return <HeaderLink href={href} icon="fa-solid fa-arrow-left">Quay lại danh sách</HeaderLink>
}

// Biểu tượng sửa (mở trang chỉnh sửa)
export function EditLink({ href }: { href: string }) {
  return (
    <AdminLink href={adminUrl(href)} style={actionStyle} title="Chỉnh sửa">
      <i className="fa-solid fa-pen-to-square text-secondary" style={iconStyle}></i>
    </AdminLink>
  )
}

// Biểu tượng xoá (đưa vào thùng rác)
export function DeleteButton({ api }: { api: string }) {
  return (
    <ApiButton api={api} method="PATCH" style={actionStyle} title="Xoá">
      <i className="fa-solid fa-trash text-secondary" style={iconStyle}></i>
    </ApiButton>
  )
}

// Hai biểu tượng ở trang thùng rác: khôi phục và xoá vĩnh viễn (hỏi lại trước khi xoá)
export function TrashActions({ undoApi, deleteApi }: { undoApi: string, deleteApi: string }) {
  return (
    <>
      <ApiButton api={undoApi} method="PATCH" style={actionStyle} title="Khôi phục">
        <i className="fa-solid fa-rotate-left text-secondary" style={iconStyle}></i>
      </ApiButton>
      <ApiButton api={deleteApi} method="DELETE" style={actionStyle} title="Xoá vĩnh viễn">
        <i className="fa-solid fa-trash text-danger" style={iconStyle}></i>
      </ApiButton>
    </>
  )
}

// Ảnh nhỏ trong bảng
export function Thumb({ fileUrl, path }: { fileUrl: string, path?: string }) {
  if(!path) return null
  return <img src={sizedUrl(`${fileUrl}${path}`, 160)} className="thumb-md me-1 d-inline rounded" alt="" loading="lazy" />
}

// Nhãn trạng thái theo danh sách { giáTrị: [chữ, class màu] }
export function StatusBadge({ value, map }: { value: string, map: { [value: string]: [string, string] } }) {
  const item = map[value]
  if(!item) return null
  return <span className={`badge ${item[1]}`}>{item[0]}</span>
}

export const articleStatusMap: { [value: string]: [string, string] } = {
  draft: ["Bản nháp", "bg-danger"],
  published: ["Đã xuất bản", "bg-success"],
  archived: ["Đã lưu trữ", "bg-dark"]
}

export const activeStatusMap: { [value: string]: [string, string] } = {
  active: ["Hoạt động", "bg-success"],
  inactive: ["Tạm dừng", "bg-danger"]
}
