# Giao diện Next.js của SFoodie

Trang khách hàng và trang admin, lấy dữ liệu từ server Express (thư mục `../server`).

Hướng dẫn chạy thử, cấu trúc code, đưa lên server thật: **[docs/huong-dan-nextjs.md](../docs/huong-dan-nextjs.md)**

Chạy nhanh trên máy (server Express phải đang chạy ở cổng 3000):

```bash
cp .env.example .env.local
yarn install
yarn dev
```

Mở http://localhost:3001 (khách hàng) và http://localhost:3001/admin (admin).

| Lệnh | Việc |
|---|---|
| `yarn dev` | Chạy chế độ phát triển, sửa code là trang tự cập nhật |
| `yarn build` | Build bản chạy thật |
| `yarn start` | Chạy bản đã build |
| `yarn lint` | Kiểm tra code |
| `yarn typecheck` | Kiểm tra kiểu TypeScript |
