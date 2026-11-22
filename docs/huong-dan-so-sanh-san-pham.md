# Hướng dẫn: So sánh sản phẩm

Tính năng này nằm trên nhánh `claude/adoring-franklin-u2tl6n` (tách ra từ `main` mới nhất, nhánh `main` chưa bị thay đổi).

- Chỉ sửa repo **Marketplace-CRM** (thư mục `server` và `frontend`). Repo **file-manager-microservice không phải sửa gì**, chỉ cần chạy như bình thường để hiện ảnh sản phẩm.
- **Không cài thêm thư viện mới**, **không thêm bảng (collection) mới trong database**, không cần chạy lệnh cập nhật dữ liệu nào.
- Trang so sánh chỉ có ở **giao diện Next.js** (`http://localhost:3001`). Giao diện PUG cũ (`http://localhost:3000`) không có trang này (mở `/compare` ở đó sẽ ra trang 404).

## Tính năng có gì

**Chọn sản phẩm để so sánh**

- Thẻ sản phẩm (trang chủ, danh sách, danh mục, tìm kiếm, sản phẩm tương tự, yêu thích): nút tròn **⚖** ngay dưới nút ♡ ở góc ảnh.
  Bấm 1 lần là thêm vào so sánh (nút chuyển sang nền xanh cyan), bấm lần nữa là bỏ ra.
- Trang chi tiết sản phẩm: nút **«⚖ Сравнить»** dưới nút «Добавить в корзину» (đã thêm thì đổi thành «В сравнении»).
- Sau khi bấm hiện thông báo «Товар добавлен к сравнению» kèm link **«Перейти к сравнению»**.
- So sánh được **tối đa 20 sản phẩm** cùng lúc, trên cả máy tính và điện thoại. Bấm sản phẩm thứ 21 thì báo
  «Сравнить можно не больше 20 товаров…» kèm link sang trang so sánh để bỏ bớt.
- Sản phẩm hết hàng vẫn so sánh được (nút giỏ hàng hiện «Нет в наличии»).

**Biểu tượng ⚖ ở đầu trang**

- Máy tính: biểu tượng ⚖ trong menu, bên trái «Избранное», có số sản phẩm đang so sánh (chấm đỏ).
- Điện thoại: biểu tượng ⚖ cạnh ♡ ở đầu trang, **chỉ hiện khi đã có sản phẩm so sánh** (cho đầu trang gọn); trong menu ☰ luôn có mục «Сравнение».

**Trang so sánh** — `/compare`

- Bảng: mỗi cột là 1 sản phẩm (ảnh, tên, giá, nút «В корзину», nút ✕ bỏ khỏi so sánh), mỗi dòng là 1 thông tin, chia 4 mục:
  - **Основное**: giá, **giá cho 1 kg / 1 l**, giảm giá, số sao đánh giá, còn hàng, thương hiệu, nước sản xuất, nhà sản xuất, danh mục, khối lượng / thể tích, đơn vị bán
  - **Пищевая ценность на 100 г / 100 мл**: calo, đạm, béo, carbohydrate
  - **Состав и особенности**: đặc điểm (cay, chay, halal…), chất gây dị ứng, thành phần (dài thì có «Читать полностью»)
  - **Хранение и срок годности**: điều kiện bảo quản, hạn sử dụng
- **Ô tốt nhất được tô xanh**: «Дешевле всех» (giá thấp nhất), «Выгоднее всех» (giá cho 1 kg / 1 l thấp nhất), «Лучшая оценка» (điểm đánh giá cao nhất).
- **Giá cho 1 kg / 1 l** tự tính từ giá và ô «Khối lượng tịnh / thể tích» của sản phẩm (ví dụ mì 75 g giá 59 ₽ ⇒ 786,67 ₽ / кг),
  giúp khách so gói to – gói nhỏ. Sản phẩm tính theo kg chỉ so với sản phẩm tính theo kg, theo lít chỉ so với lít.
  Sản phẩm chưa nhập khối lượng tịnh thì dòng này hiện «—».
- Ô tick **«Только различия»**: ẩn các dòng mà mọi sản phẩm giống nhau (ví dụ cùng điều kiện bảo quản).
- Thông tin mà **không sản phẩm nào có** thì cả dòng tự ẩn; sản phẩm nào thiếu thông tin thì ô đó hiện «—».
  ⇒ Nhập càng đủ thông tin sản phẩm ở trang admin (khối lượng, КБЖУ, thành phần, dị ứng…) thì bảng so sánh càng hữu ích.
- Cột cuối **«Добавить товар»** (khi chưa đủ 20 sản phẩm) mở danh sách sản phẩm. Nút **«Очистить сравнение»** bỏ hết.
- **Nhiều sản phẩm hơn màn hình** (máy tính vừa khoảng 4–5 cột, điện thoại 2 cột):
  - Kéo / vuốt ngang bảng (touchpad vuốt 2 ngón, chuột: Shift + lăn chuột). Bảng tự dừng đúng mép cột sản phẩm.
  - Nút **‹ ›** phía trên bảng kèm dòng **«Товары 1–4 из 20»**: bấm › để trượt sang nhóm sản phẩm tiếp theo.
  - Cột tên dòng («Цена», «Состав»…) luôn đứng yên bên trái.
  - Cuộn xuống dưới thì **hàng tên sản phẩm dính trên cùng** (ảnh nhỏ, tên, giá của từng cột, chạy ngang theo bảng),
    nên lúc xem dòng «Состав» ở giữa bảng vẫn biết cột nào là sản phẩm nào. Trên máy tính hàng này có thêm nút ‹ ›.
- **Lọc theo danh mục**: khi sản phẩm đang so sánh thuộc nhiều danh mục, phía trên bảng có các nút
  «Все 20», «Лапша 9», «Соусы 6»… để so mì với mì, nước chấm với nước chấm. Ô tô xanh («Дешевле всех»…) và
  «Только различия» tính trong danh mục đang chọn.
- Điện thoại: tên mỗi dòng nằm trên 1 hàng riêng, các cột sản phẩm vuốt ngang được.
- Có giao diện sáng / tối, tiếng Nga / tiếng Việt như các trang khác.

**Danh sách so sánh lưu ở đâu**

- Không lưu trong database: id các sản phẩm khách chọn nằm trong **cookie `compareList`** của trình duyệt, giữ **30 ngày**.
- Khách chưa đăng nhập hay đã đăng nhập đều dùng như nhau. Mở bằng máy / trình duyệt khác thì danh sách so sánh trống
  (khác với giỏ hàng, yêu thích là lưu theo tài khoản).
- Sản phẩm bị admin chuyển «Ngừng bán» hoặc xoá thì tự biến mất khỏi danh sách so sánh khi khách mở trang `/compare`.

## Các file đã thêm / sửa

| File | Thay đổi |
|---|---|
| `server/helpers/compare.helper.ts` (mới) | Đọc / ghi cookie `compareList`, tính giá cho 1 kg / 1 l |
| `server/controller/client/compare.controller.ts` (mới) | Trang `/compare`, thêm / bỏ sản phẩm (`POST /compare/toggle`), xoá hết (`DELETE /compare/clear`) |
| `server/routes/client/compare.route.ts` (mới), `server/routes/client/index.route.ts` | Đường dẫn `/compare` |
| `server/middlewares/client/layout.middleware.ts` | Gửi kèm mọi trang: số sản phẩm đang so sánh (số trên biểu tượng ⚖), nút nào đang bật |
| `server/config/variable.config.ts` | `clientCompareMaxItems` (số sản phẩm tối đa), `clientCompareKeepDays` (số ngày giữ cookie) |
| `server/locales/ru.ts`, `server/locales/vi.ts` | Từ ngữ tiếng Nga / tiếng Việt (các key bắt đầu bằng `compare`) |
| `server/helpers/client-product.helper.ts`, `server/controller/client/product.controller.ts` | Chuyển bảng từ ngữ hạn sử dụng (`shelfLifeKeyList`) sang helper để trang chi tiết và trang so sánh dùng chung |
| `frontend/src/app/(client)/compare/page.tsx` (mới) | Trang `/compare` |
| `frontend/src/components/client/views/CompareView.tsx` (mới) | Bảng so sánh |
| `frontend/src/components/client/CompareButton.tsx` (mới) | Nút ⚖ «Сравнить» |
| `frontend/src/components/client/ShopProvider.tsx`, `Shell.tsx` | Trạng thái so sánh trên trang (`toggleCompare`) |
| `frontend/src/components/client/common.tsx`, `app/(client)/product/[slug]/page.tsx` | Đặt nút so sánh lên thẻ sản phẩm, trang chi tiết |
| `frontend/src/components/client/HeaderParts.tsx`, `MobileMenu.tsx` | Biểu tượng ⚖ ở đầu trang, mục «Сравнение» trong menu điện thoại |
| `frontend/public/client/assets/css/sfoodie.css` | Giao diện (phần cuối file: «SO SÁNH SẢN PHẨM») |

## Chạy thử trên laptop (từng bước)

Cách chạy giống [huong-dan-nextjs.md](huong-dan-nextjs.md) (mục 2), chỉ khác tên nhánh. Cần 3 cửa sổ Terminal.

### Bước 1 — Lấy code của nhánh thử nghiệm (repo Marketplace-CRM)

Mở Terminal trong thư mục repo `Marketplace-CRM` trên máy. Nếu đang có file sửa dở chưa commit thì commit hoặc chạy `git stash` trước.

```bash
git fetch origin
```

```bash
git checkout claude/adoring-franklin-u2tl6n
```

```bash
git pull origin claude/adoring-franklin-u2tl6n
```

(Máy đã từng có nhánh này từ lần thử trước thì lệnh `git pull` sẽ lấy thêm phần mới; chưa có thì `git checkout` tự tạo nhánh.)

Repo `file-manager-microservice`: **giữ nguyên nhánh đang dùng** (nhánh `main` là được), không cần lấy code mới.

### Bước 2 — Chạy server quản lý file (cửa sổ Terminal 1)

Trong thư mục repo `file-manager-microservice`:

```bash
npm start
```

### Bước 3 — Chạy server Express (cửa sổ Terminal 2)

Trong thư mục `Marketplace-CRM/server` (không có thư viện mới, nên không cần `npm install` nếu trước đó đã cài):

```bash
npm start
```

Thấy `App listening on port 3000` và `Kết nối database thành công <3` là được.
(Nếu cửa sổ này **đang chạy sẵn** từ trước khi đổi nhánh thì nodemon tự khởi động lại; thấy lỗi lạ thì bấm `Ctrl + C` rồi chạy lại lệnh trên.)

### Bước 4 — Chạy giao diện Next.js (cửa sổ Terminal 3)

Trong thư mục `Marketplace-CRM/frontend`:

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3001**

### Bước 5 — Những chỗ nên bấm thử

- [ ] Trang danh sách sản phẩm: bấm nút ⚖ trên 2–3 thẻ ⇒ nút chuyển màu cyan, biểu tượng ⚖ ở menu hiện số 2, 3
- [ ] Bấm ⚖ lần nữa trên 1 thẻ ⇒ nút về màu trắng, số giảm đi 1
- [ ] Thêm nhiều sản phẩm (ví dụ 10–20, ở nhiều danh mục). Bấm sản phẩm thứ 21 ⇒ báo «Сравнить можно не больше 20 товаров…»,
      link «Перейти к сравнению» mở trang so sánh
- [ ] Trang chi tiết sản phẩm: nút «Сравнить» / «В сравнении»
- [ ] Bấm biểu tượng ⚖ ở menu (hoặc mở thẳng http://localhost:3001/compare):
  - [ ] Ô xanh «Дешевле всех», «Выгоднее всех», «Лучшая оценка» đúng sản phẩm
  - [ ] Dòng «Цена за 1 кг / 1 л» tính đúng (giá ÷ khối lượng tịnh)
  - [ ] Tick «Только различия» ⇒ các dòng giống nhau biến mất
  - [ ] Bấm ✕ trên 1 cột ⇒ cột biến mất, số trên biểu tượng ⚖ giảm
  - [ ] Nút ‹ › trên bảng: «Товары 1–4 из 20» đổi theo, tới cuối thì nút › mờ đi
  - [ ] Cuộn xuống giữa bảng ⇒ hàng tên sản phẩm dính dưới menu, kéo ngang bảng thì hàng này chạy theo
  - [ ] Nút danh mục («Все», «Лапша»…) ⇒ bảng chỉ còn sản phẩm của danh mục đó
  - [ ] «В корзину» trong bảng ⇒ thêm vào giỏ như bình thường
  - [ ] «Очистить сравнение» ⇒ hiện «В сравнении пока нет товаров»
- [ ] Tải lại trang, tắt / mở lại trình duyệt ⇒ danh sách so sánh vẫn còn (giữ 30 ngày)
- [ ] Đăng nhập / đăng xuất ⇒ danh sách so sánh vẫn giữ nguyên
- [ ] Admin chuyển 1 sản phẩm đang so sánh sang «Ngừng bán» ⇒ mở lại `/compare` thì sản phẩm đó tự biến mất
- [ ] Đổi ngôn ngữ VI, giao diện tối
- [ ] Điện thoại (thu nhỏ cửa sổ trình duyệt hoặc F12 ⇒ biểu tượng điện thoại): biểu tượng ⚖ cạnh ♡ chỉ hiện khi đã có sản phẩm,
      bảng vuốt ngang được, mục «Сравнение» trong menu ☰

Gặp lỗi: chụp màn hình trang, chép dòng báo lỗi đỏ trong Terminal 2 (server) và Terminal 3 (Next.js) gửi lại để sửa.

### Quay lại nhánh main

```bash
git checkout main
```

## Muốn đổi cài đặt

Sửa trong `server/config/variable.config.ts` rồi khởi động lại server Express:

- `clientCompareMaxItems` — số sản phẩm tối đa được so sánh (mặc định 20, máy tính và điện thoại như nhau).
  Danh sách nằm trong cookie, nên không đặt quá 100.
- `clientCompareKeepDays` — số ngày trình duyệt giữ danh sách so sánh (mặc định 30).

Từ ngữ trên trang: sửa ở `server/locales/ru.ts` và `server/locales/vi.ts` (các key bắt đầu bằng `compare`, ví dụ `compareFull`, `compareUnitPrice`).

## Đưa lên server thật (sau khi thử ổn)

1. Gộp nhánh `claude/adoring-franklin-u2tl6n` vào `main` (tạo Pull Request trên GitHub, chỉ repo Marketplace-CRM).
2. Trên VPS, trong thư mục repo: `git pull` để lấy code mới của `main`.
3. Không có thư viện mới nên không cần `npm ci`. Build lại giao diện Next.js:

   ```bash
   cd frontend && npm run build
   ```

4. Khởi động lại server Express và giao diện Next.js (nếu chạy bằng pm2 như trong huong-dan-nextjs.md):

   ```bash
   pm2 restart server frontend
   ```
