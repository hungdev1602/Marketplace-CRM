// ===== Gọi server Express từ trình duyệt =====
// Trình duyệt gọi /api/... trên chính website Next.js, Next.js chuyển tiếp sang server Express (next.config.ts),
// nên cookie đăng nhập, giỏ hàng vẫn hoạt động như cũ.
// Server trả về JSON dạng { code: "success" | "error", message, ... }

export type ApiResult = { code: string, message?: string, [key: string]: any }

// Đường dẫn của server Express => đường dẫn gọi qua Next.js, ví dụ "/cart/add" => "/api/cart/add"
export const apiUrl = (path: string): string => `/api${path.startsWith("/") ? path : `/${path}`}`

// Gửi dữ liệu JSON, mất mạng / server lỗi thì trả về lỗi chung (errorText)
export const sendJson = async (path: string, method: string = "POST", data?: any, errorText: string = "Error"): Promise<ApiResult> => {
  try {
    const response = await fetch(apiUrl(path), {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Response-Format": "json"
      },
      body: data !== undefined && method !== "GET" ? JSON.stringify(data) : undefined
    })
    return await response.json()
  } catch {
    return { code: "error", message: errorText }
  }
}

// Gửi form có file (multipart/form-data)
export const sendForm = async (path: string, method: string, formData: FormData, errorText: string = "Error"): Promise<ApiResult> => {
  try {
    const response = await fetch(apiUrl(path), {
      method: method,
      headers: {
        "Accept": "application/json",
        "X-Response-Format": "json"
      },
      body: formData
    })
    return await response.json()
  } catch {
    return { code: "error", message: errorText }
  }
}

// Lấy dữ liệu của 1 trang / 1 phần trang (server trả { code: "render", data } hoặc JSON thường)
export const getJson = async (path: string): Promise<any> => {
  const response = await fetch(apiUrl(path), {
    headers: {
      "Accept": "application/json",
      "X-Response-Format": "json"
    },
    cache: "no-store"
  })
  if(!response.ok) throw new Error(`${response.status}`)
  return await response.json()
}
