// Địa chỉ website (biến SITE_URL trong file .env), bỏ dấu / ở cuối, ví dụ: "https://sfoodie.ru"
// Dùng để tạo link tuyệt đối, ví dụ link trong email quên mật khẩu
// Không lấy theo tên miền trong request (req.headers.host), vì người lạ có thể sửa header này
// để link trong email trỏ sang trang web lừa đảo
// Lưu ý: đọc process.env trong hàm (không đọc lúc import file), vì file .env được nạp sau khi import (index.ts)
export const getSiteUrl = (): string => {
  return (process.env.SITE_URL || "http://localhost:3000").trim().replace(/\/+$/, "")
}
