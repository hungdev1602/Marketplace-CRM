# Hướng dẫn giao diện Next.js (thư mục `frontend`)

Giao diện website (trang khách hàng và trang admin) được làm lại bằng **Next.js**, nằm trong thư mục `frontend`.
Server **Express** (thư mục `server`) vẫn giữ nguyên toàn bộ xử lý: database, đăng nhập, giỏ hàng, đặt hàng, thanh toán Т-Банк, ApiShip, email...
Server quản lý file (repo `file-manager-microservice`) cũng giữ nguyên.

Tất cả nằm trên nhánh thử nghiệm **`claude/brave-turing-goeokm`** (của cả 2 repo), nhánh `main` không bị đổi gì.

---

## 1. Cách các phần nói chuyện với nhau

```
Trình duyệt của khách / admin
        │  http://localhost:3001  (chỉ mở địa chỉ này)
        ▼
┌──────────────────────────┐
│ Next.js (frontend)  :3001│  dựng trang HTML bằng React
└──────────────────────────┘
        │ 1. Khi dựng trang: gọi đúng đường dẫn cũ của Express kèm header "X-Response-Format: json"
        │    ví dụ GET http://localhost:3000/products?page=2  => Express trả JSON dữ liệu trang (thay cho trang PUG)
        │ 2. Thao tác trên trang (thêm giỏ hàng, lưu sản phẩm...): trình duyệt gọi /api/...
        │    Next.js chuyển tiếp nguyên vẹn sang Express: /api/cart/add => http://localhost:3000/cart/add
        │ 3. /payment/... (Т-Банк báo kết quả thanh toán) cũng được chuyển tiếp sang Express
        ▼
┌──────────────────────────┐        ┌───────────────────────────────┐
│ Express (server)    :3000│ ─────► │ Quản lý file (microservice)   │
└──────────────────────────┘        │ :4000 — ảnh, video sản phẩm   │
        │                           └───────────────────────────────┘
        ▼                                     ▲
     MongoDB                    Trình duyệt tải ảnh thẳng từ :4000
```

Những gì đã đổi ở server Express (rất ít, không đổi logic bán hàng):

| File | Thay đổi |
|---|---|
| `server/middlewares/json-view.middleware.ts` (mới) | Request có header `X-Response-Format: json` thì `res.render(...)` trả JSON dữ liệu của trang, `res.redirect(...)` trả `{ code: "redirect", url }`. Không có header thì chạy y như cũ (trang PUG). |
| `server/config/json-view.config.ts` (mới) | Danh sách trường nội bộ **không được gửi ra trang khách**: giá vốn, ghi chú nội bộ của đơn, email / tên thật của khách trong đánh giá, nhân viên duyệt... **Thêm trường nội bộ mới vào model thì nhớ thêm vào đây.** |
| `server/index.ts` | Bật middleware trên; tin header `X-Forwarded-For` từ Next.js để nhật ký hoạt động ghi đúng IP của admin. |
| `server/.env.example` | `SITE_URL` đổi sang `http://localhost:3001`, thêm `TRUST_PROXY`. |

Vì server vẫn dựng được trang PUG, **giao diện cũ vẫn chạy ở `http://localhost:3000`** trong lúc thử. Hai giao diện dùng chung database.

---

## 2. Chạy thử trên laptop (từng bước)

### Bước 0: Kiểm tra phần mềm

Mở Terminal (Windows: PowerShell hoặc Git Bash), gõ:

```bash
node -v
```

Cần **Node.js 20.9 trở lên** (Next.js 16 yêu cầu). Nếu thấp hơn, tải bản LTS ở https://nodejs.org rồi cài lại.

Cả 3 thư mục (`server`, `frontend`, repo `file-manager-microservice`) đều dùng **npm** (có sẵn khi cài Node.js), không cần cài yarn.
File khoá phiên bản thư viện là `package-lock.json`. File `.npmrc` trong mỗi thư mục cho npm tự tải lại khi mạng chập chờn.

MongoDB: dùng như hiện tại (MongoDB cài trên máy hoặc MongoDB Atlas, link trong `server/.env`).

### Bước 1: Lấy code của nhánh thử nghiệm (repo Marketplace-CRM)

Trong thư mục repo `Marketplace-CRM` đang có trên máy:

```bash
git fetch origin claude/brave-turing-goeokm
```

```bash
git checkout claude/brave-turing-goeokm
```

(Nếu git báo có file đang sửa dở chưa commit: commit hoặc `git stash` trước rồi chạy lại lệnh trên.)

### Bước 2: Lấy code của nhánh thử nghiệm (repo file-manager-microservice)

Trong thư mục repo `file-manager-microservice`:

```bash
git fetch origin claude/brave-turing-goeokm
```

```bash
git checkout claude/brave-turing-goeokm
```

Mở file `.env` của repo này, sửa dòng `DOMAIN` để có thêm địa chỉ của giao diện Next.js (có dấu `/` ở cuối, cách nhau bằng dấu phẩy, không có dấu cách):

```
DOMAIN=http://localhost:3001/,http://localhost:3000/
```

> Thiếu `http://localhost:3001/` thì ảnh sản phẩm không hiện trên giao diện mới. Xem file `.env.example` mới thêm trong repo này.

Chạy server quản lý file (giữ cửa sổ Terminal này mở):

```bash
npm install
```

```bash
npm start
```

### Bước 3: Chạy server Express (thư mục `server`)

Mở **cửa sổ Terminal thứ 2**, vào thư mục `Marketplace-CRM/server`.

Mở file `server/.env`, sửa `SITE_URL` sang địa chỉ giao diện mới (link trong email quên mật khẩu, email đơn hàng sẽ mở giao diện Next.js):

```
SITE_URL=http://localhost:3001
```

Chạy server (giữ cửa sổ này mở):

```bash
npm install
```

```bash
npm start
```

Thấy `App listening on port 3000` và `Kết nối database thành công <3` là được.

### Bước 4: Chạy giao diện Next.js (thư mục `frontend`)

Mở **cửa sổ Terminal thứ 3**, vào thư mục `Marketplace-CRM/frontend`.

Tạo file cấu hình (lần đầu):

```bash
cp .env.example .env.local
```

(Windows PowerShell: `copy .env.example .env.local`.) File này chỉ có 1 dòng `API_URL=http://localhost:3000` — địa chỉ server Express, thường không cần sửa.

Cài thư viện (lần đầu, hoặc khi `package.json` / `package-lock.json` thay đổi). Lần đầu mất vài phút:

```bash
npm install
```

Thấy dòng `added ... packages` là cài xong. Dòng `npm warn deprecated` và `... vulnerabilities` không phải lỗi:
các lỗ hổng npm báo nằm trong công cụ kiểm tra code (ESLint), không có trong website. **Không chạy `npm audit fix --force`**
(lệnh này đổi phiên bản thư viện, dễ làm hỏng giao diện).

Chạy chế độ phát triển (sửa code là trang tự cập nhật):

```bash
npm run dev
```

Mở trình duyệt:

- Trang khách hàng: **http://localhost:3001**
- Trang admin: **http://localhost:3001/admin** (đăng nhập bằng tài khoản admin như cũ)

### Bước 5: Những chỗ nên bấm thử

Trang khách hàng:

- [ ] Trang chủ, danh mục, danh sách sản phẩm: lọc, sắp xếp, phân trang
- [ ] Ô tìm kiếm: gợi ý khi gõ, gõ nhầm bàn phím (ví dụ `kfgif`), phím ↑ ↓ Enter, tìm bằng giọng nói (Chrome)
- [ ] Trang sản phẩm: album ảnh / video, các tab, đánh giá (lọc theo sao, "Читать полностью", 👍 / 👎, xem ảnh lớn)
- [ ] Thêm vào giỏ, + / − số lượng, ♡ yêu thích (số trên biểu tượng đầu trang phải đổi theo)
- [ ] Giỏ hàng: mã giảm giá đúng / sai, xoá sản phẩm, xoá hết
- [ ] Đặt hàng: tính phí giao hàng, chọn điểm nhận hàng trên bản đồ, "Рядом со мной", thanh toán (thử với `PAYMENT_TEST_MODE=true` hoặc terminal DEMO)
- [ ] Đăng ký, đăng nhập (giỏ hàng lúc chưa đăng nhập được gộp vào tài khoản), quên mật khẩu, đổi mật khẩu, đăng xuất
- [ ] Đơn hàng của tôi, trang đơn hàng, viết / sửa đánh giá có ảnh
- [ ] Đổi ngôn ngữ RU / VI, giao diện sáng / tối, menu trên điện thoại (thu nhỏ cửa sổ trình duyệt)

Trang admin:

- [ ] Đăng nhập / đăng xuất, menu bên trái theo đúng quyền của tài khoản
- [ ] Sản phẩm: tạo, sửa (trình soạn thảo, chọn ảnh từ "Chọn file"), xoá, thùng rác, nhập / xuất Excel
- [ ] Danh mục sản phẩm, mã giảm giá (chọn sản phẩm áp dụng), bài viết, danh mục bài viết
- [ ] Đơn hàng: tạo vận đơn ApiShip, in phiếu gửi hàng, huỷ đơn / hoàn tiền, ghi chú nội bộ
- [ ] Đánh giá: duyệt, từ chối, trả lời, xoá
- [ ] Nhóm quyền, tài khoản quản trị, đổi mật khẩu, nhật ký hoạt động
- [ ] Kết nối API (bật / tắt, "Lưu & kiểm tra kết nối"), Cài đặt cửa hàng
- [ ] Quản lý file: tạo / xoá folder, upload, đổi tên, xoá, copy đường dẫn

Gặp lỗi: chụp màn hình trang, chép dòng báo lỗi đỏ trong cửa sổ Terminal đang chạy `npm run dev` (và Terminal của server) gửi lại để sửa.

### Bước 6: Thử bản build như trên server thật (không bắt buộc)

Trong thư mục `frontend`:

```bash
npm run build
```

```bash
npm start
```

Vẫn mở http://localhost:3001. Bản này chạy nhanh hơn `npm run dev` nhưng sửa code xong phải `npm run build` lại.

### Quay lại nhánh cũ

```bash
git checkout main
```

(Làm ở cả 2 repo. Trả `SITE_URL` trong `server/.env` về `http://localhost:3000` nếu dùng lại giao diện PUG.)

---

## 3. Cấu trúc thư mục `frontend`

```
frontend/
├── next.config.ts              Chuyển tiếp /api/*, /payment/* sang Express; header Referrer-Policy
├── .env.example                API_URL: địa chỉ server Express
├── public/                     CSS, font, ảnh của giao diện (chép từ server/public)
└── src/
    ├── lib/
    │   ├── server-api.ts       loadPage(): gọi Express lấy dữ liệu trang (chạy phía server của Next.js)
    │   ├── api-client.ts       sendJson(): trình duyệt gọi /api/... (thêm giỏ hàng, đăng nhập...)
    │   ├── i18n.ts             Từ ngữ RU / VI — dùng chung file server/locales/ru.ts, vi.ts
    │   ├── format.ts           Định dạng giá tiền, số
    │   ├── view-ctx.ts         Thông tin chung của trang khách (ngôn ngữ, tài khoản, danh mục...)
    │   ├── client-page.tsx     Lấy dữ liệu trang khách, trang 404
    │   ├── admin.ts            Đường dẫn trang admin ("/admin")
    │   ├── admin-page.tsx      Lấy dữ liệu trang admin, trang "Không có quyền"
    │   ├── media.ts            sizedUrl(): link ảnh thu nhỏ ?w=... của server quản lý file
    │   └── top-loader.ts       goTo(), reloadPage(), startTopLoader(): chuyển trang bằng JS có thanh loading
    ├── components/
    │   ├── TopLoader.tsx       Thanh loading mỏng trên cùng trang khi chuyển trang (dùng cho cả trang khách và admin)
    │   ├── top-loader.css      Giao diện của thanh loading
    │   ├── client/             Đầu trang, menu, ô tìm kiếm, thẻ sản phẩm, giỏ hàng, đánh giá...
    │   │   └── ShopLink.tsx    Link của trang khách (tắt tải trước trang)
    │   └── admin/              Menu trái, thanh trên, form, bảng, nút thao tác, trình soạn thảo...
    │       ├── AdminLink.tsx   Link của trang admin (chuyển trang không tải lại cả trang)
    │       └── navigation.ts   adminGo(), adminReload(): chuyển trang / lấy lại dữ liệu trang admin bằng JS
    └── app/
        ├── (client)/           Các trang khách hàng: page.tsx = trang chủ, products/, product/[slug]/, cart/...
        └── (admin)/admin/      Các trang admin: dashboard/, product/list/, order/detail/[id]/...
```

Mỗi trang trong `app/` ứng với đúng 1 đường dẫn cũ của Express. Ví dụ `app/(client)/product/[slug]/page.tsx`
là trang `/product/:slug`: nó gọi `loadClientPage("/product/<slug>")` để lấy đúng dữ liệu mà
`server/controller/client/product.controller.ts` (hàm `detail`) truyền vào `res.render(...)`, rồi dựng giao diện bằng React.

### Muốn thêm 1 trang mới

1. Ở server: thêm route + controller như trước, cuối hàm vẫn gọi `res.render("client/pages/ten-trang", { ...dữ liệu })`
   (không cần tạo file `.pug` nếu chỉ dùng giao diện Next.js).
2. Ở frontend: tạo `src/app/(client)/duong-dan/page.tsx` (hoặc `src/app/(admin)/admin/duong-dan/page.tsx`),
   chép một trang có sẵn làm mẫu, đổi đường dẫn trong `loadClientPage(...)` / `adminPage(...)`.
3. Thao tác gửi dữ liệu (POST / PATCH / DELETE) thì gọi `sendJson("/duong-dan", "POST", dữLiệu)` (trang khách)
   hoặc `adminRequest("/duong-dan", "POST", dữLiệu)` (trang admin) — server trả JSON như cũ.

### Thanh loading khi chuyển trang

Thanh mỏng (3px) chạy ở **trên cùng màn hình** mỗi khi mở trang mới: màu cyan của logo ở trang khách,
màu xanh lá (màu chính) ở trang admin. Thanh nằm ở `src/components/TopLoader.tsx`, được đặt sẵn trong
2 layout `app/(client)/layout.tsx` và `app/(admin)/admin/layout.tsx`.

- Bấm `<Link>`, thẻ `<a>` thường, gửi form thường: thanh **tự chạy**, không cần viết thêm gì.
  Trang tải lại cả trang (đăng nhập, đăng xuất, đổi ngôn ngữ) thì thanh chạy trong lúc chờ server, trang mới mở ra thì chạy nốt tới hết.
- Trang mở xong trong 0,1 giây thì không hiện thanh (tránh nháy).
- Không chạy khi: mở tab mới (Ctrl / ⌘ + bấm, `target="_blank"`), link tải file (`download`, đường dẫn `/api/...`),
  link sang website khác, link `#mục` trong cùng trang. Link nào không muốn có thanh thì thêm thuộc tính `data-no-loader`.
- Code JS tự chuyển trang thì dùng hàm trong `src/lib/top-loader.ts` thay cho `window.location`:

  | Thay vì | Trang khách | Trang admin |
  |---|---|---|
  | `window.location.href = url` | `goTo(url)` | `adminGo(url)` (không tải lại cả trang) |
  | `window.location.reload()` | `reloadPage()` | `adminReload()` hoặc `drawNotify(...)` |
  | `router.push(url)` | `startTopLoader(url)` rồi `router.push(url)` | `adminGo(url)` |

  Riêng link tải file (ví dụ xuất Excel) vẫn dùng `window.location.href` để thanh không chạy.
- Đổi màu / độ dày: sửa `color` ở 2 file layout, `height` trong `src/components/top-loader.css`.

### Link và chuyển trang

- **Trang khách:** dùng `import Link from "@/components/client/ShopLink"` thay cho `next/link`. ShopLink tắt việc
  tải trước trang (prefetch): Next.js mặc định tải trước **mọi link đang hiện trên màn hình**, mà trang nào của website cũng
  lấy dữ liệu mới từ server Express, nên mở trang chủ là server phải dựng thêm ~20-30 trang vô ích cùng lúc (chỉ xảy ra ở
  bản build chạy thật, `npm run dev` không tải trước).
- **Trang admin:** dùng `<AdminLink href={adminUrl("/...")}>` (components/admin/AdminLink.tsx) thay cho thẻ `<a>`:
  chuyển trang không tải lại cả trang (không tải lại CSS, JS, font, menu). Phân trang, lọc, tìm kiếm, sau khi lưu / xoá cũng vậy:
  - `drawNotify(code, message)`: hiện thông báo ngay, lấy lại dữ liệu trang đang xem, dựng lại nội dung trang (ô nhập, nút về như mới)
  - `notifyAndGo(code, message, url)`: hiện thông báo ngay rồi mở trang `url`
  - Chuyển sang cùng trang nhưng khác tham số (`?page=2`, lọc khác, sửa sản phẩm khác): nội dung trang được dựng lại từ đầu
    (`lib/admin-page.tsx`), nên ô lọc dùng `defaultValue` vẫn hiện đúng giá trị mới.
  - Vẫn dùng thẻ `<a>` thường cho: đăng xuất, tải file (`/api/...`), link sang trang khách hàng (`target="_blank"`).
  - Component tự hẹn giờ / gắn sự kiện vào `window`, `document` thì nhớ gỡ ra khi rời trang (`return () => ...` trong `useEffect`),
    vì trang không còn được tải lại cả trang để tự dọn như trước.

### Ảnh thu nhỏ

Ảnh gốc admin tải lên thường nặng 1-2 MB. Server quản lý file (repo `file-manager-microservice`) thu nhỏ ảnh khi link có `?w=`:
`http://localhost:4000/media/abc.png?w=320` => ảnh WebP rộng 320px (vài chục KB), lưu ở thư mục `cache/` của repo đó để lần sau
trả ngay. Trong code giao diện:

- Trang khách: `mediaUrl(ctx, path, 320)` (link ảnh) và `mediaSrcSet(ctx, path, 320)` (thuộc tính `srcSet`: màn hình nét
  của điện thoại lấy ảnh 640px)
- Trang admin: `fileSrc(path, 160)` (`useAdmin()`), hoặc `sizedUrl(link, 160)` (`lib/media.ts`)
- Không truyền chiều rộng = file gốc (video, link copy / tải xuống, ảnh xem lớn)
- Cỡ có sẵn: 160, 320, 480, 640, 960, 1280, 1920 (số khác được làm tròn lên). Video, GIF, SVG luôn trả file gốc.

### Trang chậm: xem chậm ở đâu

Cửa sổ Terminal đang chạy Next.js in thời gian server Express trả dữ liệu cho mỗi trang, ví dụ:

```
[Express] GET /admin/product/list?page=2 200 - 412 ms
```

- Số này lớn (vài trăm ms trở lên): chậm ở server Express / database. MongoDB Atlas ở xa (khác nước) thì mỗi lần hỏi database mất
  vài chục - vài trăm ms, trên laptop sẽ chậm hơn hẳn trên VPS đặt gần database.
- Số này nhỏ mà trình duyệt vẫn chậm: do mạng / ảnh, hoặc do đang chạy `npm run dev`.
- `npm run dev` **luôn chậm hơn** bản thật: lần đầu mở mỗi trang phải biên dịch code (vài giây), code chưa được tối ưu.
  Muốn biết tốc độ thật thì chạy `npm run build` rồi `npm start`. Bản build chỉ in trang chậm hơn 1,5 giây.

### Thêm / sửa từ ngữ tiếng Nga, tiếng Việt

Vẫn sửa ở `server/locales/ru.ts` và `server/locales/vi.ts` — giao diện Next.js dùng chung 2 file này.

---

## 4. Đưa lên server thật (VPS)

1. Trên VPS, lấy code nhánh mới (hoặc nhánh `main` sau khi đã gộp), cài Node.js 20.9+.
   Cài thư viện bằng npm trong thư mục `server` và repo `file-manager-microservice` (lần đầu chuyển từ yarn sang npm,
   `npm ci` tự xoá thư mục `node_modules` cũ của yarn rồi cài lại đúng phiên bản trong `package-lock.json`):

   ```bash
   cd server && npm ci
   ```

   ```bash
   cd file-manager-microservice && npm ci
   ```

   Đang chạy 2 server này bằng `yarn start` thì đổi thành `npm start` (pm2: xem bước 6).
2. `server/.env`: `SITE_URL=https://ten-mien-cua-ban.ru` (tên miền thật, **không** có `:3001`).
3. `file-manager-microservice/.env`: `DOMAIN=https://ten-mien-cua-ban.ru/`.
4. `frontend/.env.local`: `API_URL=http://127.0.0.1:3000` (đổi `API_URL` thì phải build lại ở bước 5).
5. Build giao diện:

   ```bash
   cd frontend && npm ci && npm run build
   ```

6. Chạy giao diện Next.js như 1 tiến trình mới, server Express và server quản lý file giữ cách đang chạy hiện tại.
   Nếu chưa có cách chạy riêng, có thể dùng pm2 (tự chạy lại khi lỗi / khởi động lại máy):

   ```bash
   npm install -g pm2
   ```

   ```bash
   cd server && pm2 start npm --name server -- start
   ```

   ```bash
   cd frontend && pm2 start npm --name frontend -- start
   ```

   ```bash
   cd file-manager-microservice && pm2 start npm --name file-manager -- start
   ```

   ```bash
   pm2 save && pm2 startup
   ```

7. nginx: tên miền chính trỏ vào Next.js (cổng 3001), **không** mở cổng 3000 của Express ra ngoài:

   ```nginx
   server {
     server_name ten-mien-cua-ban.ru;
     client_max_body_size 50m;   # upload ảnh, file Excel

     location / {
       proxy_pass http://127.0.0.1:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

   Server quản lý file (ảnh) giữ nguyên cách đang chạy (tên miền / cổng riêng, `domainFileManager` trong `server/config/variable.config.ts`).

8. Т-Банк: địa chỉ nhận thông báo vẫn là `https://ten-mien-cua-ban.ru/payment/tbank` (Next.js chuyển tiếp sang Express), không cần đổi trong Т-Бизнес.

---

## 5. Sau khi thử ổn

- Gộp nhánh `claude/brave-turing-goeokm` vào `main` (tạo Pull Request trên GitHub ở cả 2 repo).
- Khi không cần giao diện PUG nữa có thể xoá: `server/views` (trừ `server/views/client/emails` — nội dung email vẫn dựng bằng PUG),
  `server/public/client/assets/js/main.js`, `server/public/admin/assets/js/main.js`, và 2 thư mục mẫu HTML `frontend-admin`, `frontend-client`.
  Nên để lại một thời gian cho chắc rồi mới xoá.
