import { NextResponse } from "next/server"
import { adminApiUrl } from "@/lib/admin"

// Đăng xuất trang quản trị: /admin/account/logout
// Chuyển sang API của server Express (/api/admin/account/logout): server xoá cookie đăng nhập rồi chuyển về trang đăng nhập
// (phải để trình duyệt gọi thẳng API, vì cookie chỉ xoá được trong câu trả lời gửi về trình duyệt)
export function GET() {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: adminApiUrl("/account/logout") }
  })
}
