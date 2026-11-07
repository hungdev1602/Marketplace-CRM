import mongoose from "mongoose"

// Kết quả tính phí giao hàng của ApiShip ở trang đặt hàng, lưu tạm để lúc đặt hàng lấy đúng giá khách đã thấy
// (giá không gửi từ trình duyệt lên, nên khách không sửa được phí giao hàng)
// Tự xoá sau 3 tiếng (TTL index), khách để trang đặt hàng quá lâu thì phải tính lại
const deliveryQuoteSchema = new mongoose.Schema(
  {
    cartId: String, // giỏ hàng lúc tính phí
    deliveryType: String, // courier | point
    city: String,
    region: String,
    postIndex: String,
    street: String,
    house: String,
    weight: Number, // khối lượng đơn hàng lúc tính (gram), giỏ hàng thay đổi thì phải tính lại
    assessedCost: Number, // tiền hàng lúc tính (₽)
    parcel: {
      weight: Number,
      length: Number,
      width: Number,
      height: Number
    },
    options: [
      {
        _id: false,
        providerKey: String,
        providerName: String,
        tariffId: Number,
        tariffName: String,
        cost: Number, // phí giao hàng khách trả (đã cộng thêm, làm tròn)
        costOriginal: Number, // phí ApiShip tính
        daysMin: Number,
        daysMax: Number,
        pointIds: [Number] // điểm nhận hàng của tariff (giao tới điểm nhận hàng)
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3 * 60 * 60 // tự xoá sau 3 tiếng
    }
  }
)

export const DeliveryQuote = mongoose.model("DeliveryQuote", deliveryQuoteSchema, "delivery-quotes")
