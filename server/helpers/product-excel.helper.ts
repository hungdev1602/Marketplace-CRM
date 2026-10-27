import { Response } from "express"
import ExcelJS from "exceljs"
import mongoose from "mongoose"
import slugify from "slugify"
import { CategoryProduct } from "../models/category-product.model"
import {
  domainFileManager,
  productAllergenList,
  productDietTagList,
  productImportImageFolder,
  productImportMaxFileSize,
  productImportMaxRows,
  productNetWeightUnitList,
  productOriginList,
  productShelfLifeUnitList,
  productStorageList,
  productUnitList,
  productVatList
} from "../config/variable.config"

// ===== File Excel sản phẩm (dùng chung cho file mẫu, file xuất, file lỗi và đọc file nhập) =====
// Cấu trúc sheet "Sản phẩm":
// - Dòng 1: tên nhóm cột (Thông tin cơ bản, Giá & kho hàng,...)
// - Dòng 2: tên cột (cột có dấu * bắt buộc khi thêm mới), di chuột vào tên cột để xem hướng dẫn
// - Từ dòng 3: mỗi dòng 1 sản phẩm
// Khi đọc file nhập, cột được nhận theo tên cột (không theo vị trí), nên người dùng được đổi thứ tự hoặc xoá bớt cột

type Option = {
  id: string,
  name: string
}

export type ProductExcelColumn = {
  key: string, // tên trường trong models/product.model.ts
  header: string, // tên cột trong file Excel
  group: string, // nhóm cột: productExcelGroupList
  // Kiểu dữ liệu:
  // - id: ID sản phẩm, text: chữ, number: số không âm, integer: số nguyên không âm
  // - select: chọn 1 trong list, multiSelect: chọn nhiều trong list, boolean: Có / Không
  // - category: danh mục sản phẩm, image: 1 ảnh, images: nhiều ảnh, html: mô tả (văn bản thường hoặc HTML)
  type: "id" | "text" | "number" | "integer" | "select" | "multiSelect" | "boolean" | "category" | "image" | "images" | "html",
  list?: Option[], // danh sách lựa chọn (select, multiSelect)
  required?: boolean, // bắt buộc khi thêm mới
  max?: number, // số ký tự tối đa (text)
  width: number, // độ rộng cột
  note: string, // hướng dẫn nhập
  example?: string // ví dụ
}

// Danh mục sản phẩm dùng trong file Excel, path: đường dẫn đầy đủ, ví dụ "Mì - Bún - Phở khô > Mì gói"
export type ProductExcelCategory = {
  id: string,
  name: string,
  nameRu: string,
  path: string,
  status: string
}

// Lỗi do file của người dùng (sai định dạng, thiếu dòng tiêu đề,...), thông báo được hiện thẳng cho người dùng
export class ProductExcelError extends Error {}

// Nhập dấu gạch ngang vào ô để xoá giá trị cũ khi cập nhật (ô để trống = giữ nguyên giá trị cũ)
export const productExcelClearValue = "-"

// Các ô chọn nhiều giá trị (danh mục, đặc điểm, album ảnh,...) cách nhau bằng dấu ; hoặc xuống dòng
const multipleSeparator = /[;\n]/
const multipleJoin = "; "

const productSheetName = "Sản phẩm"
const guideSheetName = "Hướng dẫn"
const categorySheetName = "Danh mục"
const listSheetName = "DanhSachLuaChon" // sheet ẩn chứa danh sách thả xuống
const headerRowNumber = 2
const firstDataRowNumber = 3

// Giới hạn số ký tự trong 1 ô của Excel
const excelCellMaxLength = 32767

export const productStatusList = [
  { id: "active", name: "Đang bán" },
  { id: "inactive", name: "Ngừng bán" }
]

const booleanList = [
  { id: "true", name: "Có" },
  { id: "false", name: "Không" }
]

// Nhóm cột, dùng để chọn thông tin cần xuất ở trang danh sách sản phẩm
// - color: màu nền tên nhóm trong file Excel (mã màu ARGB)
export const productExcelGroupList = [
  { id: "basic", name: "Thông tin cơ bản", description: "Tên, danh mục, thương hiệu, xuất xứ, mã vạch...", color: "FF2F5597" },
  { id: "sales", name: "Giá & kho hàng", description: "Giá bán, giá khuyến mãi, giá nhập, VAT, tồn kho", color: "FF548235" },
  { id: "food", name: "Thông tin thực phẩm", description: "Khối lượng, thành phần, dị ứng, dinh dưỡng, bảo quản, hạn dùng", color: "FFC55A11" },
  { id: "legal", name: "Pháp lý tại Nga", description: "Chứng nhận ЕАЭС, mã Честный знак", color: "FF7030A0" },
  { id: "shipping", name: "Vận chuyển", description: "Khối lượng cả bao bì, kích thước kiện hàng", color: "FF2E75B6" },
  { id: "media", name: "Hình ảnh & mô tả", description: "Ảnh đại diện, album ảnh, mô tả ngắn, mô tả chi tiết", color: "FFC00000" },
  { id: "display", name: "Hiển thị & SEO", description: "Trạng thái, nổi bật, hàng mới, vị trí, đường dẫn, SEO", color: "FF595959" }
]

// Các cột luôn có trong file xuất (để nhập lại cập nhật được sản phẩm)
export const productExcelRequiredExportKeys = ["_id", "sku", "name"]

// Danh sách cột, thứ tự cột trong file mẫu / file xuất theo thứ tự này
export const productExcelColumnList: ProductExcelColumn[] = [
  // Thông tin cơ bản
  {
    key: "_id",
    header: "ID sản phẩm",
    group: "basic",
    type: "id",
    width: 27,
    note: "Mã hệ thống của sản phẩm, có sẵn trong file xuất ra để cập nhật sản phẩm. Để trống khi thêm sản phẩm mới. Không sửa ô này."
  },
  {
    key: "sku",
    header: "Mã SKU",
    group: "basic",
    type: "text",
    max: 50,
    width: 16,
    note: "Mã sản phẩm nội bộ, không trùng với sản phẩm khác. Khi cập nhật mà không có ID thì hệ thống tìm sản phẩm theo mã SKU.",
    example: "HH-TOM-75"
  },
  {
    key: "name",
    header: "Tên sản phẩm",
    group: "basic",
    type: "text",
    required: true,
    width: 36,
    note: "Tên sản phẩm (tiếng Việt).",
    example: "Mì Hảo Hảo tôm chua cay 75g"
  },
  {
    key: "nameRu",
    header: "Tên tiếng Nga",
    group: "basic",
    type: "text",
    width: 36,
    note: "Tên tiếng Nga (bắt buộc trên nhãn khi bán tại Nga).",
    example: "Лапша Hao Hao со вкусом креветки 75 г"
  },
  {
    key: "category",
    header: "Danh mục",
    group: "basic",
    type: "category",
    width: 32,
    note: "Chọn trong danh sách thả xuống (đường dẫn đầy đủ ở sheet \"Danh mục\"). Được ghi tên danh mục nếu tên không bị trùng. Nhiều danh mục cách nhau bằng dấu ;",
    example: "Mì - Bún - Phở khô > Mì gói"
  },
  {
    key: "brand",
    header: "Thương hiệu",
    group: "basic",
    type: "text",
    width: 16,
    note: "Thương hiệu.",
    example: "Acecook"
  },
  {
    key: "origin",
    header: "Xuất xứ",
    group: "basic",
    type: "select",
    list: productOriginList,
    width: 14,
    note: "Chọn trong danh sách thả xuống (hoặc nhập mã quốc gia, ví dụ VN).",
    example: "Việt Nam"
  },
  {
    key: "manufacturer",
    header: "Nhà sản xuất",
    group: "basic",
    type: "text",
    width: 30,
    note: "Tên, địa chỉ nhà sản xuất.",
    example: "Acecook Việt Nam, KCN Tân Bình, TP.HCM"
  },
  {
    key: "importer",
    header: "Nhà nhập khẩu",
    group: "basic",
    type: "text",
    width: 30,
    note: "Tên, địa chỉ nhà nhập khẩu tại Nga.",
    example: "ООО «Азия Фуд», г. Москва"
  },
  {
    key: "barcode",
    header: "Mã vạch",
    group: "basic",
    type: "text",
    width: 16,
    note: "Mã vạch in trên bao bì, chỉ gồm 8 đến 14 chữ số (EAN-8, EAN-13, ITF-14).",
    example: "8934563138165"
  },
  {
    key: "dietTags",
    header: "Đặc điểm",
    group: "basic",
    type: "multiSelect",
    list: productDietTagList,
    width: 18,
    note: "Chọn trong danh sách thả xuống. Nhiều đặc điểm cách nhau bằng dấu ;",
    example: "Cay; Chay"
  },

  // Giá & kho hàng
  {
    key: "price",
    header: "Giá bán (₽)",
    group: "sales",
    type: "number",
    required: true,
    width: 13,
    note: "Giá khách trả (rúp), phải cao hơn giá nhập.",
    example: "45"
  },
  {
    key: "priceOld",
    header: "Giá trước khuyến mãi (₽)",
    group: "sales",
    type: "number",
    width: 15,
    note: "Giá hiển thị gạch ngang, phải cao hơn giá bán. Để trống nếu không giảm giá. Muốn bỏ giảm giá thì nhập dấu -",
    example: "55"
  },
  {
    key: "costPrice",
    header: "Giá nhập (₽)",
    group: "sales",
    type: "number",
    width: 13,
    note: "Giá vốn, chỉ hiện trong trang admin.",
    example: "30"
  },
  {
    key: "vat",
    header: "Thuế VAT",
    group: "sales",
    type: "select",
    list: productVatList,
    width: 18,
    note: "Chọn trong danh sách thả xuống.",
    example: "10% (thực phẩm thiết yếu)"
  },
  {
    key: "unit",
    header: "Đơn vị bán",
    group: "sales",
    type: "select",
    list: productUnitList,
    width: 12,
    note: "Chọn trong danh sách thả xuống.",
    example: "Gói"
  },
  {
    key: "stock",
    header: "Tồn kho",
    group: "sales",
    type: "integer",
    width: 10,
    note: "Số lượng tồn kho (số nguyên). Để trống khi thêm mới thì là 0.",
    example: "100"
  },

  // Thông tin thực phẩm
  {
    key: "netWeight",
    header: "Khối lượng tịnh",
    group: "food",
    type: "number",
    width: 12,
    note: "Khối lượng tịnh / thể tích in trên bao bì.",
    example: "75"
  },
  {
    key: "netWeightUnit",
    header: "Đơn vị khối lượng tịnh",
    group: "food",
    type: "select",
    list: productNetWeightUnitList,
    width: 12,
    note: "Chọn trong danh sách thả xuống (g, kg, ml, l).",
    example: "g"
  },
  {
    key: "ingredients",
    header: "Thành phần",
    group: "food",
    type: "text",
    width: 36,
    note: "Thành phần (состав).",
    example: "Bột mì, dầu cọ, muối, đường, tôm sấy..."
  },
  {
    key: "allergens",
    header: "Chất gây dị ứng",
    group: "food",
    type: "multiSelect",
    list: productAllergenList,
    width: 28,
    note: "Chọn trong danh sách thả xuống (được ghi tên ngắn, ví dụ \"Cá\", hoặc mã, ví dụ \"fish\"). Nhiều chất cách nhau bằng dấu ;",
    example: "Ngũ cốc chứa gluten; Đậu nành"
  },
  {
    key: "calories",
    header: "Năng lượng (kcal/100g)",
    group: "food",
    type: "number",
    width: 13,
    note: "Năng lượng (kcal) trên 100g/100ml.",
    example: "450"
  },
  {
    key: "protein",
    header: "Chất đạm (g/100g)",
    group: "food",
    type: "number",
    width: 12,
    note: "Chất đạm (g) trên 100g/100ml.",
    example: "9.5"
  },
  {
    key: "fat",
    header: "Chất béo (g/100g)",
    group: "food",
    type: "number",
    width: 12,
    note: "Chất béo (g) trên 100g/100ml.",
    example: "18"
  },
  {
    key: "carbohydrate",
    header: "Carbohydrate (g/100g)",
    group: "food",
    type: "number",
    width: 13,
    note: "Carbohydrate (g) trên 100g/100ml.",
    example: "62"
  },
  {
    key: "storageType",
    header: "Điều kiện bảo quản",
    group: "food",
    type: "select",
    list: productStorageList,
    width: 22,
    note: "Chọn trong danh sách thả xuống (hàng mát, đông lạnh cần giao bằng hộp giữ lạnh).",
    example: "Nhiệt độ thường"
  },
  {
    key: "storageNote",
    header: "Hướng dẫn bảo quản thêm",
    group: "food",
    type: "text",
    width: 28,
    note: "Ví dụ: sau khi mở bảo quản trong tủ lạnh.",
    example: "Nơi khô ráo, thoáng mát"
  },
  {
    key: "shelfLife",
    header: "Hạn sử dụng",
    group: "food",
    type: "integer",
    width: 10,
    note: "Hạn sử dụng (số nguyên), đơn vị ở cột bên cạnh.",
    example: "6"
  },
  {
    key: "shelfLifeUnit",
    header: "Đơn vị hạn sử dụng",
    group: "food",
    type: "select",
    list: productShelfLifeUnitList,
    width: 12,
    note: "Chọn trong danh sách thả xuống (Ngày, Tháng, Năm).",
    example: "Tháng"
  },
  {
    key: "usageInstructions",
    header: "Hướng dẫn sử dụng",
    group: "food",
    type: "text",
    width: 30,
    note: "Hướng dẫn sử dụng / cách chế biến.",
    example: "Cho mì vào bát, chế 400ml nước sôi, đậy nắp 3 phút"
  },

  // Pháp lý tại Nga
  {
    key: "certificateNumber",
    header: "Số chứng nhận ЕАЭС",
    group: "legal",
    type: "text",
    width: 26,
    note: "Số tờ khai / giấy chứng nhận hợp chuẩn ЕАЭС (декларация о соответствии).",
    example: "ЕАЭС N RU Д-VN.РА01.В.12345/24"
  },
  {
    key: "markingRequired",
    header: "Bắt buộc mã Честный знак",
    group: "legal",
    type: "boolean",
    width: 14,
    note: "Hàng bắt buộc dán mã \"Честный знак\": chọn Có hoặc Không.",
    example: "Không"
  },

  // Vận chuyển
  {
    key: "grossWeight",
    header: "Khối lượng cả bao bì (g)",
    group: "shipping",
    type: "number",
    width: 14,
    note: "Khối lượng cả bao bì (gram), dùng tính phí giao hàng.",
    example: "85"
  },
  {
    key: "packageLength",
    header: "Chiều dài kiện hàng (cm)",
    group: "shipping",
    type: "number",
    width: 13,
    note: "Chiều dài kiện hàng (cm).",
    example: "20"
  },
  {
    key: "packageWidth",
    header: "Chiều rộng kiện hàng (cm)",
    group: "shipping",
    type: "number",
    width: 13,
    note: "Chiều rộng kiện hàng (cm).",
    example: "15"
  },
  {
    key: "packageHeight",
    header: "Chiều cao kiện hàng (cm)",
    group: "shipping",
    type: "number",
    width: 13,
    note: "Chiều cao kiện hàng (cm).",
    example: "4"
  },

  // Hình ảnh & mô tả
  {
    key: "avatar",
    header: "Ảnh đại diện",
    group: "media",
    type: "image",
    width: 34,
    note: `Đường dẫn ảnh copy ở trang Quản lý file (ví dụ /media/mi-hao-hao.png), hoặc link ảnh trên mạng (https://...): hệ thống tự tải ảnh về thư mục "${productImportImageFolder}" trong Quản lý file. Ảnh JPG, PNG, WEBP, GIF.`,
    example: "/media/mi-hao-hao.png"
  },
  {
    key: "images",
    header: "Album ảnh",
    group: "media",
    type: "images",
    width: 40,
    note: "Giống cột Ảnh đại diện. Nhiều ảnh cách nhau bằng dấu ; hoặc xuống dòng (Alt + Enter).",
    example: "/media/anh-1.png; https://example.com/anh-2.jpg"
  },
  {
    key: "description",
    header: "Mô tả ngắn",
    group: "media",
    type: "html",
    width: 40,
    note: "Nhập văn bản thường (mỗi dòng thành 1 đoạn văn) hoặc mã HTML. File xuất ra giữ nguyên HTML để không mất định dạng.",
    example: "Mì ăn liền vị tôm chua cay"
  },
  {
    key: "content",
    header: "Mô tả chi tiết",
    group: "media",
    type: "html",
    width: 50,
    note: "Giống cột Mô tả ngắn.",
    example: "<p>Mì Hảo Hảo - <b>vị tôm chua cay</b> quen thuộc</p>"
  },

  // Hiển thị & SEO
  {
    key: "status",
    header: "Trạng thái",
    group: "display",
    type: "select",
    list: productStatusList,
    width: 12,
    note: "Đang bán / Ngừng bán. Để trống khi thêm mới thì là Đang bán.",
    example: "Đang bán"
  },
  {
    key: "featured",
    header: "Sản phẩm nổi bật",
    group: "display",
    type: "boolean",
    width: 11,
    note: "Chọn Có hoặc Không.",
    example: "Không"
  },
  {
    key: "newArrival",
    header: "Hàng mới về",
    group: "display",
    type: "boolean",
    width: 11,
    note: "Chọn Có hoặc Không.",
    example: "Có"
  },
  {
    key: "position",
    header: "Vị trí hiển thị",
    group: "display",
    type: "integer",
    width: 10,
    note: "Số nhỏ hiển thị trước. Để trống khi thêm mới thì xếp xuống cuối.",
    example: "1"
  },
  {
    key: "slug",
    header: "Đường dẫn (slug)",
    group: "display",
    type: "text",
    width: 30,
    note: "Đường dẫn trang sản phẩm, không trùng với sản phẩm khác. Để trống khi thêm mới thì tự tạo từ tên sản phẩm.",
    example: "mi-hao-hao-tom-chua-cay-75g"
  },
  {
    key: "metaTitle",
    header: "Tiêu đề SEO",
    group: "display",
    type: "text",
    max: 70,
    width: 30,
    note: "Tiêu đề hiện trên Google/Yandex, tối đa 70 ký tự.",
    example: "Mì Hảo Hảo tôm chua cay 75g - giao nhanh tại Moskva"
  },
  {
    key: "metaDescription",
    header: "Mô tả SEO",
    group: "display",
    type: "text",
    max: 200,
    width: 40,
    note: "Mô tả hiện trên Google/Yandex, tối đa 200 ký tự.",
    example: "Mì ăn liền Hảo Hảo nhập khẩu chính hãng từ Việt Nam"
  }
]

// Quy định chung, hiện ở đầu sheet "Hướng dẫn"
const guideRuleList = [
  `Mỗi dòng là 1 sản phẩm, nhập từ dòng ${firstDataRowNumber} của sheet "${productSheetName}". Không sửa, không xoá dòng 1 - 2 (tên nhóm cột, tên cột).`,
  "Cột có dấu * bắt buộc nhập khi thêm sản phẩm mới. Di chuột vào tên cột để xem hướng dẫn.",
  "Thêm sản phẩm mới: để trống cột \"ID sản phẩm\".",
  "Cập nhật sản phẩm đã có: xuất file ở trang Danh sách sản phẩm (bấm \"Xuất Excel\"), sửa rồi nhập lại. Hệ thống tìm sản phẩm theo cột \"ID sản phẩm\", nếu không có ID thì tìm theo \"Mã SKU\".",
  `Khi cập nhật: ô để trống = giữ nguyên giá trị cũ. Muốn xoá giá trị cũ (ví dụ bỏ giá khuyến mãi) thì nhập dấu gạch ngang ${productExcelClearValue}`,
  "Được xoá bớt cột không cần sửa (ví dụ chỉ giữ ID, Mã SKU, Tên sản phẩm, Giá bán, Tồn kho để sửa giá và tồn kho hàng loạt). Cột không có trong file thì giữ nguyên.",
  "Ô chọn: chọn trong danh sách thả xuống. Ô chọn nhiều giá trị (danh mục, đặc điểm, chất gây dị ứng, album ảnh): cách nhau bằng dấu chấm phẩy ;",
  "Ô số: chỉ nhập số, không ghi đơn vị. Phần thập phân dùng dấu chấm hoặc dấu phẩy (ví dụ 45.5 hoặc 45,5).",
  `Mỗi lần nhập tối đa ${productImportMaxRows} dòng, file .xlsx không quá ${productImportMaxFileSize}MB. Danh sách danh mục xem ở sheet "${categorySheetName}".`,
  "Dòng bị lỗi sẽ không được nhập, các dòng còn lại vẫn được nhập bình thường. Tải \"file lỗi\" để xem lỗi từng dòng, sửa rồi nhập lại file đó."
]

const columnTextTypes = ["id", "text", "select", "multiSelect", "boolean", "category", "image", "images", "html"]

// ===== Danh mục =====

// Lấy danh sách danh mục (chưa xoá) kèm đường dẫn đầy đủ, sắp xếp theo đường dẫn
export const getProductExcelCategoryList = async (): Promise<ProductExcelCategory[]> => {
  const allCategory = await CategoryProduct.find({
    deleted: false
  })

  const getPath = (category: any, depth: number = 0): string => {
    const parent = allCategory.find(item => item.id == category.parent)
    // depth: tránh lặp vô hạn nếu dữ liệu danh mục cha bị vòng lặp
    if(!parent || depth > 20){
      return category.name
    }
    return `${getPath(parent, depth + 1)} > ${category.name}`
  }

  return allCategory
    .map(category => ({
      id: category.id,
      name: category.name || "",
      nameRu: category.nameRu || "",
      path: getPath(category),
      status: category.status || "active"
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "vi"))
}

// ===== Tạo file Excel =====

// Lấy giá trị 1 ô khi xuất sản phẩm ra file Excel
export const getProductExcelValue = (column: ProductExcelColumn, product: any, categoryList: ProductExcelCategory[]) => {
  const value = product[column.key]

  switch (column.type) {
    case "id":
      return product.id
    case "number":
    case "integer":
      return typeof value === "number" ? value : null
    case "select":
      return column.list?.find(item => item.id === value)?.name || value || ""
    case "multiSelect":
      return (value || [])
        .map((id: string) => column.list?.find(item => item.id === id)?.name || id)
        .join(multipleJoin)
    case "boolean":
      return value ? "Có" : "Không"
    case "category":
      // Danh mục đang ở thùng rác không xuất ra (khi nhập lại vẫn được giữ nguyên)
      return categoryList
        .filter(category => (value || []).includes(category.id))
        .map(category => category.path)
        .join(multipleJoin)
    case "images":
      return (value || []).join(multipleJoin)
    default:
      return value || ""
  }
}

// Tạo file Excel sản phẩm
// - columns: các cột có trong file
// - rows: giá trị các ô của từng dòng (theo thứ tự columns), để trống khi tạo file mẫu
// - errorList: lỗi của từng dòng (dùng cho file lỗi), có thì thêm cột "Lỗi" ở đầu
export const buildProductWorkbook = (options: {
  columns: ProductExcelColumn[],
  rows?: any[][],
  errorList?: string[],
  categoryList: ProductExcelCategory[]
}) => {
  const { columns, categoryList } = options
  const rows = options.rows || []
  const hasError = !!options.errorList

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "SFoodie"
  workbook.created = new Date()

  // Cố định dòng tiêu đề và các cột đến cột "Tên sản phẩm" khi cuộn
  const nameIndex = columns.findIndex(column => column.key === "name")
  const sheet = workbook.addWorksheet(productSheetName, {
    views: [{
      state: "frozen",
      xSplit: nameIndex >= 0 ? nameIndex + 1 + (hasError ? 1 : 0) : 0,
      ySplit: headerRowNumber
    }]
  })
  const offset = hasError ? 1 : 0 // cột "Lỗi" đứng đầu

  // Cột chữ để định dạng Text, để Excel không tự đổi mã vạch, mã SKU thành số (mất số 0 ở đầu, hiện dạng 8,93E+12)
  sheet.columns = [
    ...(hasError ? [{ key: "error", width: 50 }] : []),
    ...columns.map(column => ({
      key: column.key,
      width: column.width,
      style: columnTextTypes.includes(column.type) ? { numFmt: "@" } : {}
    }))
  ]

  // Dòng 1: tên nhóm cột, gộp ô các cột cùng nhóm
  const groupRow = sheet.getRow(1)
  const headerRow = sheet.getRow(headerRowNumber)
  if(hasError){
    groupRow.getCell(1).value = "Lỗi"
    headerRow.getCell(1).value = "Lỗi"
    for (const row of [groupRow, headerRow]) {
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC00000" } }
      row.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
    }
    headerRow.getCell(1).note = "Lỗi của dòng. Sửa xong thì nhập lại file này, cột Lỗi sẽ được bỏ qua."
  }

  let start = 0
  columns.forEach((column, index) => {
    const isLastOfGroup = index === columns.length - 1 || columns[index + 1].group !== column.group
    if(!isLastOfGroup){
      return
    }

    const group = productExcelGroupList.find(item => item.id === column.group)
    if(index > start){
      sheet.mergeCells(1, start + 1 + offset, 1, index + 1 + offset)
    }
    const cell = groupRow.getCell(start + 1 + offset)
    cell.value = group?.name
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: group?.color } }
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    start = index + 1
  })

  // Dòng 2: tên cột, di chuột vào để xem hướng dẫn
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1 + offset)
    cell.value = column.header + (column.required ? " *" : "")
    cell.note = column.note + (column.example ? `\nVí dụ: ${column.example}` : "")
    cell.font = { bold: true, color: { argb: column.required ? "FFC00000" : "FF000000" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }
  })
  headerRow.height = 42
  headerRow.alignment = { wrapText: true, vertical: "middle", horizontal: "center" }

  // Từ dòng 3: dữ liệu sản phẩm
  rows.forEach((values, rowIndex) => {
    const row = sheet.addRow(hasError ? [options.errorList?.[rowIndex] || "", ...values] : values)

    if(hasError){
      row.getCell(1).font = { color: { argb: "FFC00000" } }
      row.getCell(1).alignment = { wrapText: true, vertical: "top" }
    }

    // Excel không chứa được ô quá dài, để trống ô đó (khi nhập lại, ô trống = giữ nguyên giá trị cũ)
    row.eachCell(cell => {
      if(typeof cell.value === "string" && cell.value.length > excelCellMaxLength){
        cell.value = ""
        cell.note = "Nội dung quá dài so với giới hạn 1 ô Excel nên không xuất ra. Để trống ô này thì khi nhập lại nội dung được giữ nguyên."
      }
    })
  })

  // Sheet "Danh mục": danh sách danh mục để chọn ở cột Danh mục
  const categorySheet = workbook.addWorksheet(categorySheetName)
  categorySheet.columns = [
    { header: "Danh mục (đường dẫn đầy đủ)", key: "path", width: 50 },
    { header: "Tên danh mục", key: "name", width: 30 },
    { header: "Tên tiếng Nga", key: "nameRu", width: 30 },
    { header: "Trạng thái", key: "status", width: 14 },
    { header: "ID", key: "id", width: 27 }
  ]
  categorySheet.getRow(1).font = { bold: true }
  categoryList.forEach(category => {
    categorySheet.addRow({
      ...category,
      status: category.status === "active" ? "Hoạt động" : "Tạm dừng"
    })
  })

  // Sheet ẩn chứa các danh sách thả xuống (mỗi danh sách 1 cột)
  const listSheet = workbook.addWorksheet(listSheetName, { state: "hidden" })
  const listRangeList: { list: Option[], range: string }[] = []
  const getListRange = (list: Option[]) => {
    let listRange = listRangeList.find(item => item.list === list)
    if(!listRange){
      const listColumn = listSheet.getColumn(listRangeList.length + 1)
      listColumn.values = ["", ...list.map(item => item.name)]
      listRange = {
        list: list,
        range: `${listSheetName}!$${listColumn.letter}$2:$${listColumn.letter}$${list.length + 1}`
      }
      listRangeList.push(listRange)
    }
    return listRange.range
  }

  // Danh sách thả xuống ở các cột chọn
  // errorStyle "warning": nhập giá trị ngoài danh sách thì chỉ cảnh báo (vẫn cho nhập mã, ví dụ VN, hoặc nhiều giá trị cách nhau bằng dấu ;)
  const lastRowNumber = headerRowNumber + Math.max(productImportMaxRows, rows.length)
  columns.forEach((column, index) => {
    let formula = ""
    if(column.type === "select" || column.type === "multiSelect"){
      formula = getListRange(column.list || [])
    }
    else if(column.type === "boolean"){
      formula = getListRange(booleanList)
    }
    else if(column.type === "category" && categoryList.length > 0){
      formula = `'${categorySheetName}'!$A$2:$A$${categoryList.length + 1}`
    }

    if(!formula){
      return
    }

    const letter = sheet.getColumn(index + 1 + offset).letter;
    // ExcelJS có hỗ trợ thêm danh sách thả xuống cho cả vùng ô nhưng chưa khai báo kiểu TypeScript
    (sheet as any).dataValidations.add(`${letter}${firstDataRowNumber}:${letter}${lastRowNumber}`, {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: column.header,
      error: column.type === "select" ? "Giá trị không có trong danh sách." : "Giá trị không có trong danh sách. Nếu chọn nhiều giá trị (cách nhau bằng dấu ;) thì bấm Yes để tiếp tục."
    })
  })

  // Sheet "Hướng dẫn"
  const guideSheet = workbook.addWorksheet(guideSheetName)
  guideSheet.columns = [
    { key: "header", width: 28 },
    { key: "group", width: 20 },
    { key: "required", width: 12 },
    { key: "note", width: 80 },
    { key: "example", width: 40 }
  ]
  guideSheet.addRow(["HƯỚNG DẪN NHẬP SẢN PHẨM BẰNG FILE EXCEL"]).font = { bold: true, size: 14 }
  guideRuleList.forEach((rule, index) => {
    const row = guideSheet.addRow([`${index + 1}. ${rule}`])
    guideSheet.mergeCells(row.number, 1, row.number, 5)
    row.alignment = { wrapText: true, vertical: "top" }
    row.height = 30
  })
  guideSheet.addRow([])
  const guideHeaderRow = guideSheet.addRow(["Cột", "Nhóm", "Bắt buộc khi thêm mới", "Hướng dẫn", "Ví dụ"])
  guideHeaderRow.font = { bold: true }
  guideHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } }
  productExcelColumnList.forEach(column => {
    const row = guideSheet.addRow([
      column.header,
      productExcelGroupList.find(group => group.id === column.group)?.name,
      column.required ? "Có" : "",
      column.note,
      column.example || ""
    ])
    row.alignment = { wrapText: true, vertical: "top" }
  })

  return workbook
}

// Gửi file Excel về trình duyệt để tải xuống
export const sendWorkbook = async (res: Response, workbook: ExcelJS.Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  res.attachment(fileName)
  res.send(Buffer.from(buffer))
}

// ===== Đọc file nhập =====

// Chuẩn hoá tên cột để so sánh: chữ thường, bỏ dấu *, bỏ phần trong ngoặc, ví dụ "Giá bán (₽) *" => "giá bán"
const normalizeHeader = (text: string) => {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Tìm cột theo tên cột trong file (được ghi tên trường, ví dụ "price")
const findColumnByHeader = (header: string) => {
  const text = normalizeHeader(header)
  if(!text){
    return undefined
  }
  return productExcelColumnList.find(column => normalizeHeader(column.header) === text || column.key.toLowerCase() === text)
}

// Lấy giá trị thật của 1 ô (ô công thức lấy kết quả, ô chữ có định dạng lấy phần chữ, ô link lấy chữ hiển thị)
// Trả về chuỗi (đã bỏ khoảng trắng 2 đầu), số, true/false hoặc ngày; ô trống trả về ""
export const getCellValue = (value: any): any => {
  if(value === null || value === undefined){
    return ""
  }

  if(typeof value === "string"){
    return value.trim()
  }

  if(typeof value !== "object" || value instanceof Date){
    return value
  }

  if(value.richText){
    return value.richText.map((item: any) => item.text).join("").trim()
  }

  if(value.formula !== undefined || value.sharedFormula !== undefined){
    return getCellValue(value.result)
  }

  if(value.hyperlink !== undefined){
    return getCellValue(value.text) || value.hyperlink
  }

  if(value.error){
    return value.error // ví dụ "#N/A", báo lỗi khi kiểm tra từng ô
  }

  return ""
}

// Đọc file Excel người dùng tải lên
// - columns: các cột nhận dạng được (theo thứ tự trong file)
// - ignoredHeaders: tên các cột không nhận dạng được (bị bỏ qua)
// - rows: các dòng có dữ liệu, values: giá trị các ô theo thứ tự columns
export const readProductWorkbook = async (buffer: Buffer) => {
  const workbook = new ExcelJS.Workbook()
  try {
    // Bỏ qua danh sách thả xuống, định dạng có điều kiện khi đọc (không cần dùng)
    // ExcelJS tách danh sách thả xuống của cả cột thành từng ô, file áp dụng cho cả cột (hơn 1 triệu ô) làm server tốn rất nhiều RAM
    await workbook.xlsx.load(buffer as any, {
      ignoreNodes: ["dataValidations", "conditionalFormatting", "extLst"]
    })
  } catch (error) {
    throw new ProductExcelError("Không đọc được file. Vui lòng dùng file Excel .xlsx (nếu file là .xls hoặc .csv, hãy mở bằng Excel rồi chọn Lưu thành .xlsx).")
  }

  // Lấy sheet "Sản phẩm", không có thì lấy sheet đầu tiên đang hiện
  const sheet = workbook.getWorksheet(productSheetName)
    || workbook.worksheets.find(item => item.state === "visible")
  if(!sheet){
    throw new ProductExcelError("File không có sheet nào.")
  }

  // Tìm dòng tiêu đề trong 10 dòng đầu: dòng có nhiều tên cột khớp nhất
  let headerRow = 0
  let columnIndexList: { index: number, column: ProductExcelColumn }[] = []
  let ignoredHeaders: string[] = []
  for (let rowNumber = 1; rowNumber <= Math.min(10, sheet.rowCount); rowNumber++) {
    const indexList: { index: number, column: ProductExcelColumn }[] = []
    const ignoredList: string[] = []

    sheet.getRow(rowNumber).eachCell((cell, colNumber) => {
      const header = `${getCellValue(cell.value)}`
      const column = findColumnByHeader(header)
      if(column && !indexList.some(item => item.column.key === column.key)){
        indexList.push({ index: colNumber, column: column })
      }
      else if(header){
        ignoredList.push(header)
      }
    })

    if(indexList.length > columnIndexList.length){
      headerRow = rowNumber
      columnIndexList = indexList
      ignoredHeaders = ignoredList
    }
  }

  if(columnIndexList.length < 2){
    throw new ProductExcelError(`Không tìm thấy dòng tên cột trong sheet "${sheet.name}". Vui lòng tải file mẫu và nhập theo đúng tên cột.`)
  }

  const rows: { row: number, values: any[] }[] = []
  sheet.eachRow((row, rowNumber) => {
    if(rowNumber <= headerRow){
      return
    }

    const values = columnIndexList.map(item => getCellValue(row.getCell(item.index).value))

    // Bỏ qua dòng trống
    if(values.every(value => value === "")){
      return
    }

    rows.push({
      row: rowNumber,
      values: values
    })
  })

  if(rows.length === 0){
    throw new ProductExcelError("File chưa có dòng sản phẩm nào.")
  }

  if(rows.length > productImportMaxRows){
    throw new ProductExcelError(`File có ${rows.length} dòng sản phẩm, vượt quá giới hạn ${productImportMaxRows} dòng mỗi lần nhập. Vui lòng chia nhỏ file.`)
  }

  return {
    columns: columnIndexList.map(item => item.column),
    ignoredHeaders: ignoredHeaders,
    rows: rows
  }
}

// ===== Đọc giá trị từng ô =====

// Chuẩn hoá chữ để so sánh: chữ thường, gộp khoảng trắng
const normalizeText = (text: string) => text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim()

// Tìm lựa chọn theo mã (VN), tên (Việt Nam) hoặc tên ngắn - bỏ phần trong ngoặc (ví dụ "Cá" của "Cá (kể cả nước mắm, mắm cá)")
const findOption = (list: Option[], text: string) => {
  const value = normalizeText(text)
  return list.find(item => item.id.toLowerCase() === value)
    || list.find(item => normalizeText(item.name) === value)
    || list.find(item => normalizeText(item.name.replace(/\s*\(.*\)\s*$/, "")) === value)
}

// Đổi chữ thành số, chấp nhận các kiểu viết: 1250.5, 1250,5, 1 250,5 (kiểu Nga), 1.250,5 (kiểu Việt), 1,250.5 (kiểu Mỹ), 45 ₽
const parseNumber = (value: any) => {
  if(typeof value === "number"){
    return value
  }

  let text = `${value}`.replace(/[\s ₽]/g, "").replace(/руб\.?$|rub$/i, "")
  const lastDot = text.lastIndexOf(".")
  const lastComma = text.lastIndexOf(",")
  if(lastDot >= 0 && lastComma >= 0){
    // Có cả dấu chấm và dấu phẩy: dấu đứng sau là dấu thập phân
    const decimal = lastDot > lastComma ? "." : ","
    const thousand = decimal === "." ? "," : "."
    text = text.split(thousand).join("").replace(decimal, ".")
  }
  else if(lastComma >= 0){
    text = text.replace(",", ".")
  }
  else if(text.split(".").length > 2){
    // Nhiều dấu chấm (1.250.000): dấu phân cách hàng nghìn
    text = text.split(".").join("")
  }

  if(!/^-?\d+(\.\d+)?$/.test(text)){
    return NaN
  }
  return Number(text)
}

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Tách ô nhiều giá trị (cách nhau bằng dấu ; hoặc xuống dòng), bỏ giá trị trống và trùng
const splitMultiple = (value: any) => {
  return [...new Set(`${value}`.split(multipleSeparator).map(item => item.trim()).filter(item => item))]
}

// Đường dẫn ảnh: đường dẫn trong Quản lý file (/media/...) hoặc link ảnh trên mạng (http(s)://...)
// Link của chính server Quản lý file thì đổi về đường dẫn /media/... giống khi chọn ảnh ở form sản phẩm
export const isExternalImageLink = (link: string) => /^https?:\/\//i.test(link)

const parseImageLink = (text: string) => {
  let link = text.trim()

  if(link.toLowerCase().startsWith(domainFileManager.toLowerCase())){
    link = link.slice(domainFileManager.length)
    try {
      link = decodeURIComponent(link) // link copy từ trình duyệt bị mã hoá dấu cách thành %20
    } catch (error) {}
  }

  if(link.startsWith("media/")){
    link = `/${link}`
  }

  if(link.startsWith("/media/") || isExternalImageLink(link)){
    return link
  }

  return undefined
}

// Đọc giá trị 1 ô theo kiểu của cột
// Trả về:
// - {}: ô trống (thêm mới: không nhập, cập nhật: giữ nguyên giá trị cũ)
// - { value }: giá trị đã chuẩn hoá để lưu vào database (ô có dấu - thì là giá trị rỗng để xoá giá trị cũ)
// - { error }: ô không hợp lệ
export const parseProductExcelCell = (
  column: ProductExcelColumn,
  rawValue: any,
  categoryList: ProductExcelCategory[]
): { value?: any, error?: string } => {
  if(rawValue === ""){
    return {}
  }

  const text = rawValue instanceof Date ? rawValue.toISOString().slice(0, 10) : `${rawValue}`.trim()

  // Ô lỗi công thức của Excel
  if(/^#(N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|NULL!)$/.test(text)){
    return { error: `${column.header}: ô bị lỗi công thức (${text})` }
  }

  // Dấu - : xoá giá trị cũ
  if(text === productExcelClearValue){
    switch (column.type) {
      case "id":
        return {}
      case "number":
      case "integer":
        return { value: null }
      case "multiSelect":
      case "category":
      case "images":
        return { value: [] }
      case "boolean":
        return { value: false }
      default:
        return { value: "" }
    }
  }

  switch (column.type) {
    case "id": {
      if(!/^[0-9a-fA-F]{24}$/.test(text) || !mongoose.isValidObjectId(text)){
        return { error: `ID sản phẩm "${text}" không hợp lệ` }
      }
      return { value: text.toLowerCase() }
    }

    case "number":
    case "integer": {
      const number = parseNumber(rawValue)
      if(!Number.isFinite(number)){
        return { error: `${column.header} phải là số (đang nhập "${text}")` }
      }
      if(number < 0){
        return { error: `${column.header} không được nhỏ hơn 0` }
      }
      if(column.type === "integer" && !Number.isInteger(number)){
        return { error: `${column.header} phải là số nguyên` }
      }
      return { value: number }
    }

    case "select": {
      const option = findOption(column.list || [], text)
      if(!option){
        return { error: `${column.header} "${text}" không có trong danh sách` }
      }
      return { value: option.id }
    }

    case "multiSelect": {
      const idList: string[] = []
      const invalidList: string[] = []
      splitMultiple(text).forEach(item => {
        const option = findOption(column.list || [], item)
        if(option){
          idList.push(option.id)
        }
        else{
          invalidList.push(`"${item}"`)
        }
      })
      if(invalidList.length > 0){
        return { error: `${column.header} không có trong danh sách: ${invalidList.join(", ")}` }
      }
      return { value: [...new Set(idList)] }
    }

    case "boolean": {
      if(typeof rawValue === "boolean"){
        return { value: rawValue }
      }
      const value = normalizeText(text)
      if(["có", "co", "yes", "y", "true", "1", "x", "да"].includes(value)){
        return { value: true }
      }
      if(["không", "khong", "no", "n", "false", "0", "нет"].includes(value)){
        return { value: false }
      }
      return { error: `${column.header} chỉ nhập "Có" hoặc "Không" (đang nhập "${text}")` }
    }

    case "category": {
      // Tìm theo ID, đường dẫn đầy đủ (Cha > Con) hoặc tên danh mục (nếu tên không bị trùng)
      const idList: string[] = []
      const errorList: string[] = []
      splitMultiple(text).forEach(item => {
        const value = normalizeText(item.split(">").map(part => part.trim()).join(" > "))
        let category = categoryList.find(category => category.id === item || normalizeText(category.path) === value)
        if(!category){
          const sameNameList = categoryList.filter(category => normalizeText(category.name) === value)
          if(sameNameList.length > 1){
            errorList.push(`Có ${sameNameList.length} danh mục cùng tên "${item}", vui lòng ghi đường dẫn đầy đủ (ví dụ: ${sameNameList[0].path})`)
            return
          }
          category = sameNameList[0]
        }
        if(!category){
          errorList.push(`Không tìm thấy danh mục "${item}"`)
          return
        }
        idList.push(category.id)
      })
      if(errorList.length > 0){
        return { error: errorList.join(". ") }
      }
      return { value: [...new Set(idList)] }
    }

    case "image":
    case "images": {
      const linkList: string[] = []
      const invalidList: string[] = []
      const textList = column.type === "image" ? [text] : splitMultiple(text)
      textList.forEach(item => {
        const link = parseImageLink(item)
        if(link){
          linkList.push(link)
        }
        else{
          invalidList.push(`"${item}"`)
        }
      })
      if(invalidList.length > 0){
        return { error: `${column.header}: link ảnh không hợp lệ ${invalidList.join(", ")} (phải là đường dẫn /media/... copy ở trang Quản lý file hoặc link http(s)://...)` }
      }
      return { value: column.type === "image" ? linkList[0] : [...new Set(linkList)] }
    }

    case "html": {
      // Có thẻ HTML thì giữ nguyên, văn bản thường thì mỗi dòng thành 1 đoạn văn
      if(/<[a-z][\s\S]*>/i.test(text)){
        return { value: text }
      }
      return {
        value: text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line)
          .map(line => `<p>${escapeHtml(line)}</p>`)
          .join("")
      }
    }

    default: {
      if(column.max && text.length > column.max){
        return { error: `${column.header} không được vượt quá ${column.max} ký tự (đang có ${text.length} ký tự)` }
      }

      if(column.key === "barcode" && !/^\d{8,14}$/.test(text)){
        return { error: `Mã vạch "${text}" không hợp lệ, chỉ gồm 8 đến 14 chữ số (EAN-8, EAN-13, ITF-14)` }
      }

      if(column.key === "slug"){
        const slug = slugify(text, {
          lower: true,
          strict: true
        })
        if(!slug){
          return { error: `Đường dẫn "${text}" không hợp lệ` }
        }
        return { value: slug }
      }

      return { value: text }
    }
  }
}
