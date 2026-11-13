import mongoose from "mongoose"

// Đơn hàng của khách (đặt ở trang khách hàng: /checkout)
// Quy trình: pending (chờ thanh toán) => paid (đã thanh toán) => shipping (đã tạo vận đơn ApiShip, đang giao)
// => delivered (đã giao) | returned (bị hoàn về); đơn chưa thanh toán quá hạn hoặc bị huỷ => cancelled
// Danh sách trạng thái: orderStatusList, orderPaymentStatusList (config/variable.config.ts)
// Thông tin sản phẩm, giá tiền, địa chỉ được lưu lại tại thời điểm đặt hàng (sửa sản phẩm sau đó không ảnh hưởng đơn cũ)
const orderSchema = new mongoose.Schema(
  {
    code: String, // mã đơn hàng cho khách, ví dụ: SF-261105-4821
    accessKey: String, // mã bí mật trong link xem đơn hàng (khách chưa đăng nhập xem đơn bằng link này)
    userId: String, // id tài khoản khách đã đăng nhập (AccountClient), trống là khách chưa đăng nhập
    lang: String, // ngôn ngữ khách dùng lúc đặt hàng (gửi email theo ngôn ngữ này)

    // Người nhận
    customer: {
      fullName: String,
      phone: String, // đã chuẩn hoá, ví dụ: +79991234567
      email: String
    },

    // Sản phẩm
    items: [
      {
        _id: false,
        productId: String,
        name: String,
        nameRu: String,
        slug: String,
        sku: String,
        barcode: String,
        image: String, // ảnh đại diện
        unit: String, // đơn vị bán (productUnitList)
        vat: String, // thuế VAT (productVatList)
        price: Number, // giá bán 1 sản phẩm lúc đặt hàng
        priceOld: Number, // giá trước khuyến mãi (nếu có)
        quantity: Number,
        lineTotal: Number, // price * quantity
        weight: Number, // khối lượng 1 sản phẩm cả bao bì (gram)
        length: Number, // kích thước 1 sản phẩm (cm)
        width: Number,
        height: Number,
        storageType: String // bảo quản: thường, mát, đông lạnh
      }
    ],
    totalQuantity: Number, // tổng số lượng sản phẩm

    // Tiền (rúp ₽)
    oldSubtotal: Number, // tổng tiền theo giá trước khuyến mãi
    subtotal: Number, // tổng tiền hàng theo giá bán
    couponCode: String,
    couponDiscount: Number, // tiền giảm nhờ mã giảm giá
    couponFreeShipping: Boolean, // mã miễn phí giao hàng
    deliveryCost: Number, // phí giao hàng khách trả
    deliveryCostOriginal: Number, // phí giao hàng ApiShip tính (cửa hàng trả cho hãng vận chuyển)
    total: Number, // khách phải trả = subtotal - couponDiscount + deliveryCost

    // Giao hàng
    delivery: {
      type: { type: String }, // orderDeliveryTypeList: courier (tận cửa), point (điểm nhận hàng)
      providerKey: String, // hãng vận chuyển trong ApiShip, ví dụ: cdek
      providerName: String, // ví dụ: СДЭК
      tariffId: Number, // id tariff trong ApiShip
      tariffName: String,
      daysMin: Number, // số ngày giao dự kiến
      daysMax: Number,
      city: String,
      region: String,
      postIndex: String,
      street: String,
      house: String,
      apartment: String, // căn hộ / văn phòng
      address: String, // địa chỉ đầy đủ 1 dòng (hiển thị)
      point: {
        id: Number, // id điểm nhận hàng trong ApiShip
        code: String, // mã điểm của hãng vận chuyển
        name: String,
        address: String,
        timetable: String,
        lat: Number,
        lng: Number
      },
      parcel: {
        weight: Number, // gram
        length: Number, // cm
        width: Number,
        height: Number
      },
      comment: String // ghi chú của khách cho người giao hàng
    },

    // Thanh toán
    payment: {
      provider: String, // tbank | test (thanh toán giả khi thử trên máy)
      paymentId: String, // id giao dịch (PaymentId) của Т-Банк
      attempt: Number, // số lần tạo thanh toán (mỗi lần thanh toán lại dùng mã OrderId mới gửi cho Т-Банк)
      status: {
        type: String,
        default: "pending"
      }, // orderPaymentStatusList
      confirmationUrl: String, // link trang thanh toán (gửi khách bấm "Оплатить")
      method: String, // cách khách đã thanh toán, ví dụ: bank_card, sbp
      paidAt: Date,
      refundId: String,
      refundedAt: Date,
      cancelReason: String // lý do thanh toán không thành công (trạng thái Т-Банк trả về, ví dụ REJECTED)
    },
    paymentExpireAt: Date, // hết thời gian này chưa thanh toán thì đơn tự huỷ

    // Vận đơn ApiShip (tạo sau khi khách đã thanh toán)
    shipment: {
      orderId: Number, // id đơn trong ApiShip
      providerNumber: String, // mã vận đơn của hãng vận chuyển (mã tra cứu)
      trackingUrl: String, // link tra cứu trên trang hãng vận chuyển
      pickupDate: String, // ngày giao hàng cho hãng vận chuyển (YYYY-MM-DD)
      statusKey: String, // trạng thái trong ApiShip, ví dụ: uploaded, onWay, readyForRecipient, delivered
      statusName: String,
      statusDescription: String,
      statusUpdatedAt: Date,
      error: String, // lỗi khi tạo vận đơn / hãng vận chuyển báo lỗi
      createdAt: Date,
      lockedAt: Date, // đang tạo vận đơn (chống bấm 2 lần tạo 2 vận đơn)
      notifiedAt: Date // đã gửi email mã vận đơn cho khách
    },

    status: {
      type: String,
      default: "pending"
    }, // orderStatusList
    statusHistory: [
      {
        _id: false,
        status: String,
        note: String, // ghi chú, ví dụ: "Tạo vận đơn СДЭК 1234567890"
        by: String, // người thay đổi: tên nhân viên, "Khách hàng" hoặc "Hệ thống"
        at: Date
      }
    ],
    stockReleased: {
      type: Boolean,
      default: false
    }, // đã trả sản phẩm về kho (đơn bị huỷ)
    cancelReason: String,
    adminNote: String, // ghi chú nội bộ (chỉ hiện ở trang admin)
    reviewRequestSentAt: Date, // đã gửi email nhắc khách đánh giá sản phẩm (sau khi nhận hàng)
    search: String // tìm kiếm ở trang admin: mã đơn, tên, số điện thoại, email
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

orderSchema.index({ code: 1 }, { unique: true })
orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ "payment.paymentId": 1 })
orderSchema.index({ "shipment.orderId": 1 })
orderSchema.index({ createdAt: -1 })

export const Order = mongoose.model("Order", orderSchema, "orders")
