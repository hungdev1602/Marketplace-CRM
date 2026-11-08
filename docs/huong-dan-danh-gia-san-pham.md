# Hướng dẫn: Đánh giá sản phẩm (giống Wildberries)

Tính năng này nằm trên nhánh `claude/blissful-tesla-jldptw` (tách ra từ `main`, nhánh `main` chưa bị thay đổi).
Không cần cài thêm thư viện mới. Repo **file-manager-microservice không phải sửa gì**, chỉ cần chạy như bình thường.

## Tính năng có gì

**Phía khách hàng**

- Chỉ khách **đã nhận hàng** (đơn ở trạng thái *Đã giao hàng*) mới đánh giá được sản phẩm trong đơn đó. Mỗi khách đánh giá mỗi sản phẩm 1 lần (mua lại nhiều lần thì sửa đánh giá cũ).
- Form đánh giá giống Wildberries: chấm **1–5 sao** (bắt buộc), **Достоинства / Недостатки / Комментарий** (không bắt buộc), **tối đa 5 ảnh**, tuỳ chọn **«Оставить отзыв анонимно»** (hiện «Покупатель» thay tên).
  Ảnh chụp điện thoại được **trình duyệt tự thu nhỏ** (cạnh dài 1600px, JPG) trước khi gửi: ảnh 5–10 MB chỉ còn vài trăm KB.
- Khách chưa đăng nhập (đặt hàng không cần tài khoản) vẫn đánh giá được bằng link đơn hàng trong email.
- Chỗ để vào viết đánh giá:
  - Trang đơn hàng: khi đơn đã giao, hiện khung vàng **«Оцените товары»**, mỗi sản phẩm có 5 ngôi sao — bấm sao nào thì mở form chọn sẵn số sao đó.
  - Trang **«Мои отзывы»** (`/account/reviews`, có trong menu tài khoản): mục *Ждут оценки* (sản phẩm đã nhận chưa đánh giá) và *Мои отзывы* (trạng thái duyệt, lý do bị từ chối, câu trả lời của cửa hàng).
  - Trang sản phẩm: nút **«Написать отзыв»** nếu khách đã đăng nhập và đã nhận sản phẩm này.
  - **Email «Как вам покупка?»** gửi tự động 24 giờ sau khi đơn chuyển sang *Đã giao hàng*, có 5 ngôi sao bấm được cho từng sản phẩm.
- Khách sửa / xoá đánh giá của mình trong **30 ngày**.
- Trang sản phẩm có phần **«Отзывы»**:
  - Điểm trung bình lớn (ví dụ 4,6), số lượt đánh giá, thanh phân bố 5★…1★ (bấm vào để lọc).
  - **«Фото покупателей»**: ảnh của khách, bấm để xem lớn (vuốt / phím ← → để xem ảnh khác).
  - Lọc: *Все*, *С фото*, theo số sao; sắp xếp: mới nhất, hữu ích nhất, điểm cao trước, điểm thấp trước; nút **«Показать ещё»**.
  - **«Отзыв полезен? Да / Нет»** (phải đăng nhập, không bấm cho đánh giá của chính mình).
  - **«Ответ магазина SFoodie»** hiện dưới đánh giá khi cửa hàng trả lời.
- Thẻ sản phẩm (trang chủ, danh sách...) hiện **★ 4,6 · 37 оценок**; trang danh sách có thêm cách sắp xếp **«По рейтингу»**.
- Google / Yandex: trang sản phẩm có dữ liệu có cấu trúc (schema.org) để hiện số sao, giá, còn hàng ngay trên trang kết quả tìm kiếm.

**Phía admin** — menu **Đánh giá sản phẩm** (`/admin/review/list`)

- Lọc theo từ khoá (tên sản phẩm, tên / email khách, mã đơn, nội dung), trạng thái, số sao, loại (có ảnh, có chữ, chỉ chấm sao).
- **Duyệt** (hiện lên trang sản phẩm), **Từ chối** kèm lý do (khách thấy lý do và sửa lại được), **Xoá** hẳn (cả ảnh, ví dụ spam), **Trả lời khách**.
- Mặc định **phải duyệt** đánh giá có chữ / ảnh trước khi hiện (giống Wildberries). Chỉ chấm sao (không viết gì) thì được tính ngay vào điểm.
- Mọi thao tác được ghi vào **Nhật ký hoạt động**.

## Bước 1 — Lấy code về máy

Mở terminal trong thư mục repo `Marketplace-CRM`:

```bash
git fetch origin
```

```bash
git checkout claude/blissful-tesla-jldptw
```

```bash
git pull origin claude/blissful-tesla-jldptw
```

Không có thư viện mới, nhưng chạy lại cho chắc:

```bash
cd server
yarn install
```

## Bước 2 — Chạy server Quản lý file (repo file-manager-microservice)

Ảnh khách gửi kèm đánh giá được lưu trên server này, trong thư mục `media/danh-gia` (tự tạo khi có ảnh đầu tiên).
Mở **terminal thứ 2** trong thư mục repo `file-manager-microservice`:

```bash
yarn start
```

Kiểm tra file `.env` của repo này có dòng `DOMAIN` chứa địa chỉ website (có dấu `/` ở cuối), nếu không ảnh sẽ không hiện:

```
DOMAIN=http://localhost:3000/
```

## Bước 3 — Chạy server chính

Trong terminal đầu tiên (thư mục `Marketplace-CRM/server`):

```bash
yarn start
```

## Bước 4 — Thử tính năng trên máy

1. Để thử nhanh không mất tiền: trong `server/.env` đặt `PAYMENT_TEST_MODE=true` (như hướng dẫn thanh toán), khởi động lại server.
2. Mở http://localhost:3000, **đăng nhập** tài khoản khách, thêm vài sản phẩm vào giỏ, đặt hàng, bấm «Оплатить (тест)».
3. Vào http://localhost:3000/admin/order/list → mở đơn vừa đặt → bấm **«Đánh dấu đã giao hàng»**.
4. Quay lại trang đơn hàng của khách (Личный кабинет → Мои заказы → mở đơn): thấy khung vàng **«Оцените товары»** và 5 ngôi sao dưới mỗi sản phẩm.
5. Bấm 1 ngôi sao → viết ưu điểm / nhược điểm / nhận xét, thêm ảnh → **«Отправить отзыв»**. Trang chuyển về «Мои отзывы», đánh giá ở trạng thái *На проверке*.
6. Vào http://localhost:3000/admin/review/list → bấm **Duyệt** (thử thêm **Trả lời khách**).
7. Mở trang sản phẩm: thấy điểm trung bình, ảnh của khách, đánh giá và câu trả lời. Thẻ sản phẩm ở trang chủ hiện ★.
8. Đăng nhập **tài khoản khách khác** để thử nút «Да / Нет» (Отзыв полезен?).
9. Thử chỉ chấm sao (không viết gì) cho 1 sản phẩm khác: điểm được tính ngay, không cần duyệt.

**Thử email nhắc đánh giá:** email gửi 24 giờ sau khi giao hàng. Muốn thử ngay: trong `server/config/variable.config.ts` tạm đặt `reviewRequestDelayHours = 0`, khởi động lại server, đánh dấu 1 đơn đã giao rồi đợi tối đa 1 giờ (hoặc khởi động lại server lần nữa — server kiểm tra ngay khi khởi động). Chưa cấu hình SMTP thì nội dung email (kèm link) được in ra terminal của server chính. Thử xong nhớ đổi lại `24`.

## Bước 5 — Cấp quyền cho nhân viên

Tài khoản Super Admin dùng được ngay. Tài khoản admin khác cần được cấp quyền mới trong **Nhóm quyền**:

- *Danh sách đánh giá sản phẩm của khách* — xem trang Đánh giá sản phẩm
- *Duyệt / từ chối / xoá đánh giá sản phẩm*
- *Trả lời đánh giá sản phẩm (thay mặt cửa hàng)*

## Tuỳ chỉnh (file `server/config/variable.config.ts`, phần «Đánh giá sản phẩm» ở cuối file)

| Tên | Mặc định | Ý nghĩa |
|---|---|---|
| `reviewModeration` | `true` | `true`: phải duyệt đánh giá có chữ / ảnh; `false`: hiện ngay (vẫn từ chối / xoá được sau) |
| `reviewMaxPhotos` | `5` | Số ảnh tối đa mỗi đánh giá |
| `reviewPhotoMaxSize` | `10` | Dung lượng tối đa mỗi ảnh (MB) |
| `reviewPhotoMaxSide` | `1600` | Trình duyệt thu nhỏ ảnh về cạnh dài này (px) trước khi gửi |
| `reviewImageFolder` | `"danh-gia"` | Thư mục lưu ảnh trên server Quản lý file |
| `reviewTextMaxLength` | 1000 / 1000 / 2000 | Số ký tự tối đa: ưu điểm / nhược điểm / nhận xét |
| `reviewEditDays` | `30` | Khách sửa / xoá đánh giá trong bao nhiêu ngày |
| `reviewPerPage` | `10` | Số đánh giá mỗi lần tải ở trang sản phẩm |
| `reviewRequestEmail` | `true` | Bật / tắt email nhắc đánh giá |
| `reviewRequestDelayHours` | `24` | Gửi email nhắc sau khi giao hàng bao nhiêu giờ |
| `reviewRequestMaxDays` | `14` | Chỉ nhắc các đơn giao trong bao nhiêu ngày gần đây |

Từ ngữ hiện cho khách (tiếng Nga / tiếng Việt) nằm trong `server/locales/ru.ts`, `server/locales/vi.ts` (các key bắt đầu bằng `review`).

## Lưu ý khi đưa lên server thật

- Khi chạy bản mới lần đầu, các đơn **đã giao trong 14 ngày gần đây** (chưa từng nhận email nhắc) sẽ nhận email «Как вам покупка?». Không muốn vậy thì tạm đặt `reviewRequestEmail = false` lần chạy đầu.
- File `.env` của server Quản lý file trên server thật: `DOMAIN` phải có tên miền thật của website (ví dụ `DOMAIN=https://ten-mien-cua-ban.ru/`), nếu không ảnh đánh giá (và ảnh sản phẩm) không hiện.
- Ảnh đánh giá cũng hiện trong trang **Quản lý file** của admin (thư mục `danh-gia`). Xoá đánh giá hoặc khách bỏ ảnh khi sửa thì file ảnh tự xoá theo.

## Gộp vào nhánh `main`

Thử xong và thấy ổn thì tạo Pull Request từ `claude/blissful-tesla-jldptw` vào `main` trên GitHub rồi bấm Merge (hoặc nhờ Claude tạo Pull Request).

## Các file chính

- Server: `models/review.model.ts`, `models/review-vote.model.ts`, `helpers/review.helper.ts`, `controller/client/review.controller.ts`, `controller/admin/review.controller.ts`, `validates/client/review.validate.ts`, `routes/client/review.route.ts`, `routes/admin/review.route.ts`
- Giao diện khách: `views/client/pages/review-write.pug`, `views/client/pages/account-reviews.pug`, `views/client/partials/review-list.pug`, `views/client/mixins/review-item.pug`, `views/client/mixins/rating-stars.pug`, `views/client/emails/review-request.pug`; JS / CSS ở cuối `public/client/assets/js/main.js` và `public/client/assets/css/sfoodie.css` (phần «ĐÁNH GIÁ SẢN PHẨM»)
- Admin: `views/admin/pages/review-list.pug`
