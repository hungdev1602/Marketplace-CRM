# Hướng dẫn: Thanh toán online + Giao hàng qua ApiShip

Tính năng này nằm trên nhánh `claude/stoic-hopper-7u2k9g` (tách ra từ `main`, nhánh `main` chưa bị thay đổi).

## Quy trình một đơn hàng

1. Khách bấm **«Оформить заказ»** ở giỏ hàng → trang `/checkout`.
2. Khách nhập người nhận, chọn **giao tận cửa** hoặc **giao tới điểm nhận hàng (ПВЗ)**, nhập thành phố/địa chỉ, bấm **«Рассчитать доставку»**.
   Server hỏi ApiShip giá của các hãng (СДЭК, Boxberry, Почта России...), khách chọn hãng (và chọn điểm nhận hàng).
3. Khách bấm **«Перейти к оплате»** → đơn được tạo ở trạng thái *Chờ thanh toán*, hàng được giữ trong kho, khách được chuyển sang trang thanh toán YooKassa.
4. Khách thanh toán xong → đơn chuyển sang *Đã thanh toán, chờ gửi hàng*, khách nhận email xác nhận, cửa hàng nhận email báo đơn mới (`ORDER_NOTIFY_EMAIL`).
5. Nhân viên vào **Admin → Đơn hàng**, mở đơn, đóng hàng, chọn ngày gửi và bấm **«Tạo vận đơn ApiShip»** → in **phiếu gửi hàng** → giao cho hãng vận chuyển.
6. Trạng thái giao hàng tự cập nhật từ ApiShip mỗi 30 phút (hoặc bấm «Cập nhật trạng thái»). Khi hãng cấp mã vận đơn, khách nhận email có mã tra cứu.

**Khách chưa thanh toán thì không tạo được vận đơn** (không có thanh toán khi nhận hàng — COD).
Đơn không thanh toán trong 60 phút sẽ tự huỷ, hàng trả lại kho.

## Bước 1 — Lấy code về máy

```bash
git fetch origin
git checkout claude/stoic-hopper-7u2k9g
cd server
yarn install
```

## Bước 2 — Thêm cấu hình vào file `server/.env`

Mở `server/.env.example`, chép các dòng mới (phần ApiShip, YooKassa) sang `server/.env`. Để thử ngay trên máy (chưa cần tài khoản thật):

```
APISHIP_TEST=true
APISHIP_LOGIN=test
APISHIP_PASSWORD=test
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
PAYMENT_TEST_MODE=true
ORDER_NOTIFY_EMAIL=email-cua-ban@gmail.com
```

- `APISHIP_TEST=true` + `test/test`: máy chủ thử nghiệm công khai của ApiShip, không tạo vận đơn thật.
- `PAYMENT_TEST_MODE=true`: trang thanh toán giả có nút «Оплатить (тест)» / «Отменить оплату». **Không bật trên server thật.**

## Bước 3 — Điền địa chỉ kho gửi hàng

Mở `server/config/variable.config.ts`, tìm `apishipSender` và điền địa chỉ kho, tên cửa hàng/ИП, người liên hệ, số điện thoại.
Cùng phần đó còn có các tuỳ chọn: miễn phí giao hàng từ bao nhiêu tiền, cộng thêm phí đóng gói, chỉ dùng một số hãng, cỡ thùng đóng hàng, tự động tạo vận đơn...

Ở trang sửa sản phẩm, nên nhập phần **Vận chuyển** (khối lượng cả bao bì, kích thước) để phí giao hàng tính đúng.

## Bước 4 — Chạy và thử

```bash
yarn start
```

1. Mở http://localhost:3000, thêm sản phẩm vào giỏ, bấm «Оформить заказ».
2. Nhập thành phố (ví dụ `Москва`), bấm «Рассчитать доставку», chọn hãng / điểm nhận hàng, tick đồng ý, bấm «Перейти к оплате».
3. Ở trang thanh toán giả bấm «Оплатить (тест)».
4. Vào http://localhost:3000/admin/order/list → mở đơn → «Tạo vận đơn ApiShip».

Tài khoản admin không phải Super Admin cần được cấp quyền mới trong **Nhóm quyền**: *Danh sách đơn hàng*, *Xử lý đơn hàng*, *Huỷ đơn hàng, hoàn tiền*.

Nếu có lỗi khi tính phí / tạo vận đơn, xem thông báo trong cửa sổ terminal đang chạy server (lỗi ApiShip trả về được in ra đó và hiện ở trang chi tiết đơn hàng).

## Bước 5 — Tài khoản ApiShip thật

1. Đăng nhập tài khoản ApiShip vừa đăng ký.
2. Kết nối các hãng vận chuyển muốn dùng (mục kết nối/подключения служб доставки): dùng hợp đồng riêng với hãng (nhập khoá API của hãng) hoặc hợp đồng của ApiShip nếu ApiShip cung cấp cho hãng đó. Chỉ hãng đã kết nối mới hiện giá ở trang đặt hàng.
3. Trong `server/.env`: `APISHIP_TEST=false`, `APISHIP_LOGIN`, `APISHIP_PASSWORD` = tài khoản ApiShip của bạn. Nếu đăng nhập API báo lỗi, hỏi hỗ trợ ApiShip (support@apiship.ru) cách lấy thông tin truy cập API.
4. Nếu cửa hàng tự mang hàng tới điểm của hãng (không để hãng tới kho lấy): đổi `apishipPickupType = 2` và điền `apishipPointInIds` trong `variable.config.ts`.
5. Hàng mát / đông lạnh: nếu chỉ một số hãng nhận, điền key của các hãng đó vào `apishipColdProviderKeys`.

## Bước 6 — Tài khoản YooKassa

**Thử với cửa hàng thử nghiệm (Тестовый магазин):**

1. Đăng ký tại https://yookassa.ru, vào cửa hàng thử nghiệm → *Интеграция → Ключи API*: lấy `shopId` và *Секретный ключ* (bắt đầu bằng `test_`).
2. `server/.env`: `YOOKASSA_SHOP_ID=...`, `YOOKASSA_SECRET_KEY=test_...`, `PAYMENT_TEST_MODE=false`.
3. Đặt hàng, thanh toán bằng thẻ thử của YooKassa (ví dụ `5555 5555 5555 4477`, ngày hết hạn bất kỳ trong tương lai, CVC bất kỳ).
   Trên laptop YooKassa không gửi được thông báo về máy bạn, nhưng server tự hỏi YooKassa khi khách quay lại trang đơn hàng và mỗi phút một lần, nên vẫn chạy đúng.

**Bán thật:**

1. Ký hợp đồng với YooKassa, lấy `shopId` + khoá bí mật của cửa hàng thật.
2. Trong trang YooKassa: *Интеграция → HTTP-уведомления*, URL `https://ten-mien-cua-ban.ru/payment/yookassa`, chọn sự kiện `payment.succeeded`, `payment.canceled`.
3. `SITE_URL` trong `.env` phải là tên miền thật (YooKassa chuyển khách về `SITE_URL/order/...`).
4. Hoá đơn điện tử 54-ФЗ (чек): nếu đã kết nối «Чеки от ЮKassa» hoặc máy tính tiền online, đổi `yookassaSendReceipt = true` và **kiểm tra lại với kế toán** bảng `yookassaVatCodeMap` (mã thuế VAT) và `yookassaReceiptPaymentMode`.

## Những file chính

| Phần | File |
| --- | --- |
| Cấu hình | `server/config/variable.config.ts`, `server/.env.example` |
| Đơn hàng | `server/models/order.model.ts`, `server/helpers/order.helper.ts` |
| ApiShip | `server/helpers/apiship.helper.ts` |
| YooKassa | `server/helpers/payment.helper.ts`, `server/controller/client/payment.controller.ts` |
| Trang khách hàng | `server/controller/client/checkout.controller.ts`, `order.controller.ts`, `server/views/client/pages/checkout.pug`, `order-detail.pug`, `account-orders.pug` |
| Trang admin | `server/controller/admin/order.controller.ts`, `server/views/admin/pages/order-list.pug`, `order-detail.pug` |
