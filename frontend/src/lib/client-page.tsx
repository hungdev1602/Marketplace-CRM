import "server-only"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { translate } from "./i18n"
import { loadPage, type PageData, type SearchParams } from "./server-api"

// ===== Trang khách hàng: lấy dữ liệu của trang từ server Express =====

// Server trả về trang 404 (sản phẩm không tồn tại, đường dẫn sai...) thì hiện trang 404 của Next.js
// (app/(client)/not-found.tsx), trình duyệt và Google/Yandex nhận đúng mã 404
export const loadClientPage = async (path: string, searchParams?: SearchParams): Promise<PageData> => {
  const page = await loadPage(path, searchParams)
  if(page.view === "client/pages/error-404") {
    notFound()
  }
  return page
}

// Tiêu đề và mô tả của trang (thẻ <title>, <meta name="description">)
export const clientMetadata = (data: any): Metadata => ({
  title: data.pageTitle,
  description: data.metaDescription || translate(data.lang || "ru", "siteDescription")
})

// Kiểu tham số của trang trong Next.js (params và searchParams là Promise)
export type PageProps<Params = object> = {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}
