# Hướng dẫn: Quản lý kết nối API bên thứ 3

Trang admin mới **Kết nối API** (`/admin/integration/list`) để quản lý các dịch vụ bên ngoài mà website dùng:

| Dịch vụ | Dùng để |
| --- | --- |
| **Т-Банк Интернет-эквайринг** | Khách thanh toán online (thẻ, СБП, T-Pay, SberPay...) |
| **ApiShip** | Kết nối các hãng vận chuyển (СДЭК, Яндекс Доставка, Почта России...): tính phí giao hàng, điểm nhận hàng, vận đơn |
| **Email (SMTP)** | Gửi email cho khách (xác nhận đơn, mã vận đơn, quên mật khẩu...) và báo đơn mới cho cửa hàng |

Ở trang này bạn có thể:

- Nhập / đổi **khoá API, mật khẩu** ngay trên web — có hiệu lực ngay, **không cần sửa file `.env`, không cần khởi động lại server**.
  Khoá được **mã hoá** trước khi lưu vào database, không bao giờ hiện lại trên trang (chỉ hiện "đã lưu").
- **Bật / tắt** từng dịch vụ.
- Chọn **chế độ thử / thật**: Т-Банк có chế độ *Thanh toán giả* (dùng khi chưa đăng ký Т-Банк), ApiShip có *Máy chủ thử nghiệm*.
- Bấm **Kiểm tra kết nối** để biết khoá đúng hay sai:
  - Т-Банк: tạo 1 thanh toán thử 1 ₽ rồi huỷ ngay (không ai bị trừ tiền).
  - ApiShip: đăng nhập + tính thử phí giao hàng, báo **hãng nào đang có giá** (hãng nào chưa kết nối trong tài khoản ApiShip).
  - Email: đăng nhập máy chủ email và gửi 1 email thử tới email tài khoản admin của bạn.
- Chọn **hãng vận chuyển** cho khách chọn, hãng nhận hàng mát / đông lạnh, điền **địa chỉ kho gửi hàng** (trước đây phải sửa trong code `variable.config.ts`).
- Xem **Nhật ký gọi API**: mỗi lần website gọi Т-Банк / ApiShip / gửi email đều được ghi lại (thành công hay lỗi, lời báo lỗi, thời gian chờ). Không lưu khoá API hay thông tin khách. Lưu 30 ngày.
- Mọi thay đổi được ghi vào **Nhật ký hoạt động** (ai sửa gì, lúc nào — không ghi giá trị khoá).

Website đang chạy bằng file `.env` vẫn chạy như cũ: ô nào chưa nhập ở trang admin thì vẫn lấy từ `.env`.
Ô nào đã nhập ở trang admin thì giá trị ở trang admin được ưu tiên.

---

## Bước 1 — Lấy code về máy

Mở Terminal (macOS / Linux) hoặc Git Bash / PowerShell (Windows) trong thư mục dự án `Marketplace-CRM`:

```bash
git fetch origin
git checkout claude/sleepy-rubin-fy0g7m
cd server
yarn install
```

Nhánh `claude/sleepy-rubin-fy0g7m` được tách ra từ `main`, **nhánh `main` không bị thay đổi**. Muốn quay lại bản cũ: `git checkout main`.

## Bước 2 — Thêm khoá mã hoá vào `server/.env`

1. Tạo 1 chuỗi ngẫu nhiên:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Mở file `server/.env`, thêm 1 dòng (dán chuỗi vừa tạo):
   ```
   INTEGRATION_SECRET_KEY=chuoi-vua-tao
   ```
3. **Cất chuỗi này ở chỗ an toàn** (ví dụ trình quản lý mật khẩu). Mất / đổi chuỗi này thì các khoá API đã lưu ở trang admin
   không đọc được nữa (trang admin sẽ báo, chỉ cần nhập lại khoá).
4. Nếu máy tính và server thật **dùng chung 1 database** (ví dụ cùng MongoDB Atlas), thì `INTEGRATION_SECRET_KEY` trên server thật phải **giống hệt** trên máy.

> Không thêm dòng này thì website dùng `JWT_SECRET` để mã hoá (vẫn chạy), trang admin sẽ nhắc nên thêm khoá riêng.

## Bước 3 — Chạy và mở trang Kết nối API

```bash
yarn start
```

1. Mở http://localhost:3000/admin, đăng nhập.
2. Menu bên trái → **Kết nối API**.
3. Tài khoản Super Admin thấy ngay. Tài khoản admin khác cần được cấp quyền trong **Nhóm quyền**:
   - *Xem kết nối API bên thứ 3* — xem trạng thái, nhật ký gọi API;
   - *Sửa kết nối API bên thứ 3* — nhập khoá, bật / tắt, kiểm tra kết nối (chỉ nên cấp cho người tin cậy).

## Bước 4 — Cấu hình để thử ngay (chưa cần Т-Банк, chưa cần tài khoản ApiShip)

**Т-Банк** → bấm **Cấu hình**:
1. Chọn chế độ **Thanh toán giả (chưa có Т-Банк)**.
2. Bấm **Lưu & kiểm tra kết nối**.

**ApiShip** → **Cấu hình**:
1. Chọn **Máy chủ thử nghiệm** (dùng tài khoản chung test / test của ApiShip, không cần đăng ký).
2. Chọn các hãng cho khách chọn (mặc định: СДЭК, Яндекс Доставка, Почта России).
3. Điền **Kho gửi hàng**: tên cửa hàng / ИП, người liên hệ, số điện thoại, thành phố, đường, số nhà...
4. Bấm **Lưu & kiểm tra kết nối** → thấy danh sách hãng có giá.

**Email** (không bắt buộc, chưa điền thì email được in ra cửa sổ terminal):
1. Làm theo hướng dẫn Yandex / Gmail ở khung bên phải trang cấu hình để lấy **mật khẩu ứng dụng**.
2. Nhập máy chủ, cổng, tài khoản, mật khẩu ứng dụng, email nhận thông báo đơn mới.
3. Bấm **Lưu & kiểm tra kết nối** → kiểm tra hộp thư của email admin (cả mục Спам).

**Thử đặt hàng:** mở http://localhost:3000, thêm sản phẩm vào giỏ → «Оформить заказ» → tính phí giao hàng → «Перейти к оплате» →
trang thanh toán giả bấm «Оплатить (тест)» → vào Admin → Đơn hàng → mở đơn → «Tạo vận đơn ApiShip».
Sau đó xem **Kết nối API → Nhật ký gọi API** để thấy các lần gọi ApiShip.

## Bước 5 — Đăng ký Т-Банк Интернет-эквайринг (việc bạn cần làm)

Phần thanh toán thật **chưa chạy được cho tới khi bạn đăng ký Т-Банк** — code đã sẵn sàng, chỉ cần nhập khoá. Các bước:

1. **Giấy tờ:** cần **ИП hoặc ООО** và **расчётный счёт** (mở ở Т-Банк thì tiền về nhanh nhất): https://www.tbank.ru/business/
2. **Website phải lên mạng trước** trên **tên miền thật có https** (ví dụ `https://sfoodie.ru`), và có đủ các trang Т-Банк kiểm tra:
   - thông tin người bán: tên ИП, ИНН, ОГРНИП, địa chỉ, điện thoại, email;
   - điều kiện giao hàng (cách giao, phí, thời gian);
   - điều kiện đổi trả, hoàn tiền;
   - chính sách bảo mật / оферта;
   - giá bằng rúp, có giỏ hàng và trang đặt hàng.
3. Vào https://www.tbank.ru/kassa/ (hoặc trong Т-Бизнес → **Интернет-эквайринг**) → gửi yêu cầu kết nối: địa chỉ website,
   loại hàng (продукты питания), doanh thu dự kiến, cách giao hàng.
4. Chờ Т-Банк kiểm tra website, ký hợp đồng điện tử trong Т-Бизнес.
5. **Thử với terminal DEMO:** Т-Бизнес → Интернет-эквайринг → **Магазины** → (cửa hàng) → **Терминалы** → chép **Terminal key**
   (có chữ `DEMO` ở cuối) và **mật khẩu**. Ở trang admin **Kết nối API → Т-Банк**: chọn chế độ **Т-Банк**, dán 2 giá trị,
   bấm **Lưu & kiểm tra kết nối**. Đặt hàng thử, thanh toán bằng **thẻ thử** của Т-Банк (trong tài liệu Т-Банк, mục Тестирование).
   Nếu terminal DEMO có bài kiểm tra (Тест-кейсы) thì làm xong để Т-Банк mở terminal thật.
6. **Bán thật:**
   - Trong cài đặt terminal → **Уведомления** → «по протоколу HTTP» → dán địa chỉ hiện ở khung *Địa chỉ nhận thông báo* trên
     trang cấu hình Т-Банк (dạng `https://ten-mien-cua-ban.ru/payment/tbank`; `SITE_URL` trong `.env` phải là tên miền thật).
   - Thay Terminal key + mật khẩu bằng của terminal **thật** → **Lưu & kiểm tra kết nối**.
   - **Hoá đơn điện tử 54-ФЗ:** kết nối онлайн-касса trong Интернет-эквайринг, rồi ở trang cấu hình Т-Банк bật
     *Gửi hoá đơn điện tử* và chọn hệ thống thuế (hỏi kế toán).

Trong lúc chờ Т-Банк, cứ dùng chế độ **Thanh toán giả** để thử. **Không** để chế độ này khi mở bán thật (trang admin có cảnh báo đỏ nếu website đang chạy trên tên miền https mà vẫn để thanh toán giả).

## Bước 6 — Tài khoản ApiShip thật (khi bắt đầu bán)

1. Đăng ký https://apiship.ru, chọn gói dịch vụ.
2. Trong tài khoản ApiShip, kết nối các hãng vận chuyển (СДЭК, Яндекс Доставка, Почта России...): hợp đồng riêng với hãng
   (nhập khoá API của hãng) hoặc hợp đồng của ApiShip nếu có.
3. Trang admin **Kết nối API → ApiShip**: chọn **Tài khoản thật**, nhập login + mật khẩu ApiShip → **Lưu & kiểm tra kết nối**.
   Kết quả liệt kê hãng nào có giá (✓) và hãng nào chưa kết nối (✗).

## Khi có lỗi

- **Kết nối API → Nhật ký gọi API**: lọc theo dịch vụ, chọn *Lỗi* để xem lời báo lỗi của Т-Банк / ApiShip / máy chủ email.
- Trang danh sách kết nối hiện số lần gọi và số lỗi trong 24 giờ, lỗi gần nhất của từng dịch vụ.
- Trang báo *"Không giải mã được khoá đã lưu"*: `INTEGRATION_SECRET_KEY` (hoặc `JWT_SECRET`) trong `.env` đã bị đổi → nhập lại khoá.

## Đưa lên nhánh main

Thử xong, thấy ổn thì tạo Pull Request từ nhánh `claude/sleepy-rubin-fy0g7m` vào `main` trên GitHub và merge.
Nhớ thêm `INTEGRATION_SECRET_KEY` vào file `.env` trên server thật.

## Những file chính

| Phần | File |
| --- | --- |
| Danh sách dịch vụ, các ô cấu hình, hướng dẫn hiện trên trang | `server/config/integration.config.ts` |
| Đọc / lưu cấu hình (admin → `.env` → mặc định) | `server/helpers/integration.helper.ts` |
| Mã hoá khoá API | `server/helpers/secret.helper.ts` |
| Nhật ký gọi API | `server/helpers/api-call-log.helper.ts`, `server/models/api-call-log.model.ts` |
| Trang admin | `server/controller/admin/integration.controller.ts`, `server/routes/admin/integration.route.ts`, `server/views/admin/pages/integration-*.pug` |
| Т-Банк / ApiShip / Email | `server/helpers/payment.helper.ts`, `apiship.helper.ts`, `mail.helper.ts` |

Muốn thêm dịch vụ mới sau này (ví dụ Telegram báo đơn, DaData gợi ý địa chỉ): thêm 1 phần tử vào `integrationList`
trong `server/config/integration.config.ts` — trang admin tự tạo form — rồi đọc giá trị trong code bằng
`getIntegrationSetting("key-dich-vu", "ten-o")`.
