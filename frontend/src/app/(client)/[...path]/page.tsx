import { notFound } from "next/navigation"
import { loadPage } from "@/lib/server-api"
import type { PageProps } from "@/lib/client-page"

// Mọi đường dẫn không có trang riêng trong thư mục app/(client)
// Hỏi server Express: server muốn chuyển sang trang khác thì chuyển (loadPage tự làm), còn lại hiện trang 404

export default async function CatchAllPage({ params, searchParams }: PageProps<{ path: string[] }>) {
  const { path } = await params
  await loadPage(`/${path.map(encodeURIComponent).join("/")}`, await searchParams)
  notFound()
}
