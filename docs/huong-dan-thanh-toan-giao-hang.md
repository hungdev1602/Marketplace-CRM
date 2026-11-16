# Hướng dẫn: Thanh toán online + Giao hàng qua ApiShip

Tính năng này nằm trên nhánh `claude/stoic-hopper-7u2k9g` (tách ra từ `main`, nhánh `main` chưa bị thay đổi).

> **Cập nhật:** khoá Т-Банк, tài khoản ApiShip, email, danh sách hãng vận chuyển và địa chỉ kho giờ nhập được ở trang
> **Admin → Kết nối API** (không cần sửa `.env` / `variable.config.ts`), có nút kiểm tra kết nối và nhật ký gọi API.
> Xem [huong-dan-ket-noi-api.md](huong-dan-ket-noi-api.md). Cách cấu hình bằng file `.env` bên dưới vẫn dùng được.

## Quy trình một đơn hàng

1. Khách bấm **«Оформить заказ»** ở giỏ hàng → trang `/checkout`.
2. Khách nhập người nhận, chọn **giao tận cửa** hoặc **giao tới điểm nhận hàng (ПВЗ)**, nhập thành phố/địa chỉ, bấm **«Рассчитать доставку»**.
   Server hỏi ApiShip giá của các hãng (СДЭК, Boxberry, Почта России...), khách chọn hãng (và chọn điểm nhận hàng).
3. Khách bấm **«Перейти к оплате»** → đơn được tạo ở trạng thái *Chờ thanh toán*, hàng được giữ trong kho, khách được chuyển sang trang thanh toán của Т-Банк (thẻ ngân hàng, СБП... tuỳ cài đặt terminal).
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

Mở `server/.env.example`, chép các dòng mới (phần ApiShip, Т-Банк) sang `server/.env`. Để thử ngay trên máy (chưa cần tài khoản thật):

```
APISHIP_TEST=true
APISHIP_LOGIN=test
APISHIP_PASSWORD=test
TBANK_TERMINAL_KEY=
TBANK_PASSWORD=
PAYMENT_TEST_MODE=true
ORDER_NOTIFY_EMAIL=email-cua-ban@gmail.com
```

- `APISHIP_TEST=true` + `test/test`: máy chủ thử nghiệm công khai của ApiShip, không tạo vận đơn thật.
- `PAYMENT_TEST_MODE=true`: trang thanh toán giả có nút «Оплатить (тест)» / «Отменить оплату». **Không bật trên server thật.**

## Bước 3 — Điền địa chỉ kho gửi hàng

Mở `server/config/variable.config.ts`, tìm `apishipSender` và điền địa chỉ kho, tên cửa hàng/ИП, người liên hệ, số điện thoại.
Cùng phần đó còn có các tuỳ chọn: miễn phí giao hàng từ bao nhiêu tiền, cộng thêm phí đóng gói, chỉ dùng một số hãng, cỡ thùng đóng hàng, tự động tạo vận đơn...

Ở trang sửa sản phẩm, nên nhập phần **Vận chuyển** (khối lượng cả bao bì, kích thước) để phí giao hàng tính đúng.

**Hãng vận chuyển:** hiện chỉ dùng 3 hãng — СДЭК (`cdek`), Яндекс Доставка (`yataxi`), Почта России (`rupost`) — trong `apishipProviderKeys` (`variable.config.ts`). Muốn thêm / bớt hãng thì sửa danh sách này (để trống `[]` là dùng tất cả hãng đã kết nối trong ApiShip). Khi bán thật, mỗi hãng phải được kết nối trong tài khoản ApiShip thì mới có giá.

**Bản đồ điểm nhận hàng:** khi khách chọn giao tới điểm nhận hàng và chọn hãng, trang đặt hàng hiện bản đồ các điểm (ПВЗ) của hãng đó: bấm vào điểm trên bản đồ hoặc chọn trong danh sách, nút «Рядом со мной» xếp các điểm gần khách lên trước. Bản đồ dùng OpenStreetMap, miễn phí, không cần khoá API (đổi bản đồ khác ở `checkoutMapTileUrl`). Điểm nào ApiShip không có toạ độ thì chỉ hiện trong danh sách.

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

## Bước 6 — Thanh toán qua Т-Банк (Интернет-эквайринг)

Cửa hàng dùng **Интернет-эквайринг** của Т-Банк, tiền khách trả được chuyển về расчётный счёт ИП ở Т-Банк.

**Kết nối:**

1. Vào Т-Бизнес (tài khoản ИП) → **Интернет-эквайринг** → gửi yêu cầu kết nối, điền thông tin cửa hàng: địa chỉ website, cách giao hàng, liên hệ. Т-Банк kiểm tra website trước khi cho nhận tiền thật (trang web cần có thông tin cửa hàng, điều kiện giao hàng / đổi trả, giá bằng rúp).
2. Sau khi kết nối, vào **Магазины → (cửa hàng) → Терминалы**. Có 2 terminal:
   - terminal **thử nghiệm**, mã có chữ `DEMO` ở cuối — để thử, không mất tiền thật;
   - terminal **thật** — để bán hàng.
   Mỗi terminal có **Terminal key** và **mật khẩu** (пароль).
3. Trong cài đặt terminal (*Настройки терминала*), mục thông báo (*Уведомления*): chọn gửi thông báo **по протоколу HTTP**, địa chỉ `https://ten-mien-cua-ban.ru/payment/tbank`. Các cách thanh toán (thẻ, СБП, T-Pay, SberPay...) cũng bật / tắt ở đây.

**Thử với terminal DEMO:**

1. `server/.env`:
   ```
   TBANK_TERMINAL_KEY=mã-terminal-DEMO
   TBANK_PASSWORD=mật-khẩu-terminal-DEMO
   PAYMENT_TEST_MODE=false
   ```
2. Khởi động lại server (`yarn start`), đặt hàng → bạn được chuyển sang trang thanh toán của Т-Банк.
3. Thanh toán bằng **thẻ thử của Т-Банк** (danh sách thẻ thử có trong trang terminal thử nghiệm và tài liệu Т-Банк, mục *Тестирование / Тест-кейсы*). Thẻ thật không dùng được trên terminal DEMO.
4. Trên laptop Т-Банк không gửi được thông báo về máy bạn, nhưng server tự hỏi Т-Банк trạng thái khi khách quay lại trang đơn hàng và mỗi phút một lần, nên vẫn chạy đúng.
5. Trong trang terminal DEMO có thể có các bài kiểm tra (*Тестировать*) — Т-Банк có thể yêu cầu làm xong trước khi mở terminal thật.

**Bán thật:**

1. `server/.env`: điền Terminal key và mật khẩu của terminal **thật** (không có `DEMO`).
2. `SITE_URL` trong `.env` phải là tên miền thật có https (Т-Банк chuyển khách về `SITE_URL/order/...` và gửi thông báo tới `SITE_URL/payment/tbank`).
3. **Hoá đơn điện tử 54-ФЗ (чек):** người bán online phải xuất чек cho khách. Kết nối онлайн-касса trong Интернет-эквайринг của Т-Банк, rồi trong `server/config/variable.config.ts`:
   - đổi `tbankSendReceipt = true`;
   - `tbankTaxation`: hệ thống thuế của ИП (ví dụ `usn_income` — УСН доходы);
   - `tbankFfdVersion`: phiên bản ФФД của онлайн-касса (`1.2` hoặc `1.05`);
   - **kiểm tra lại với kế toán** bảng `tbankTaxMap` (thuế VAT), `tbankDeliveryTax`, `tbankReceiptPaymentMethod`.
4. Hoàn tiền: ở trang admin, nút **«Huỷ đơn và hoàn tiền»** gửi yêu cầu hoàn tiền sang Т-Банк. Đơn đã giao / đang giao thì hoàn tiền trong Т-Бизнес (Интернет-эквайринг → Операции).

## Những file chính

| Phần | File |
| --- | --- |
| Cấu hình | `server/config/variable.config.ts`, `server/.env.example` |
| Đơn hàng | `server/models/order.model.ts`, `server/helpers/order.helper.ts` |
| ApiShip | `server/helpers/apiship.helper.ts` |
| Т-Банк (thanh toán) | `server/helpers/payment.helper.ts`, `server/controller/client/payment.controller.ts` |
| Trang khách hàng | `server/controller/client/checkout.controller.ts`, `order.controller.ts`, `server/views/client/pages/checkout.pug`, `order-detail.pug`, `account-orders.pug` |
| Trang admin | `server/controller/admin/order.controller.ts`, `server/views/admin/pages/order-list.pug`, `order-detail.pug` |
