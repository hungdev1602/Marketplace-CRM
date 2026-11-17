import { NextResponse, type NextRequest } from "next/server"
import { languageList } from "@/lib/i18n"

// Đổi ngôn ngữ: /language/ru, /language/vi
// Lưu vào cookie "lang" (1 năm) rồi quay lại trang khách đang xem (server Express đọc cookie này để chọn ngôn ngữ)
export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const language = languageList.find(item => item.id === lang)

  // Chỉ quay lại trang trong website (lấy đường dẫn của trang trước), không chuyển sang trang web khác
  let backUrl = "/"
  try {
    const referer = new URL(`${request.headers.get("referer")}`)
    if(referer.host === request.headers.get("host")) {
      backUrl = referer.pathname + referer.search
    }
  } catch {
    // không có trang trước (gõ thẳng đường dẫn) thì về trang chủ
  }

  // Location dạng đường dẫn (không kèm tên miền) để chạy đúng cả khi website đứng sau nginx
  const response = new NextResponse(null, {
    status: 302,
    headers: { Location: backUrl }
  })

  if(language) {
    response.cookies.set("lang", language.id, {
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      path: "/"
    })
  }

  return response
}
