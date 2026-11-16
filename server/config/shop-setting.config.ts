import type { IntegrationDefinition } from "./integration.config"
import {
  checkoutDeliveryMarkup,
  checkoutFreeDeliveryFrom,
  checkoutMinOrderValue,
  clientDefaultTheme,
  orderPaymentTimeoutMinutes,
  productLowStockThreshold,
  reviewEditDays,
  reviewMaxPhotos,
  reviewModeration,
  reviewRequestDelayHours,
  reviewRequestEmail,
  reviewRequestMaxDays,
  shopInfo
} from "./variable.config"

// ===== Cài đặt cửa hàng (trang admin: Cài đặt cửa hàng) =====
// Cùng cách hoạt động với trang Kết nối API (config/integration.config.ts): trang admin tự tạo form theo danh sách ô,
// giá trị nhập ở trang admin được ưu tiên, chưa nhập thì dùng giá trị mặc định (default, lấy từ config/variable.config.ts)
// Đọc giá trị trong code: helpers/shop-setting.helper.ts
// Lưu ý: không đổi key của mục / ô đã dùng, vì giá trị đã lưu trong database theo key

const section = (data: Omit<IntegrationDefinition, "category" | "website" | "docsUrl" | "modes" | "guide"> & { guide?: IntegrationDefinition["guide"] }): IntegrationDefinition => ({
  category: "shop",
  website: "",
  docsUrl: "",
  modes: [],
  guide: [],
  ...data
})

export const shopSettingList: IntegrationDefinition[] = [
  section({
    key: "shop-info",
    name: "Thông tin cửa hàng",
    icon: "fa-solid fa-store",
    description: "Điện thoại, email, địa chỉ, mạng xã hội hiện ở đầu trang / chân trang, thông tin người bán (ИП) và giao diện mặc định.",
    fields: [
      { key: "phone", label: "Số điện thoại / hotline", type: "text", group: "Liên hệ (hiện ở đầu trang, chân trang)", default: shopInfo.phone, placeholder: "+7 (999) 123-45-67" },
      { key: "email", label: "Email", type: "email", group: "Liên hệ (hiện ở đầu trang, chân trang)", default: shopInfo.email, placeholder: "info@sfoodie.ru" },
      { key: "address", label: "Địa chỉ cửa hàng / kho", type: "text", group: "Liên hệ (hiện ở đầu trang, chân trang)", default: shopInfo.address },
      { key: "workingHours", label: "Giờ làm việc", type: "text", group: "Liên hệ (hiện ở đầu trang, chân trang)", default: shopInfo.workingHours, placeholder: "09:00 - 21:00" },
      { key: "telegram", label: "Telegram", type: "url", group: "Mạng xã hội", default: shopInfo.telegram, placeholder: "https://t.me/sfoodie" },
      { key: "whatsapp", label: "WhatsApp", type: "url", group: "Mạng xã hội", default: shopInfo.whatsapp, placeholder: "https://wa.me/79991234567" },
      { key: "vk", label: "VK", type: "url", group: "Mạng xã hội", default: shopInfo.vk, placeholder: "https://vk.com/sfoodie" },
      {
        key: "legalName",
        label: "Tên người bán",
        type: "text",
        group: "Thông tin người bán (hiện ở cuối chân trang)",
        default: shopInfo.legalName,
        placeholder: "ИП Иванов Иван Иванович",
        help: "Т-Банк kiểm tra thông tin này khi duyệt website cho Интернет-эквайринг. Để trống thì không hiện."
      },
      { key: "inn", label: "ИНН", type: "text", group: "Thông tin người bán (hiện ở cuối chân trang)", default: shopInfo.inn, placeholder: "771234567890" },
      { key: "ogrn", label: "ОГРНИП / ОГРН", type: "text", group: "Thông tin người bán (hiện ở cuối chân trang)", default: shopInfo.ogrn, placeholder: "321774600123456" },
      { key: "legalAddress", label: "Địa chỉ đăng ký", type: "text", group: "Thông tin người bán (hiện ở cuối chân trang)", default: shopInfo.legalAddress },
      {
        key: "defaultTheme",
        label: "Giao diện mặc định của trang khách hàng",
        type: "select",
        group: "Giao diện",
        default: clientDefaultTheme,
        options: [
          { id: "system", name: "Theo cài đặt sáng / tối của máy khách" },
          { id: "light", name: "Luôn sáng" },
          { id: "dark", name: "Luôn tối" }
        ],
        help: "Khách đã bấm nút đổi sáng / tối thì trình duyệt nhớ lựa chọn của khách."
      }
    ]
  }),
  section({
    key: "checkout",
    name: "Đặt hàng",
    icon: "fa-solid fa-cart-shopping",
    description: "Giá trị đơn tối thiểu, miễn phí giao hàng, phụ phí giao hàng, thời gian giữ hàng chờ thanh toán.",
    fields: [
      { key: "minOrderValue", label: "Giá trị đơn hàng tối thiểu", type: "number", group: "Đơn hàng", default: checkoutMinOrderValue, unit: "₽", max: 10000000, help: "Tiền hàng sau giảm giá, chưa gồm phí giao hàng. 0 = không yêu cầu." },
      { key: "freeDeliveryFrom", label: "Miễn phí giao hàng cho đơn từ", type: "number", group: "Phí giao hàng", default: checkoutFreeDeliveryFrom, unit: "₽", max: 10000000, help: "Tiền hàng sau giảm giá. 0 = không áp dụng (mã giảm giá «Miễn phí giao hàng» vẫn dùng được)." },
      { key: "deliveryMarkup", label: "Cộng thêm vào phí giao hàng", type: "number", group: "Phí giao hàng", default: checkoutDeliveryMarkup, unit: "₽", max: 100000, help: "Ví dụ tiền hộp, túi giữ lạnh. Phí khách trả = giá ApiShip + số này, làm tròn lên số rúp chẵn. 0 = không cộng." },
      { key: "paymentTimeoutMinutes", label: "Giữ hàng cho đơn chưa thanh toán", type: "number", group: "Thanh toán", default: orderPaymentTimeoutMinutes, unit: "phút", integer: true, min: 10, max: 1440, help: "Quá thời gian này đơn tự huỷ, sản phẩm trả lại kho, mã giảm giá được trả lại lượt dùng." }
    ]
  }),
  section({
    key: "product",
    name: "Sản phẩm",
    icon: "fa-solid fa-box-open",
    description: "Ngưỡng báo «Sắp hết hàng».",
    fields: [
      { key: "lowStockThreshold", label: "Báo «Sắp hết hàng» khi tồn kho từ", type: "number", group: "Tồn kho", default: productLowStockThreshold, unit: "trở xuống", integer: true, max: 100000, help: "Dùng ở danh sách sản phẩm, trang tổng quan và nhãn «Осталось мало» ở trang khách hàng." }
    ]
  }),
  section({
    key: "review",
    name: "Đánh giá sản phẩm",
    icon: "fa-solid fa-star",
    description: "Duyệt đánh giá, số ảnh, thời gian khách được sửa, email nhắc khách đánh giá.",
    fields: [
      {
        key: "moderation",
        label: "Duyệt đánh giá trước khi hiện",
        type: "switch",
        group: "Đánh giá",
        default: reviewModeration,
        help: "Bật: đánh giá có chữ / ảnh phải được nhân viên duyệt (trang Đánh giá sản phẩm) mới hiện. Chỉ chấm sao thì luôn được tính ngay."
      },
      { key: "maxPhotos", label: "Số ảnh tối đa trong 1 đánh giá", type: "number", group: "Đánh giá", default: reviewMaxPhotos, integer: true, min: 0, max: 10 },
      { key: "editDays", label: "Khách được sửa / xoá đánh giá trong", type: "number", group: "Đánh giá", default: reviewEditDays, unit: "ngày", integer: true, min: 0, max: 365 },
      {
        key: "requestEmail",
        label: "Gửi email nhắc khách đánh giá sau khi nhận hàng",
        type: "switch",
        group: "Email nhắc đánh giá («Как вам покупка?»)",
        default: reviewRequestEmail
      },
      { key: "requestDelayHours", label: "Gửi sau khi đơn chuyển sang «Đã giao hàng»", type: "number", group: "Email nhắc đánh giá («Как вам покупка?»)", default: reviewRequestDelayHours, unit: "giờ", integer: true, min: 1, max: 720 },
      { key: "requestMaxDays", label: "Chỉ gửi cho đơn giao trong", type: "number", group: "Email nhắc đánh giá («Как вам покупка?»)", default: reviewRequestMaxDays, unit: "ngày gần đây", integer: true, min: 1, max: 365 }
    ]
  })
]
