import {
  apishipAutoCreateShipment,
  apishipBoxList,
  apishipColdProviderKeys,
  apishipDefaultItemSize,
  apishipDefaultItemWeight,
  apishipPackagingWeight,
  apishipPickupType,
  apishipPointInIds,
  apishipProviderKeys,
  apishipProviderList,
  apishipSender,
  apishipStatusSyncMinutes,
  tbankDeliveryTax,
  tbankFfdVersion,
  tbankReceiptPaymentMethod,
  tbankSendReceipt,
  tbankTaxation,
  tbankVatMode
} from "./variable.config"
import { shopSettingList } from "./shop-setting.config"

// ===== Kết nối API bên thứ 3 (trang admin: Kết nối API) =====
// Mỗi phần tử là 1 dịch vụ bên ngoài mà website gọi tới (thanh toán, vận chuyển, email...)
// Trang admin tự tạo form theo danh sách ô (fields) bên dưới, nên muốn thêm ô cấu hình chỉ cần thêm 1 dòng vào fields
// (và đọc giá trị trong code bằng getIntegrationSetting(key, field) ở helpers/integration.helper.ts)
//
// Giá trị của 1 ô được lấy theo thứ tự ưu tiên:
// 1. Giá trị nhập ở trang admin (lưu trong database, khoá bí mật được mã hoá)
// 2. Biến trong file .env (env), để website đang chạy bằng .env vẫn chạy như cũ
// 3. Giá trị mặc định (default), thường lấy từ config/variable.config.ts
//
// Lưu ý: không đổi key của dịch vụ / ô đã dùng, vì giá trị đã lưu trong database theo key

export type IntegrationFieldType =
  | "text" // ô chữ
  | "secret" // khoá API, mật khẩu: mã hoá khi lưu, không bao giờ gửi giá trị ra trình duyệt
  | "number"
  | "email"
  | "url"
  | "select" // chọn 1 trong options
  | "switch" // bật / tắt
  | "checkbox-list" // chọn nhiều trong options
  | "textarea" // nhiều dòng, đổi sang dữ liệu bằng parse / format (ví dụ danh sách cỡ thùng)

export type IntegrationField = {
  key: string,
  label: string,
  type: IntegrationFieldType,
  group: string, // tên nhóm ô trong form
  env?: string, // biến trong file .env dùng khi chưa nhập ở trang admin
  default?: any, // giá trị mặc định khi chưa nhập ở admin và .env cũng không có
  options?: { id: string, name: string }[],
  placeholder?: string,
  help?: string, // dòng giải thích dưới ô (được dùng HTML)
  modes?: string[], // chỉ dùng ở các chế độ này (ẩn ô ở chế độ khác), không có là dùng ở mọi chế độ
  required?: boolean, // bắt buộc có giá trị thì dịch vụ mới coi là "đã cấu hình" (ở các chế độ của ô)
  // Ô số: giới hạn (mặc định 0 đến 1 000 000 000), integer: chỉ nhận số nguyên, unit: đơn vị hiện sau ô (₽, g, cm, phút...)
  min?: number,
  max?: number,
  integer?: boolean,
  unit?: string,
  // Ô nhiều dòng (textarea): parse đổi chữ nhập vào => dữ liệu lưu (sai thì throw Error có lời báo, trống trả về ""),
  // format đổi dữ liệu => chữ hiện trong ô
  parse?: (text: string) => any,
  format?: (value: any) => string,
  rows?: number
}

export type IntegrationMode = {
  id: string,
  name: string,
  description: string,
  isTest: boolean // chế độ thử: không mất tiền thật / không tạo vận đơn thật
}

export type IntegrationDefinition = {
  key: string,
  name: string,
  category: string, // id trong integrationCategoryList
  icon: string, // class icon Font Awesome
  description: string,
  website: string,
  docsUrl: string,
  modes: IntegrationMode[], // để trống [] nếu dịch vụ không có chế độ thử / thật
  fields: IntegrationField[],
  // Hướng dẫn từng bước hiện ở trang cấu hình (được dùng HTML)
  guide: { title: string, steps: string[] }[]
}

export const integrationCategoryList = [
  { id: "payment", name: "Thanh toán online", icon: "fa-solid fa-credit-card" },
  { id: "shipping", name: "Vận chuyển", icon: "fa-solid fa-truck-fast" },
  { id: "email", name: "Email", icon: "fa-solid fa-envelope" }
]

export const integrationList: IntegrationDefinition[] = [
  // ===== Т-Банк Интернет-эквайринг =====
  {
    key: "tbank",
    name: "Т-Банк Интернет-эквайринг",
    category: "payment",
    icon: "fa-solid fa-building-columns",
    description: "Khách thanh toán online bằng thẻ ngân hàng, СБП, T-Pay, SberPay... Tiền về расчётный счёт của cửa hàng.",
    website: "https://www.tbank.ru/kassa/",
    docsUrl: "https://developer.tbank.ru/eacq/api",
    modes: [
      {
        id: "fake",
        name: "Thanh toán giả (chưa có Т-Банк)",
        description: "Trang thanh toán giả có nút «Оплатить (тест)» / «Отменить оплату», không mất tiền. Dùng để thử quy trình đặt hàng khi CHƯA đăng ký Т-Банк. Không dùng khi bán thật.",
        isTest: true
      },
      {
        id: "tbank",
        name: "Т-Банк",
        description: "Chuyển khách sang trang thanh toán của Т-Банк. Nhập terminal DEMO để thử (thẻ thử, không mất tiền), terminal thật để bán hàng.",
        isTest: false
      }
    ],
    fields: [
      {
        key: "terminalKey",
        label: "Terminal key (mã terminal)",
        type: "text",
        group: "Terminal",
        env: "TBANK_TERMINAL_KEY",
        placeholder: "1700000000000DEMO",
        help: "Т-Бизнес → Интернет-эквайринг → Магазины → (cửa hàng) → Терминалы. Mã có chữ <b>DEMO</b> ở cuối là terminal thử nghiệm.",
        modes: ["tbank"],
        required: true
      },
      {
        key: "password",
        label: "Mật khẩu terminal (пароль)",
        type: "secret",
        group: "Terminal",
        env: "TBANK_PASSWORD",
        help: "Nằm cùng chỗ với Terminal key. Dùng để ký (Token) mọi yêu cầu gửi Т-Банк và kiểm tra thông báo Т-Банк gửi về.",
        modes: ["tbank"],
        required: true
      },
      {
        key: "apiUrl",
        label: "Địa chỉ API",
        type: "url",
        group: "Nâng cao",
        env: "TBANK_API_URL",
        default: "https://securepay.tinkoff.ru/v2",
        help: "Thường để trống. Chỉ đổi khi Т-Банк yêu cầu.",
        modes: ["tbank"]
      },
      {
        key: "sendReceipt",
        label: "Gửi hoá đơn điện tử (чек 54-ФЗ) kèm thanh toán",
        type: "switch",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankSendReceipt,
        help: "Chỉ bật khi đã kết nối онлайн-касса trong Интернет-эквайринг của Т-Банк, nếu không Т-Банк báo lỗi và khách không thanh toán được.",
        modes: ["tbank"]
      },
      {
        key: "taxation",
        label: "Hệ thống thuế (Taxation)",
        type: "select",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankTaxation,
        options: [
          { id: "usn_income", name: "УСН «Доходы» · АУСН «Доходы» 8%" },
          { id: "usn_income_outcome", name: "УСН «Доходы минус расходы» · АУСН «Доходы минус расходы» 20%" },
          { id: "osn", name: "ОСН (общая)" },
          { id: "esn", name: "ЕСХН" },
          { id: "patent", name: "Патент" }
        ],
        help: "АУСН không có mã riêng trên чек: chọn УСН cùng đối tượng thuế (АУСН «Доходы» 8% → <b>УСН «Доходы»</b>). Hỏi kế toán nếu chưa chắc.",
        modes: ["tbank"]
      },
      {
        key: "vatMode",
        label: "Thuế VAT (НДС) trên чек",
        type: "select",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankVatMode,
        options: [
          { id: "none", name: "Không chịu VAT — mọi dòng «без НДС» (АУСН, УСН không nộp VAT...)" },
          { id: "product", name: "Theo ô Thuế VAT của từng sản phẩm" }
        ],
        help: "АУСН không nộp VAT: chọn <b>Không chịu VAT</b>, khi đó ô Thuế VAT ở trang sản phẩm và ô VAT phí giao hàng bên dưới không được dùng.",
        modes: ["tbank"]
      },
      {
        key: "deliveryTax",
        label: "Thuế VAT của dòng «Доставка»",
        type: "select",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankDeliveryTax,
        options: [
          { id: "none", name: "без НДС" },
          { id: "vat0", name: "0%" },
          { id: "vat5", name: "5%" },
          { id: "vat7", name: "7%" },
          { id: "vat10", name: "10%" },
          { id: "vat22", name: "22%" }
        ],
        help: "Chỉ dùng khi chọn «Theo ô Thuế VAT của từng sản phẩm».",
        modes: ["tbank"]
      },
      {
        key: "receiptPaymentMethod",
        label: "Hình thức thanh toán trên чек (признак способа расчёта)",
        type: "select",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankReceiptPaymentMethod,
        options: [
          { id: "full_prepayment", name: "Предоплата 100% (khách trả trước, giao hàng sau)" },
          { id: "full_payment", name: "Полный расчёт (giao hàng ngay khi trả tiền)" }
        ],
        help: "Hỏi kế toán. Bán online trả trước rồi mới giao thường dùng «Предоплата 100%».",
        modes: ["tbank"]
      },
      {
        key: "ffdVersion",
        label: "Phiên bản ФФД của онлайн-касса",
        type: "select",
        group: "Hoá đơn điện tử (54-ФЗ)",
        default: tbankFfdVersion,
        options: [
          { id: "1.2", name: "ФФД 1.2" },
          { id: "1.05", name: "ФФД 1.05" }
        ],
        modes: ["tbank"]
      }
    ],
    guide: [
      {
        title: "Bây giờ (chưa đăng ký Т-Банк)",
        steps: [
          "Chọn chế độ <b>Thanh toán giả</b> rồi bấm Lưu: khách đặt hàng được, trang thanh toán giả có nút «Оплатить (тест)». Dùng để thử toàn bộ quy trình đặt hàng → tạo vận đơn trên máy.",
          "<b>Không</b> để chế độ này khi mở bán thật trên tên miền thật."
        ]
      },
      {
        title: "Đăng ký Интернет-эквайринг",
        steps: [
          "Cần có <b>ИП hoặc ООО</b> và расчётный счёт (mở ở Т-Банк thì tiền về nhanh nhất). Mở tài khoản doanh nghiệp tại <a href=\"https://www.tbank.ru/business/\" target=\"_blank\" rel=\"noopener\">tbank.ru/business</a> nếu chưa có.",
          "Website phải chạy trên <b>tên miền thật có https</b> và có đủ: tên người bán (ИП ... / ИНН / ОГРНИП), địa chỉ, điện thoại, email; điều kiện giao hàng; điều kiện đổi trả, hoàn tiền; chính sách bảo mật / оферта; giá bằng rúp. Т-Банк kiểm tra website trước khi duyệt.",
          "Vào <a href=\"https://www.tbank.ru/kassa/\" target=\"_blank\" rel=\"noopener\">tbank.ru/kassa</a> (hoặc trong Т-Бизнес → Интернет-эквайринг) → gửi yêu cầu kết nối: địa chỉ website, loại hàng (продукты питания), doanh thu dự kiến, cách giao hàng.",
          "Chờ Т-Банк kiểm tra website và ký hợp đồng (ký điện tử trong Т-Бизнес)."
        ]
      },
      {
        title: "Thử với terminal DEMO",
        steps: [
          "Т-Бизнес → Интернет-эквайринг → <b>Магазины</b> → (cửa hàng) → <b>Терминалы</b>: chép <b>Terminal key</b> (có chữ DEMO) và <b>mật khẩu</b> của terminal thử nghiệm.",
          "Ở trang này: chọn chế độ <b>Т-Банк</b>, dán Terminal key + mật khẩu, bấm <b>Lưu &amp; kiểm tra kết nối</b>. Kết quả \"thành công\" là khoá đúng.",
          "Đặt hàng thử trên website, thanh toán bằng <b>thẻ thử</b> của Т-Банк (danh sách thẻ thử có trong tài liệu Т-Банк, mục Тестирование). Thẻ thật không dùng được với terminal DEMO.",
          "Trong cài đặt terminal DEMO có thể có các bài kiểm tra (Тест-кейсы) — làm xong thì Т-Банк mới mở terminal thật."
        ]
      },
      {
        title: "Bán thật",
        steps: [
          "Trong cài đặt terminal (Настройки терминала) → Уведомления: chọn gửi <b>по протоколу HTTP</b> tới địa chỉ thông báo ở khung bên dưới (cần SITE_URL là https).",
          "Thay Terminal key + mật khẩu bằng của terminal <b>thật</b> (không có chữ DEMO), bấm Lưu &amp; kiểm tra kết nối.",
          "Hoá đơn điện tử 54-ФЗ: kết nối облачная касса trong Интернет-эквайринг, sau đó bật <b>Gửi hoá đơn điện tử</b>. Cửa hàng dùng <b>АУСН «Доходы» 8%</b>: hệ thống thuế chọn <b>УСН «Доходы» · АУСН «Доходы» 8%</b>, thuế VAT chọn <b>Không chịu VAT</b> (đã chọn sẵn). Hỏi kế toán về hình thức thanh toán trên чек."
        ]
      }
    ]
  },

  // ===== ApiShip =====
  {
    key: "apiship",
    name: "ApiShip (СДЭК, Яндекс Доставка, Почта России...)",
    category: "shipping",
    icon: "fa-solid fa-truck-fast",
    description: "Một tài khoản kết nối nhiều hãng vận chuyển: tính phí giao hàng, điểm nhận hàng (ПВЗ), tạo vận đơn, in phiếu gửi hàng, cập nhật trạng thái.",
    website: "https://apiship.ru",
    docsUrl: "https://docs.apiship.ru",
    modes: [
      {
        id: "test",
        name: "Máy chủ thử nghiệm",
        description: "Máy chủ thử của ApiShip (tài khoản chung test / test, không cần đăng ký). Giá giao hàng là giá thử, vận đơn không được gửi cho hãng.",
        isTest: true
      },
      {
        id: "live",
        name: "Tài khoản thật",
        description: "Dùng tài khoản ApiShip của cửa hàng: giá thật của các hãng đã kết nối, vận đơn thật (hãng tới lấy hàng).",
        isTest: false
      }
    ],
    fields: [
      {
        key: "login",
        label: "Login ApiShip",
        type: "text",
        group: "Tài khoản ApiShip",
        env: "APISHIP_LOGIN",
        help: "Login đăng nhập tài khoản ApiShip của bạn.",
        modes: ["live"],
        required: true
      },
      {
        key: "password",
        label: "Mật khẩu ApiShip",
        type: "secret",
        group: "Tài khoản ApiShip",
        env: "APISHIP_PASSWORD",
        modes: ["live"],
        required: true
      },
      {
        key: "providerKeys",
        label: "Hãng vận chuyển cho khách chọn",
        type: "checkbox-list",
        group: "Hãng vận chuyển",
        default: apishipProviderKeys,
        options: apishipProviderList,
        help: "Không chọn hãng nào = lấy giá của tất cả hãng đã kết nối trong tài khoản ApiShip. Tài khoản thật: hãng phải được kết nối trong ApiShip thì mới có giá (bấm Kiểm tra kết nối để xem hãng nào đang có giá)."
      },
      {
        key: "coldProviderKeys",
        label: "Hãng nhận hàng mát / đông lạnh",
        type: "checkbox-list",
        group: "Hãng vận chuyển",
        default: apishipColdProviderKeys,
        options: apishipProviderList,
        help: "Giỏ hàng có sản phẩm bảo quản mát / đông lạnh thì chỉ cho chọn các hãng này. Không chọn = không giới hạn."
      },
      {
        key: "pickupType",
        label: "Cách giao hàng cho hãng vận chuyển",
        type: "select",
        group: "Cách gửi hàng",
        default: `${apishipPickupType}`,
        options: [
          { id: "1", name: "Hãng cử người tới kho lấy hàng (địa chỉ Kho gửi hàng bên dưới)" },
          { id: "2", name: "Cửa hàng tự mang hàng tới điểm nhận của hãng" }
        ]
      },
      {
        key: "pointInIds",
        label: "Điểm cửa hàng tự mang hàng tới (theo từng hãng)",
        type: "textarea",
        group: "Cách gửi hàng",
        default: apishipPointInIds,
        rows: 3,
        placeholder: "cdek: 12345",
        help: "Chỉ dùng khi chọn «Cửa hàng tự mang hàng tới điểm nhận của hãng». Mỗi dòng 1 hãng: <code>key của hãng: id điểm</code>, ví dụ <code>cdek: 12345</code> (id điểm lấy trong tài khoản ApiShip).",
        parse: (text: string) => {
          const result: { [providerKey: string]: number } = {}
          for (const line of text.split("\n").map(item => item.trim()).filter(Boolean)) {
            const match = line.match(/^([a-z0-9_-]+)\s*[:=]\s*(\d+)$/i)
            if(!match) throw new Error(`dòng "${line}" không đúng dạng "cdek: 12345"`)
            const providerKey = match[1].toLowerCase()
            if(!apishipProviderList.some(item => item.id === providerKey)) throw new Error(`không có hãng "${providerKey}"`)
            result[providerKey] = Number(match[2])
          }
          return Object.keys(result).length > 0 ? result : ""
        },
        format: (value: any) => Object.entries(value && typeof value === "object" ? value : {})
          .map(([providerKey, pointId]) => `${providerKey}: ${pointId}`)
          .join("\n")
      },
      {
        key: "boxList",
        label: "Các cỡ thùng đóng hàng (cm)",
        type: "textarea",
        group: "Đóng gói (tính phí giao hàng)",
        default: apishipBoxList,
        rows: 5,
        help: "Mỗi dòng 1 cỡ thùng: <code>dài x rộng x cao</code>. Website chọn thùng nhỏ nhất vừa với tất cả sản phẩm trong đơn để tính phí và in trên vận đơn.",
        parse: (text: string) => {
          const boxes = text.split("\n").map(item => item.trim()).filter(Boolean).map(line => {
            const numbers = line.split(/\s*[x×*,]\s*|\s+/i).filter(Boolean).map(Number)
            if(numbers.length !== 3 || numbers.some(number => !Number.isFinite(number) || number <= 0 || number > 300)){
              throw new Error(`dòng "${line}" không đúng dạng "30 x 20 x 15" (cm, tối đa 300)`)
            }
            return { length: numbers[0], width: numbers[1], height: numbers[2] }
          })
          if(boxes.length > 30) throw new Error("tối đa 30 cỡ thùng")
          return boxes.length > 0 ? boxes : ""
        },
        format: (value: any) => (Array.isArray(value) ? value : [])
          .map((box: any) => `${box.length} x ${box.width} x ${box.height}`)
          .join("\n")
      },
      { key: "packagingWeight", label: "Khối lượng bao bì cộng thêm mỗi đơn", type: "number", group: "Đóng gói (tính phí giao hàng)", default: apishipPackagingWeight, unit: "g", integer: true, max: 50000, help: "Thùng carton, túi giữ lạnh, đá khô..." },
      { key: "defaultItemWeight", label: "Khối lượng mặc định 1 sản phẩm", type: "number", group: "Đóng gói (tính phí giao hàng)", default: apishipDefaultItemWeight, unit: "g", integer: true, min: 1, max: 100000, help: "Dùng cho sản phẩm chưa nhập khối lượng ở trang sửa sản phẩm." },
      { key: "defaultItemLength", label: "Kích thước mặc định 1 sản phẩm: dài", type: "number", group: "Đóng gói (tính phí giao hàng)", default: apishipDefaultItemSize.length, unit: "cm", min: 1, max: 300 },
      { key: "defaultItemWidth", label: "Rộng", type: "number", group: "Đóng gói (tính phí giao hàng)", default: apishipDefaultItemSize.width, unit: "cm", min: 1, max: 300 },
      { key: "defaultItemHeight", label: "Cao", type: "number", group: "Đóng gói (tính phí giao hàng)", default: apishipDefaultItemSize.height, unit: "cm", min: 1, max: 300 },
      {
        key: "autoCreateShipment",
        label: "Tự tạo vận đơn ngay khi khách thanh toán",
        type: "switch",
        group: "Vận đơn",
        default: apishipAutoCreateShipment,
        help: "Tắt: nhân viên kiểm tra, đóng hàng rồi bấm «Tạo vận đơn» ở trang đơn hàng. Bật: tạo ngay, ngày gửi hàng là ngày làm việc tiếp theo."
      },
      { key: "statusSyncMinutes", label: "Tự cập nhật trạng thái giao hàng mỗi", type: "number", group: "Vận đơn", default: apishipStatusSyncMinutes, unit: "phút", integer: true, min: 5, max: 1440 },
      { key: "senderCompanyName", label: "Tên cửa hàng / ИП", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.companyName, placeholder: "ИП Иванов И.И." },
      { key: "senderContactName", label: "Người liên hệ (họ tên)", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.contactName },
      { key: "senderPhone", label: "Số điện thoại", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.phone, placeholder: "+79991234567" },
      { key: "senderEmail", label: "Email", type: "email", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.email },
      { key: "senderPostIndex", label: "Mã bưu chính", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.postIndex, placeholder: "101000" },
      { key: "senderRegion", label: "Vùng (регион)", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.region, placeholder: "Москва" },
      { key: "senderCity", label: "Thành phố", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.city, placeholder: "Москва", required: true },
      { key: "senderStreet", label: "Đường", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.street, placeholder: "ул. Тверская" },
      { key: "senderHouse", label: "Số nhà", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.house },
      { key: "senderBlock", label: "Корпус / строение", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.block },
      { key: "senderOffice", label: "Căn hộ / văn phòng / kho", type: "text", group: "Kho gửi hàng (in trên vận đơn)", default: apishipSender.office }
    ],
    guide: [
      {
        title: "Thử ngay (không cần tài khoản)",
        steps: [
          "Chọn chế độ <b>Máy chủ thử nghiệm</b>, bấm <b>Lưu &amp; kiểm tra kết nối</b>.",
          "Điền <b>Kho gửi hàng</b> (ít nhất thành phố, đường, số nhà, người liên hệ, số điện thoại) để phí giao hàng tính đúng và tạo được vận đơn."
        ]
      },
      {
        title: "Dùng tài khoản thật",
        steps: [
          "Đăng ký tại <a href=\"https://apiship.ru\" target=\"_blank\" rel=\"noopener\">apiship.ru</a>, chọn gói dịch vụ.",
          "Trong tài khoản ApiShip, mục kết nối hãng vận chuyển (подключения служб доставки): kết nối СДЭК, Яндекс Доставка, Почта России... bằng hợp đồng riêng với hãng (nhập khoá API của hãng) hoặc hợp đồng của ApiShip nếu có.",
          "Ở trang này: chọn <b>Tài khoản thật</b>, nhập login + mật khẩu ApiShip, chọn các hãng cho khách chọn, bấm <b>Lưu &amp; kiểm tra kết nối</b>. Kết quả liệt kê hãng nào đang có giá.",
          "Đăng nhập API báo lỗi: hỏi hỗ trợ ApiShip (support@apiship.ru) cách lấy thông tin truy cập API."
        ]
      }
    ]
  },

  // ===== Email (SMTP) =====
  {
    key: "smtp",
    name: "Email (SMTP)",
    category: "email",
    icon: "fa-solid fa-envelope",
    description: "Gửi email cho khách (xác nhận đơn hàng, mã vận đơn, quên mật khẩu, nhắc đánh giá) và báo đơn mới cho cửa hàng.",
    website: "",
    docsUrl: "",
    modes: [],
    fields: [
      {
        key: "host",
        label: "Máy chủ SMTP",
        type: "text",
        group: "Máy chủ gửi email",
        env: "SMTP_HOST",
        placeholder: "smtp.yandex.ru",
        help: "Gmail: <code>smtp.gmail.com</code> · Yandex: <code>smtp.yandex.ru</code> · Mail.ru: <code>smtp.mail.ru</code>. Để trống = không gửi email thật, nội dung email in ra cửa sổ terminal (để thử trên máy).",
        required: true
      },
      {
        key: "port",
        label: "Cổng",
        type: "number",
        group: "Máy chủ gửi email",
        env: "SMTP_PORT",
        default: 465,
        integer: true,
        min: 1,
        max: 65535,
        help: "465 (SSL) hoặc 587 (STARTTLS)."
      },
      {
        key: "user",
        label: "Tài khoản (email đăng nhập)",
        type: "text",
        group: "Máy chủ gửi email",
        env: "SMTP_USER"
      },
      {
        key: "pass",
        label: "Mật khẩu ứng dụng",
        type: "secret",
        group: "Máy chủ gửi email",
        env: "SMTP_PASS",
        help: "Gmail, Yandex, Mail.ru: dùng <b>mật khẩu ứng dụng</b> (пароль приложения), không phải mật khẩu đăng nhập."
      },
      {
        key: "from",
        label: "Người gửi hiển thị",
        type: "text",
        group: "Máy chủ gửi email",
        env: "SMTP_FROM",
        placeholder: "SFoodie <email-cua-ban@yandex.ru>",
        help: "Để trống = \"SFoodie &lt;tài khoản&gt;\". Gmail, Yandex chỉ cho gửi bằng đúng email đã đăng nhập."
      },
      {
        key: "notifyEmail",
        label: "Email nhận thông báo đơn hàng mới",
        type: "email",
        group: "Thông báo cho cửa hàng",
        env: "ORDER_NOTIFY_EMAIL",
        help: "Nhận email mỗi khi có đơn hàng được thanh toán. Để trống = không gửi."
      }
    ],
    guide: [
      {
        title: "Yandex Почта",
        steps: [
          "<a href=\"https://id.yandex.ru/security/app-passwords\" target=\"_blank\" rel=\"noopener\">id.yandex.ru → Безопасность → Пароли приложений</a> → tạo mật khẩu cho \"Почта\".",
          "Trong Yandex Почта → Все настройки → Почтовые программы: bật cho phép gửi bằng chương trình email (IMAP / SMTP).",
          "Nhập: máy chủ <code>smtp.yandex.ru</code>, cổng <code>465</code>, tài khoản = địa chỉ email, mật khẩu = mật khẩu ứng dụng vừa tạo."
        ]
      },
      {
        title: "Gmail",
        steps: [
          "Bật xác minh 2 bước cho tài khoản Google, rồi tạo mật khẩu ứng dụng tại <a href=\"https://myaccount.google.com/apppasswords\" target=\"_blank\" rel=\"noopener\">myaccount.google.com/apppasswords</a> (16 ký tự).",
          "Nhập: máy chủ <code>smtp.gmail.com</code>, cổng <code>465</code>, tài khoản = địa chỉ Gmail, mật khẩu = mật khẩu ứng dụng."
        ]
      },
      {
        title: "Kiểm tra",
        steps: [
          "Bấm <b>Lưu &amp; kiểm tra kết nối</b>: server đăng nhập máy chủ SMTP và gửi 1 email thử tới email tài khoản admin đang đăng nhập (hoặc email nhận thông báo đơn hàng)."
        ]
      }
    ]
  }
]

// Tìm theo key trong cả danh sách kết nối API và danh sách cài đặt cửa hàng (config/shop-setting.config.ts)
export const getIntegrationDefinition = (key: string): IntegrationDefinition | undefined => {
  return integrationList.find(item => item.key === key) || shopSettingList.find(item => item.key === key)
}

// Là mục của trang "Cài đặt cửa hàng" (không phải kết nối API)
export const isShopSettingKey = (key: string): boolean => {
  return shopSettingList.some(item => item.key === key)
}
