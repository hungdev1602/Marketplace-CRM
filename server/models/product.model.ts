import mongoose from "mongoose"

// Sản phẩm (thực phẩm châu Á bán tại Nga)
// Các trường lưu theo id (origin, unit, storageType, allergens,...) lấy danh sách ở config/variable.config.ts
const productSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    name: String, // tên sản phẩm, ví dụ: Mì Hảo Hảo tôm chua cay 75g
    nameRu: String, // tên tiếng Nga (bắt buộc trên nhãn khi bán tại Nga), ví dụ: Лапша Hao Hao со вкусом креветки
    slug: String,
    sku: String, // mã sản phẩm nội bộ
    barcode: String, // mã vạch EAN-13 (штрихкод) in trên bao bì
    category: [String], // id danh mục sản phẩm
    brand: String, // thương hiệu, ví dụ: Acecook, Nongshim, Cholimex
    origin: String, // xuất xứ: productOriginList
    manufacturer: String, // nhà sản xuất (tên, địa chỉ)
    importer: String, // nhà nhập khẩu tại Nga (tên, địa chỉ)
    dietTags: [String], // đặc điểm: productDietTagList (cay, chay, halal,...)

    // Giá & kho hàng (tiền rúp ₽)
    price: Number, // giá bán (khách trả)
    priceOld: Number, // giá gốc trước khuyến mãi, hiển thị gạch ngang (để trống nếu không giảm giá)
    costPrice: Number, // giá nhập, chỉ hiện trong trang admin
    vat: String, // thuế VAT (НДС): productVatList
    unit: String, // đơn vị bán: productUnitList
    stock: {
      type: Number,
      default: 0
    }, // số lượng tồn kho
    sold: {
      type: Number,
      default: 0
    }, // số lượng đã bán

    // Thông tin thực phẩm
    netWeight: Number, // khối lượng tịnh / thể tích, ví dụ: 75
    netWeightUnit: String, // đơn vị: productNetWeightUnitList (g, kg, ml, l)
    ingredients: String, // thành phần (состав)
    allergens: [String], // chất gây dị ứng: productAllergenList
    calories: Number, // năng lượng (kcal) trên 100g/100ml
    protein: Number, // chất đạm (g) trên 100g/100ml
    fat: Number, // chất béo (g) trên 100g/100ml
    carbohydrate: Number, // carbohydrate (g) trên 100g/100ml
    storageType: String, // điều kiện bảo quản: productStorageList
    storageNote: String, // hướng dẫn bảo quản thêm, ví dụ: sau khi mở nắp bảo quản tủ lạnh
    shelfLife: Number, // hạn sử dụng, ví dụ: 6
    shelfLifeUnit: String, // đơn vị: productShelfLifeUnitList (ngày, tháng, năm)
    usageInstructions: String, // hướng dẫn sử dụng / cách chế biến

    // Pháp lý tại Nga
    certificateNumber: String, // số tờ khai / giấy chứng nhận hợp chuẩn ЕАЭС (декларация о соответствии)
    markingRequired: {
      type: Boolean,
      default: false
    }, // hàng bắt buộc dán mã "Честный знак"

    // Vận chuyển
    grossWeight: Number, // khối lượng cả bao bì (g), dùng tính phí giao hàng
    packageLength: Number, // chiều dài kiện hàng (cm)
    packageWidth: Number, // chiều rộng kiện hàng (cm)
    packageHeight: Number, // chiều cao kiện hàng (cm)

    // Hình ảnh & mô tả
    avatar: String, // ảnh đại diện
    images: [String], // album ảnh
    description: String, // mô tả ngắn
    content: String, // mô tả chi tiết

    // Hiển thị
    status: {
      type: String,
      enum: ["active", "inactive"], // active - Đang bán, inactive - Ngừng bán
      default: "active"
    },
    featured: {
      type: Boolean,
      default: false
    }, // sản phẩm nổi bật
    newArrival: {
      type: Boolean,
      default: false
    }, // hàng mới về
    position: Number, // thứ tự hiển thị, số nhỏ hiển thị trước
    metaTitle: String, // SEO: tiêu đề hiện trên Google/Yandex
    metaDescription: String, // SEO: mô tả hiện trên Google/Yandex
    view: {
      type: Number,
      default: 0
    },

    search: String,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  {
    timestamps: true //createdAt & updatedAt
  }
)

export const Product = mongoose.model("Product", productSchema, "products")
