# Giao diện Next.js của SFoodie

Trang khách hàng và trang admin, lấy dữ liệu từ server Express (thư mục `../server`).

Hướng dẫn chạy thử, cấu trúc code, đưa lên server thật: **[docs/huong-dan-nextjs.md](../docs/huong-dan-nextjs.md)**

Thư mục này dùng **npm** (`package-lock.json`). Chạy nhanh trên máy (server Express phải đang chạy ở cổng 3000):

```bash
cp .env.example .env.local
npm install
npm run dev
```

Mở http://localhost:3001 (khách hàng) và http://localhost:3001/admin (admin).

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy chế độ phát triển, sửa code là trang tự cập nhật |
| `npm run build` | Build bản chạy thật |
| `npm start` | Chạy bản đã build |
| `npm run lint` | Kiểm tra code |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
