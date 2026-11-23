# Hướng dẫn: Các trang pháp lý (luật Nga) — «Политика обработки персональных данных», оферта, giao hàng, đổi trả

Tính năng này nằm trên nhánh **`claude/youthful-clarke-go1nk2`** (tách ra từ `main` mới nhất, nhánh `main` chưa bị thay đổi).

- Chỉ sửa repo **Marketplace-CRM** (thư mục `server` và `frontend`). Repo **file-manager-microservice không phải sửa gì**, chỉ cần chạy như bình thường để hiện ảnh.
- **Không cài thêm thư viện mới**, **không thêm collection mới** trong database, không cần chạy lệnh cập nhật dữ liệu.
- Chạy được ở **cả 2 giao diện**: Next.js (`http://localhost:3001`) và PUG cũ (`http://localhost:3000`).

> ⚠️ Mình không phải luật sư. Các văn bản được viết theo luật Nga đang có hiệu lực (152-ФЗ, «О защите прав потребителей», Гражданский кодекс)
> và theo cách các shop online ở Nga thường làm, nhưng **trước khi bán thật nên nhờ 1 юрист người Nga đọc lại** (xem mục 4.6).

---

## 1. Website cần những trang gì và vì sao

| Trang | Đường dẫn | Bắt buộc vì |
|---|---|---|
| **Правовая информация** (thông tin người bán + danh sách văn bản) | `/legal` | Luật «О защите прав потребителей» (điều 9): người bán online phải công khai tên, ИНН, ОГРНИП, địa chỉ. Т-Банк kiểm tra khi duyệt website. |
| **Политика обработки персональных данных** | `/legal/privacy` | Luật 152-ФЗ (điều 18.1): website thu thập dữ liệu cá nhân (họ tên, điện thoại, email, địa chỉ) **phải công bố** chính sách này, không có thì bị phạt (điều 13.11 КоАП РФ). |
| **Согласие на обработку персональных данных** | `/legal/consent` | Từ **01.09.2025** sự đồng ý xử lý dữ liệu cá nhân phải là **văn bản riêng**, không được gộp vào оферта / chính sách / điều khoản khác. |
| **Публичная оферта** (hợp đồng mua bán) | `/legal/offer` | Bán hàng từ xa (Гражданский кодекс điều 437, 497). Т-Банк yêu cầu khi duyệt Интернет-эквайринг. |
| **Доставка и оплата** | `/legal/delivery` | Khách phải được biết cách giao hàng, phí, cách trả tiền **trước** khi đặt hàng. Т-Банк yêu cầu. |
| **Возврат и обмен** | `/legal/returns` | Khách phải được biết cách trả hàng, hoàn tiền (luật bảo vệ người tiêu dùng điều 26.1). Т-Банк yêu cầu. |

Văn bản luôn bằng **tiếng Nga** (ngôn ngữ có hiệu lực pháp lý). Khi khách chọn tiếng Việt, menu và tiêu đề đổi sang tiếng Việt,
trên văn bản có dòng ghi chú «Văn bản pháp lý được soạn bằng tiếng Nga — bản tiếng Nga là bản có hiệu lực pháp lý».

### Những chỗ khác trên website đã đổi

- **Chân trang** (làm lại cho gọn): cột «Контакты» lớn bên trái (điện thoại, email, địa chỉ, giờ làm việc, mạng xã hội) và 3 cột link
  «Магазин», «Для покупателей» (có «Доставка и оплата», «Возврат и обмен»), «Информация» (có «Правовая информация», «Публичная оферта»).
  Dòng cuối: bản quyền + tên ИП, ИНН, ОГРНИП bên trái, link «Политика обработки персональных данных» bên phải.
  Chọn ngôn ngữ chỉ còn ở đầu trang (máy tính) và menu ☰ (điện thoại). Giao diện PUG cũ giữ chân trang kiểu cũ (có thêm link văn bản).
- **Form đăng ký**: ô tick đổi thành «Даю <u>согласие на обработку персональных данных</u> в соответствии с <u>Политикой обработки персональных данных</u>» — chữ gạch chân là link, mở ở tab mới (khách không mất chữ đã nhập).
- **Trang đặt hàng**: trước đây có 1 ô tick gộp «согласен с условиями покупки и на обработку персональных данных».
  Theo luật mới phải **tách thành 2 ô riêng**, cả 2 đều bắt buộc:
  1. «Принимаю условия <u>публичной оферты</u>, <u>доставки</u> и <u>возврата</u>»
  2. «Даю <u>согласие на обработку персональных данных</u> в соответствии с <u>Политикой</u>»
- **Lưu bằng chứng khách đã đồng ý** (luật bắt cửa hàng phải chứng minh được): mỗi tài khoản mới và mỗi đơn hàng mới lưu thêm
  thời gian khách tick đồng ý (`agreedAt`) và phiên bản văn bản (`consentVersion` = ngày có hiệu lực, xem mục 2.2).
- **Thông báo cookie** ở góc dưới màn hình (lần đầu khách vào web): «Мы используем только необходимые cookie…» + nút «Понятно».
  Website hiện chỉ dùng cookie cần thiết (giỏ hàng, đăng nhập, ngôn ngữ) nên chỉ cần báo, không cần hỏi đồng ý.
- **Trang admin → Cài đặt cửa hàng** có thêm mục **«Văn bản pháp lý»**.

### Văn bản tự lấy thông tin từ trang admin

Tên người bán, ИНН, ОГРНИП, địa chỉ, email, điện thoại, đơn tối thiểu, miễn phí giao hàng từ bao nhiêu, thời gian giữ đơn chờ thanh toán,
danh sách hãng vận chuyển… đều lấy từ trang admin. **Sửa ở admin là văn bản đổi theo ngay**, không phải sửa code.
Ô nào còn trống thì văn bản hiện chữ đỏ, ví dụ <mark>[не указано: ИНН]</mark> — nhìn là biết còn thiếu gì.

---

## 2. Chạy thử trên laptop (từng bước)

### Bước 2.1: Lấy code nhánh thử nghiệm

Mở Terminal trong thư mục repo `Marketplace-CRM` trên máy:

```bash
git fetch origin claude/youthful-clarke-go1nk2
```

```bash
git checkout claude/youthful-clarke-go1nk2
```

(Nếu git báo có file đang sửa dở chưa commit: commit hoặc `git stash` trước rồi chạy lại lệnh trên.)

Repo `file-manager-microservice`: **giữ nguyên nhánh đang dùng**, không cần đổi.

### Bước 2.2: Chạy 3 phần như mọi khi

Không có thư viện mới, nên không cần `npm install` lại (chạy cũng không sao).

- Cửa sổ Terminal 1 — thư mục `file-manager-microservice`: `npm start`
- Cửa sổ Terminal 2 — thư mục `Marketplace-CRM/server`: `npm start`
- Cửa sổ Terminal 3 — thư mục `Marketplace-CRM/frontend`: `npm run dev`

### Bước 2.3: Điền thông tin trong trang admin

Mở **http://localhost:3001/admin** → **Cài đặt cửa hàng**.

**a) Mục «Thông tin cửa hàng»** (đã có từ trước) — điền đủ nhóm **«Thông tin người bán»** và **Email**:

| Ô | Điền gì | Ví dụ |
|---|---|---|
| Tên người bán | Đúng như trong giấy đăng ký ИП (выписка ЕГРИП) | `ИП Нгуен Ван Ан` |
| ИНН | 12 số của ИП | `771234567890` |
| ОГРНИП / ОГРН | 15 số (ИП) — website tự ghi chữ «ОГРНИП» | `321774600123456` |
| Địa chỉ đăng ký | Địa chỉ ghi trong ЕГРИП | `125009, г. Москва, ул. Тверская, д. 1` |
| Email | Email khách liên hệ (xuất hiện trong văn bản) | `info@sfoodie.ru` |
| Số điện thoại | Không bắt buộc, nên điền | `+7 (999) 123-45-67` |

> Về địa chỉ đăng ký: ИП thường đăng ký theo địa chỉ nhà riêng. Luật yêu cầu công khai địa chỉ người bán, nhiều ИП chỉ ghi
> tới thành phố / đường. Ghi chi tiết tới đâu thì hỏi юрист khi nhờ đọc lại văn bản.

**b) Mục mới «Văn bản pháp lý»**:

| Ô | Điền gì |
|---|---|
| **Ngày có hiệu lực của văn bản** | Ngày bắt đầu áp dụng, dạng `01.12.2026`. Hiện ở đầu mọi văn bản («Редакция от 01.12.2026») và được **lưu kèm mỗi lần khách tick đồng ý**. Sau này sửa nội dung văn bản thì đổi ngày này. |
| Người chịu trách nhiệm xử lý dữ liệu cá nhân | ИП thì là chính bạn: `Нгуен Ван Ан`. Để trống = dùng tên người bán. |
| Email nhận yêu cầu về dữ liệu cá nhân | Để trống = email cửa hàng. Có thể tạo riêng, ví dụ `privacy@...`. |
| Số đăng ký trong Реестр операторов ПДн | Để trống, **điền sau khi làm xong mục 4.2**. |
| Công ty hosting | Tên công ty cho thuê server / database tại Nga (xem mục 4.1), ví dụ `ООО «Таймвэб»`. Để trống cũng được. |

Bấm **Lưu**.

**c) Kiểm tra**: mở **http://localhost:3001/legal** và từng văn bản — **không còn chữ đỏ «[не указано: …]»** là đủ thông tin.

### Bước 2.4: Những chỗ nên bấm thử

- [ ] `/legal`: bảng thông tin người bán đúng, có đủ 5 văn bản
- [ ] Từng văn bản `/legal/privacy`, `/legal/consent`, `/legal/offer`, `/legal/delivery`, `/legal/returns`: đọc lướt, kiểm tra số tiền (đơn tối thiểu, miễn phí giao hàng), số phút giữ đơn, tên hãng vận chuyển
- [ ] Menu «Документы» bên trái (máy tính) / ở cuối trang (điện thoại), mục đang xem được tô đen
- [ ] Nút **«Распечатать»**: chỉ in nội dung văn bản (có thể chọn «Lưu thành PDF»)
- [ ] Đổi sang **VI**: tiêu đề tiếng Việt, có dòng ghi chú, nội dung vẫn tiếng Nga; thử giao diện **tối**
- [ ] Chân trang: cột «Контакты» + 3 cột link, dòng cuối có thông tin ИП và link chính sách; thử thu nhỏ cửa sổ (điện thoại: 2 cột link)
- [ ] **Đăng ký** (`/account/register`): bấm link trong ô tick → mở tab mới; không tick mà bấm «Зарегистрироваться» → báo «Нужно согласие на обработку персональных данных»
- [ ] **Đặt hàng** (`/checkout`): có 2 ô tick. Không tick ô 1 → báo «Нужно принять условия публичной оферты»; tick ô 1 mà thiếu ô 2 → báo «Нужно согласие на обработку персональных данных»; tick đủ 2 ô → đặt hàng được như cũ
- [ ] **Thông báo cookie**: hiện lần đầu, bấm «Понятно» thì không hiện lại. Muốn xem lại: F12 → Application → Local Storage → `http://localhost:3001` → xoá dòng `sf-cookie-notice`, tải lại trang
- [ ] Giao diện PUG cũ `http://localhost:3000/legal/privacy`, form đăng ký, đặt hàng cũng có đủ như trên
- [ ] Gõ sai đường dẫn, ví dụ `/legal/abc` → trang 404

Gặp lỗi: chụp màn hình, chép dòng báo lỗi đỏ ở cửa sổ Terminal gửi lại để sửa.

### Bước 2.5: Khi đã ổn — đưa lên nhánh main

Nhờ mình tạo Pull Request từ nhánh `claude/youthful-clarke-go1nk2` vào `main`, hoặc tự tạo trên GitHub rồi Merge.
Lên server thật nhớ **điền lại mục 2.3 ở trang admin của server thật** (cài đặt lưu trong database, không đi theo code).

---

## 3. Văn bản viết những gì (tóm tắt để bạn hiểu)

**Политика обработки персональных данных** — cửa hàng thu thập dữ liệu gì, để làm gì, cơ sở pháp lý, lưu bao lâu, chuyển cho ai, khách có quyền gì:

- 7 mục đích: tài khoản; đặt hàng – giao hàng – thanh toán; hoá đơn điện tử (чек); xử lý khiếu nại; đăng đánh giá; email dịch vụ (xác nhận đơn, quên mật khẩu, nhắc đánh giá); an toàn website.
- Chuyển dữ liệu cho: **АО «ТБанк»** (thanh toán, чек), **ApiShip + hãng vận chuyển** khách chọn, công ty hosting, dịch vụ email, cơ quan nhà nước khi có yêu cầu hợp pháp.
- Dữ liệu **lưu trên server đặt tại Nga**, **không chuyển ra nước ngoài** (⚠️ phải đúng sự thật — xem mục 4.1).
- Cookie: liệt kê đúng các cookie website đang dùng (`accountToken`, `cartToken`, `wishlistToken`, `compareList`, `lang`), **không dùng Яндекс Метрика / Google Analytics**.
- Quyền của khách: xem / sửa / xoá dữ liệu, rút lại đồng ý (gửi email). Cửa hàng trả lời trong **10 ngày làm việc**, xoá dữ liệu trong **30 ngày** sau khi khách rút lại đồng ý.
- Lộ dữ liệu: báo Роскомнадзор trong 24 giờ, kết quả điều tra trong 72 giờ.

**Согласие** — khách đồng ý cho cửa hàng (tên, ИНН, địa chỉ) xử lý những dữ liệu nào, mục đích gì, chuyển cho ai, đến bao giờ, rút lại thế nào.

**Публичная оферта** — hợp đồng mua bán: đặt hàng là ký hợp đồng; giá cố định lúc đặt; trả trước 100% qua Т-Банк; quá N phút chưa trả thì huỷ đơn; giao hàng; trả hàng; tài khoản và quy tắc đánh giá (không xoá đánh giá vì chê); giải quyết tranh chấp; thông tin người bán.

**Доставка и оплата / Возврат и обмен** — viết dễ đọc cho khách. Phần trả hàng **theo đúng luật**:

- Từ chối đơn **trước khi nhận**: bất cứ lúc nào.
- Hàng **đúng chất lượng**: trả trong **7 ngày** sau khi nhận nếu chưa mở bao bì, còn hạn; hoàn tiền trong 10 ngày (trừ phí gửi trả).
- Hàng **lỗi** (hết hạn, hỏng bao bì, sai hàng, thiếu hàng): đổi / giảm giá / hoàn tiền; phí gửi trả do cửa hàng chịu.

> Vì sao không ghi «thực phẩm không được đổi trả»? Luật cho phép khách mua online trả hàng đúng chất lượng trong 7 ngày (điều 26.1),
> điều khoản làm giảm quyền của khách so với luật **bị coi là vô hiệu và bị phạt** (điều 14.8 КоАП РФ). Trên thực tế hàng thực phẩm
> đã mở bao bì / hết hạn thì không còn «giữ nguyên tình trạng» nên không trả được — văn bản đã ghi rõ điều kiện này.

---

## 4. Việc PHẢI làm ngoài website (quan trọng)

Website mới chỉ là phần «công khai văn bản». Luật 152-ФЗ còn yêu cầu các việc dưới đây — **nhất là 4.1 và 4.2**.

### 4.1 ⚠️ Database và server phải đặt tại Nga

Luật 152-ФЗ điều 18 khoản 5: dữ liệu cá nhân của công dân Nga phải được **ghi và lưu trong database đặt tại Nga**. Vi phạm bị phạt rất nặng
(hàng triệu rúp) và Роскомнадзор có thể chặn website.

- **MongoDB Atlas không có máy chủ ở Nga** ⇒ nếu website thật đang dùng Atlas thì **phải chuyển** trước khi bán.
- Server Express, Next.js và **server quản lý file** (repo `file-manager-microservice` — lưu ảnh khách gửi trong đánh giá) cũng nên ở Nga.
- **Email**: nếu dùng Gmail để gửi mail cho khách thì dữ liệu (email, tên, đơn hàng) đi qua máy chủ Google ở nước ngoài.
  Nên đổi sang **Яндекс 360** hoặc **Mail.ru для бизнеса** (máy chủ ở Nga), rồi sửa ở trang admin → Kết nối API → Email (SMTP): máy chủ `smtp.yandex.ru`, cổng `465`.

Cách chuyển database (ví dụ thuê VPS ở Nga — Timeweb Cloud, Selectel, REG.RU, Yandex Cloud — rồi cài MongoDB lên đó):

1. Cài **MongoDB Database Tools** trên laptop (có lệnh `mongodump`, `mongorestore`): https://www.mongodb.com/try/download/database-tools
2. Sao lưu database đang ở Atlas (thay link bằng link `MONGO_URL` hiện tại của bạn):

```bash
mongodump --uri="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/marketplace-crm" --out=./backup
```

3. Đưa dữ liệu lên database mới ở Nga:

```bash
mongorestore --uri="mongodb://USER:PASSWORD@DIA-CHI-SERVER-NGA:27017" ./backup
```

4. Sửa `MONGO_URL` trong file `server/.env` của server thật sang link database mới, khởi động lại server, kiểm tra website.
5. Xoá cluster trên Atlas sau khi chắc chắn mọi thứ chạy tốt.
6. Điền tên công ty hosting vào ô «Công ty hosting» (mục 2.3).

> Database mới phải đặt mật khẩu và **không mở cổng 27017 ra Internet** (chỉ cho server Express kết nối). Nếu cần, mình có thể viết hướng dẫn riêng.

### 4.2 Nộp «Уведомление об обработке персональных данных» cho Роскомнадзор

Luật 152-ФЗ điều 22: **trước khi** xử lý dữ liệu cá nhân phải báo cho Роскомнадзор. Không nộp: phạt **đến 300 000 ₽** (mức phạt mới từ 30.05.2025).

1. Mở **https://pd.rkn.gov.ru** → «Электронные формы заявлений» → «Уведомление об обработке (о намерении осуществлять обработку) персональных данных».
2. Điền form. Phần lớn nội dung **chép từ trang `/legal/privacy`** của bạn:
   - Thông tin người bán: tên ИП, ИНН, ОГРНИП, địa chỉ, email.
   - **Mục đích xử lý** (mục 4.2–4.8 của chính sách): với mỗi mục đích chọn loại dữ liệu (ФИО, телефон, email, адрес), loại người (клиенты, покупатели, пользователи сайта), cơ sở pháp lý, cách xử lý (смешанная, с передачей по внутренней сети / сети Интернет).
   - Biện pháp bảo vệ (mục 9 của chính sách).
   - **Địa chỉ đặt database**: địa chỉ trung tâm dữ liệu của hosting ở Nga (hosting cung cấp).
   - Chuyển dữ liệu ra nước ngoài: **нет**.
   - Người chịu trách nhiệm: chính bạn (ИП).
3. Gửi:
   - **Online**, ký bằng chữ ký điện tử của ИП (УКЭП — ИП được ФНС cấp miễn phí), hoặc
   - **In ra**, ký tên, gửi bưu điện tới Роскомнадзор vùng của bạn (địa chỉ có trên trang rkn.gov.ru).
4. Khoảng 30 ngày sau bạn có tên trong **Реестр операторов**. Tìm số đăng ký ở pd.rkn.gov.ru → «Реестр операторов» (tìm theo ИНН),
   rồi điền vào ô «Số đăng ký trong Реестр операторов ПДн» ở trang admin → số này hiện trong chính sách.

Sau này thay đổi (đổi hosting, thêm Яндекс Метрика, thêm mục đích mới…) thì nộp «Информационное письмо о внесении изменений» cũng ở trang đó.

### 4.3 Giấy tờ nội bộ (giữ ở nhà, không đăng lên web)

Luật yêu cầu cửa hàng có (Роскомнадзор có thể hỏi khi kiểm tra):

- **Приказ о назначении ответственного за организацию обработки ПДн** — ИП tự ra quyết định giao cho chính mình.
- **Положение об обработке и защите персональных данных** — quy định nội bộ (ai được xem dữ liệu, lưu bao lâu, xoá thế nào).
- **Акт оценки вреда** субъектам ПДн (theo Приказ Роскомнадзора № 178 от 27.10.2022).
- **Danh sách người có quyền vào trang admin** + giấy cam kết không tiết lộ (обязательство о неразглашении) của nhân viên.
- **Журнал учёта обращений** — sổ ghi các yêu cầu khách gửi về dữ liệu cá nhân.
- **Акт об уничтожении ПДн** mỗi lần xoá dữ liệu khách (theo Приказ Роскомнадзора № 179 от 28.10.2022).

Mẫu các giấy tờ này юрист thường làm kèm khi đọc lại văn bản (mục 4.6).

### 4.4 Т-Банк Интернет-эквайринг

Khi đăng ký / khi Т-Банк duyệt website, gửi họ link: **`https://ten-mien-cua-ban.ru/legal`** — ở đó có đủ thông tin người bán,
оферта, giao hàng – thanh toán, đổi trả, chính sách dữ liệu cá nhân. Nếu Т-Банк yêu cầu thêm gì (ví dụ logo «Мир» / «СБП» ở chân trang) thì báo lại để mình thêm.

### 4.5 HTTPS trên server thật

Chính sách ghi «передаёт данные … по защищённому протоколу HTTPS». Website thật **phải có chứng chỉ SSL** (ổ khoá trên trình duyệt) —
Let's Encrypt miễn phí, phần lớn hosting bật được bằng 1 nút.

### 4.6 Nhờ юрист đọc lại

- Gửi юрист 5 trang `/legal/...` (bản in PDF bằng nút «Распечатать»). Chi phí thường vài nghìn rúp.
- Cần hỏi kỹ: địa chỉ ghi tới đâu; quy định trả hàng thực phẩm; các mục đích xử lý dữ liệu.
- **Правила продажи товаров** của Chính phủ Nga (Постановление № 2463) theo mình biết có hiệu lực **đến 01.01.2027** — оферта chỉ ghi chung
  «Правила продажи…, утверждённые Правительством РФ» nên không phải sửa, nhưng nhờ юрист kiểm tra quy định mới thay thế.
- Muốn sửa câu chữ: nội dung nằm ở thư mục `server/helpers/legal-documents/` (mỗi văn bản 1 file `.ts`, chữ tiếng Nga trong dấu `` ` ``).
  Gửi mình phần юрист sửa, mình cập nhật giúp. **Sửa xong nhớ đổi «Ngày có hiệu lực» ở trang admin.**

### 4.7 Khi thêm tính năng sau này

| Thêm gì | Phải làm thêm |
|---|---|
| **Яндекс Метрика**, Google Analytics, pixel quảng cáo VK / Яндекс | Thông báo cookie phải **hỏi đồng ý trước** khi chạy mã đó (không chỉ «Понятно»); sửa mục 7 của chính sách; báo thay đổi cho Роскомнадзор (mục 4.2). |
| **Gửi email quảng cáo / khuyến mãi** | Ô tick đồng ý **riêng** «Согласен получать рекламные рассылки» (luật quảng cáo 38-ФЗ điều 18), không được tick sẵn. |
| Đổi hosting, dịch vụ email, thêm đối tác nhận dữ liệu | Sửa mục 6 của chính sách + văn bản đồng ý, đổi ngày hiệu lực, báo Роскомнадзор. |

### 4.8 Có thể cân nhắc (không bắt buộc)

- **Tên trong đánh giá**: hiện hiện «Иван И.» (tên + chữ cái đầu của họ). Đăng công khai dữ liệu cá nhân theo luật cần đồng ý riêng (điều 10.1);
  «Иван И.» khó xác định là ai nên rủi ro thấp. Muốn chắc chắn hơn: chỉ hiện tên («Иван») — báo mình, sửa 1 dòng.
- **Bản đồ điểm nhận hàng** ở trang đặt hàng tải hình bản đồ từ OpenStreetMap (máy chủ nước ngoài) — trình duyệt của khách tự tải, cửa hàng không gửi dữ liệu khách đi,
  chính sách đã ghi rõ. Muốn tránh hoàn toàn có thể đổi sang bản đồ của Яндекс / 2ГИС.

---

## 5. Những file đã đổi (cho người sửa code)

| File | Thay đổi |
|---|---|
| `server/helpers/legal.helper.ts` (mới) | Danh sách văn bản, lấy thông tin người bán từ Cài đặt cửa hàng, tạo HTML văn bản, `getLegalVersion()` |
| `server/helpers/legal-documents/*.ts` (mới) | **Nội dung 5 văn bản** (tiếng Nga) + trang `/legal` |
| `server/controller/client/legal.controller.ts`, `server/routes/client/legal.route.ts` (mới) | Trang `/legal`, `/legal/:slug` (cả JSON cho Next.js và PUG) |
| `server/views/client/pages/legal.pug` (mới) | Trang văn bản cho giao diện PUG cũ |
| `server/config/shop-setting.config.ts`, `variable.config.ts`, `helpers/shop-setting.helper.ts` | Mục mới «Văn bản pháp lý» ở Cài đặt cửa hàng |
| `server/validates/client/checkout.validate.ts` | Đặt hàng: 2 ô bắt buộc `agreeOffer` (оферта) và `agree` (dữ liệu cá nhân) |
| `server/models/order.model.ts`, `account-client.model.ts`, `controller/client/checkout.controller.ts`, `account.controller.ts` | Lưu `agreedAt`, `consentVersion` khi đặt hàng / đăng ký |
| `server/config/json-view.config.ts` | Không gửi `agreedAt`, `consentVersion` ra trang khách |
| `server/locales/ru.ts`, `vi.ts` | Từ ngữ mới (tiêu đề văn bản, ô tick có link, thông báo cookie) |
| `server/views/client/...` (footer, đăng ký, đặt hàng) | Giao diện PUG: link văn bản, 2 ô tick |
| `frontend/src/app/(client)/legal/page.tsx`, `legal/[slug]/page.tsx` (mới) | Trang văn bản ở Next.js |
| `frontend/src/components/client/views/LegalView.tsx`, `LinkedText.tsx`, `PrintButton.tsx`, `CookieNotice.tsx` (mới) | Giao diện trang văn bản, chữ có link, nút in, thông báo cookie |
| `frontend/src/components/client/Footer.tsx` | Chân trang mới: cột Контакты + 3 cột link, dòng cuối thông tin người bán + chính sách |
| `frontend/src/components/client/Shell.tsx`, `views/CheckoutView.tsx`, `app/(client)/account/register/page.tsx` | Thông báo cookie, ô tick có link |
| `frontend/public/client/assets/css/sfoodie.css`, `server/public/client/assets/css/sfoodie.css` | Giao diện trang văn bản (sáng / tối, điện thoại, khi in) |
