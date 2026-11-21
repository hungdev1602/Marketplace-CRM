import "server-only"
import { cache } from "react"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

// ===== Lấy dữ liệu của 1 trang từ server Express (chỉ chạy ở phía server của Next.js) =====
// Next.js gọi đúng đường dẫn đang có của server Express (ví dụ GET /products?page=2) kèm header
// "X-Response-Format: json". Server trả về JSON thay cho trang PUG:
// - { code: "render", view: "client/pages/product-list", status: 200, data: {...} }: dữ liệu của trang
// - { code: "redirect", url: "/account/login" }: server muốn chuyển sang trang khác (chưa đăng nhập,...)
// Cookie của khách (đăng nhập, giỏ hàng, ngôn ngữ) được gửi kèm, nên server trả về đúng dữ liệu của khách đó.

// Địa chỉ server Express, đổi trong file .env.local (xem .env.example)
export const API_URL = (process.env.API_URL || "http://localhost:3000").trim().replace(/\/+$/, "")

export type PageData = {
  view: string // tên trang server chọn, ví dụ "client/pages/product-list"
  status: number // mã HTTP server trả về (200, 403, 404)
  data: any // dữ liệu của trang
}

type PagePayload =
  | ({ code: "render" } & PageData)
  | { code: "redirect", url: string }

export type SearchParams = { [key: string]: string | string[] | undefined }

// { page: "2", origin: ["VN", "KR"] } => "?page=2&origin=VN&origin=KR"
export const toQueryString = (searchParams?: SearchParams): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams || {})) {
    for (const item of ([] as (string | undefined)[]).concat(value)) {
      if(item !== undefined) params.append(key, item)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

// Lỗi khi không lấy được dữ liệu từ server Express (server chưa chạy, server báo lỗi 500,...)
export class ApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message)
    this.name = "ApiError"
  }
}

// Ghi thời gian server Express trả dữ liệu ra cửa sổ Terminal đang chạy Next.js, để biết trang chậm do đâu:
// - Số ms ở đây lớn (vài trăm ms trở lên): chậm ở server Express / database (MongoDB Atlas ở xa thì mỗi lần hỏi mất vài chục - vài trăm ms)
// - Số ms nhỏ mà trình duyệt vẫn chậm: do mạng, ảnh nặng, hoặc đang chạy "npm run dev" (lần đầu mở mỗi trang phải biên dịch)
// Chạy "npm run dev": ghi mọi trang. Chạy bản build ("npm start"): chỉ ghi trang chậm hơn 1,5 giây
const logApiTime = (url: string, startedAt: number, status: number) => {
  const time = Math.round(performance.now() - startedAt)
  if(process.env.NODE_ENV !== "production") {
    console.log(`[Express] GET ${url} ${status} - ${time} ms`)
  }
  else if(time > 1500) {
    console.warn(`[Express] GET ${url} ${status} - chậm: ${time} ms`)
  }
}

// cache(): trong 1 lần dựng trang, generateMetadata và trang cùng gọi 1 đường dẫn thì chỉ hỏi server 1 lần
const fetchPage = cache(async (url: string): Promise<PagePayload> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])

  const requestHeaders: { [name: string]: string } = {
    "x-response-format": "json",
    "accept": "application/json"
  }

  const cookie = cookieStore.toString()
  if(cookie) requestHeaders["cookie"] = cookie

  // Chuyển tiếp thông tin trình duyệt và địa chỉ IP của khách (server ghi vào nhật ký hoạt động)
  for (const name of ["user-agent", "accept-language", "x-forwarded-for", "sec-fetch-dest"]) {
    const value = headerStore.get(name)
    if(value) requestHeaders[name] = value
  }

  const startedAt = performance.now()
  let response: Response
  try {
    response = await fetch(`${API_URL}${url}`, {
      headers: requestHeaders,
      cache: "no-store", // dữ liệu thay đổi theo từng khách, không lưu cache
      redirect: "manual"
    })
  } catch (error) {
    console.error(`Không kết nối được server Express (${API_URL}${url})`, error)
    throw new ApiError(`Không kết nối được server (${API_URL}). Kiểm tra server Express đã chạy chưa.`, 503)
  }

  const contentType = response.headers.get("content-type") || ""
  if(!contentType.includes("application/json")){
    throw new ApiError(`Server trả về dữ liệu không đúng định dạng (${response.status}) ở ${url}`, response.status)
  }

  const payload = await response.json()
  logApiTime(url, startedAt, response.status)
  if(payload?.code !== "render" && payload?.code !== "redirect"){
    // Route chỉ trả JSON thông báo (ví dụ { code: "error", message })
    throw new ApiError(payload?.message || `Server trả về dữ liệu không đúng định dạng ở ${url}`, response.status)
  }

  return payload
})

// Đường dẫn server muốn chuyển tới: luôn bắt đầu bằng "/" (không chuyển sang trang web khác)
const normalizeRedirectUrl = (url: string): string => {
  if(/^https?:\/\//i.test(url)) return url // link thanh toán của ngân hàng,...
  return url.startsWith("/") ? url : `/${url}`
}

// Lấy dữ liệu của trang. Server muốn chuyển trang (chưa đăng nhập, đường dẫn cũ,...) thì chuyển luôn
export const loadPage = async (path: string, searchParams?: SearchParams): Promise<PageData> => {
  const payload = await fetchPage(`${path}${toQueryString(searchParams)}`)

  if(payload.code === "redirect"){
    redirect(normalizeRedirectUrl(payload.url))
  }

  return payload
}
