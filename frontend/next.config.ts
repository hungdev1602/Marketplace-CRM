import type { NextConfig } from "next"
import path from "path"

// Địa chỉ server Express (thư mục server), không có dấu / ở cuối. Đổi trong file .env.local (xem .env.example)
const apiUrl = (process.env.API_URL || "http://localhost:3000").trim().replace(/\/+$/, "")

const nextConfig: NextConfig = {
  // Thư mục gốc của dự án là thư mục chứa cả frontend và server,
  // vì frontend dùng chung file từ ngữ với server (server/locales/ru.ts, vi.ts)
  turbopack: {
    root: path.join(__dirname, "..")
  },
  outputFileTracingRoot: path.join(__dirname, ".."),

  // Không hiện "X-Powered-By: Next.js" trong header trả về
  poweredByHeader: false,

  // Trình duyệt chỉ nói chuyện với Next.js. Các đường dẫn bên dưới được Next.js chuyển tiếp sang server Express:
  // - /api/...      => mọi thao tác thêm / sửa / xoá, đăng nhập, tải file... (JS trên trang gọi bằng fetch)
  //                    ví dụ: /api/cart/add => http://localhost:3000/cart/add
  // - /payment/...  => Т-Банк báo kết quả thanh toán (webhook)
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiUrl}/:path*` },
      { source: "/payment/:path*", destination: `${apiUrl}/payment/:path*` }
    ]
  }
}

export default nextConfig
