import { notFound } from "next/navigation"
import { adminUrl } from "@/lib/admin"
import type { AdminPageProps } from "@/lib/admin-page"
import { loadPage } from "@/lib/server-api"

// Mọi đường dẫn admin không có trang riêng trong thư mục app/(admin)/admin
// Hỏi server Express: chưa đăng nhập thì chuyển về trang đăng nhập (loadPage tự làm), còn lại hiện trang 404

// Tiêu đề tab khi hiện trang 404
export const metadata = { title: "Không tìm thấy trang" }

export default async function AdminCatchAllPage({ params, searchParams }: AdminPageProps<{ path: string[] }>) {
  const { path } = await params
  await loadPage(adminUrl(`/${path.map(encodeURIComponent).join("/")}`), await searchParams)
  notFound()
}
