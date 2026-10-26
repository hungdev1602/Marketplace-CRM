import { NextFunction, Request, Response } from "express"
import Joi from "joi"
import {
  productAllergenList,
  productDietTagList,
  productNetWeightUnitList,
  productOriginList,
  productShelfLifeUnitList,
  productStorageList,
  productUnitList,
  productVatList
} from "../../config/variable.config"

// Thông báo lỗi tiếng Việt dùng chung, {{#label}} là tên trường (đặt bằng .label("..."))
const messages = {
  "number.base": "{{#label}} phải là số!",
  "number.min": "{{#label}} không được nhỏ hơn {{#limit}}!",
  "number.max": "{{#label}} không được lớn hơn {{#limit}}!",
  "number.integer": "{{#label}} phải là số nguyên!",
  "string.max": "{{#label}} không được vượt quá {{#limit}} ký tự!",
  "any.only": "{{#label}} không hợp lệ!",
  "any.invalid": "{{#label}} không hợp lệ!",
  "boolean.base": "{{#label}} không hợp lệ!"
}

// Số không âm, được để trống
const optionalNumber = (label: string) => Joi.number().min(0).allow("").label(label)

// Chỉ được chọn giá trị có trong danh sách (config/variable.config.ts), được để trống
const optionalSelect = (label: string, list: { id: string }[]) => {
  return Joi.string().valid(...list.map(item => item.id)).allow("").label(label)
}

// Mảng gửi lên dạng chuỗi JSON (ví dụ: '["gluten","soy"]'), list: chỉ được chọn giá trị có trong danh sách
const jsonArray = (label: string, list?: { id: string }[]) => {
  return Joi.string().allow("").label(label).custom((value, helpers) => {
    if(value === ""){
      return value
    }

    let array: any
    try {
      array = JSON.parse(value)
    } catch (error) {
      return helpers.error("any.invalid")
    }

    if(!Array.isArray(array) || array.some(item => typeof item !== "string")){
      return helpers.error("any.invalid")
    }

    if(list && array.some(item => !list.some(option => option.id === item))){
      return helpers.error("any.invalid")
    }

    return value
  })
}

const sendError = (res: Response, error: Joi.ValidationError) => {
  res.json({
    code: "error",
    message: error.details[0].message
  })
}

export const categoryCreatePost = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string()
      .required()
      .messages({
        "string.empty": "Vui lòng nhập tên danh mục!"
      }),
    nameRu: Joi.string().allow(""),
    slug: Joi.string()
      .required()
      .messages({
        "string.empty": "Vui lòng nhập đường dẫn!"
      }),
    avatar: Joi.string().allow(""),
    parent: Joi.string().allow(""),
    description: Joi.string().allow(""),
    position: Joi.number().integer().min(0).allow("").label("Vị trí"),
    status: Joi.string().valid("active", "inactive").label("Trạng thái"),
    metaTitle: Joi.string().max(70).allow("").label("Tiêu đề SEO"),
    metaDescription: Joi.string().max(200).allow("").label("Mô tả SEO")
  }).messages(messages)

  const { error } = schema.validate(req.body, { errors: { wrap: { label: false } } })

  if(error){
    sendError(res, error)
    return
  }

  next()
}

export const createPost = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    // Thông tin cơ bản
    name: Joi.string()
      .required()
      .messages({
        "string.empty": "Vui lòng nhập tên sản phẩm!"
      }),
    nameRu: Joi.string().allow(""),
    slug: Joi.string()
      .required()
      .messages({
        "string.empty": "Vui lòng nhập đường dẫn!"
      }),
    sku: Joi.string().max(50).allow("").label("Mã sản phẩm (SKU)"),
    barcode: Joi.string()
      .pattern(/^\d{8,14}$/)
      .allow("")
      .messages({
        "string.pattern.base": "Mã vạch chỉ gồm 8 đến 14 chữ số (EAN-8, EAN-13, ITF-14)!"
      }),
    category: jsonArray("Danh mục"),
    brand: Joi.string().allow(""),
    origin: optionalSelect("Xuất xứ", productOriginList),
    manufacturer: Joi.string().allow(""),
    importer: Joi.string().allow(""),
    dietTags: jsonArray("Đặc điểm", productDietTagList),

    // Giá & kho hàng
    price: Joi.number()
      .min(0)
      .required()
      .label("Giá bán")
      .messages({
        "number.base": "Vui lòng nhập giá bán (là số)!",
        "any.required": "Vui lòng nhập giá bán!"
      }),
    priceOld: optionalNumber("Giá trước khuyến mãi"),
    costPrice: optionalNumber("Giá nhập"),
    vat: optionalSelect("Thuế VAT", productVatList),
    unit: optionalSelect("Đơn vị bán", productUnitList),
    stock: Joi.number().integer().min(0).allow("").label("Tồn kho"),

    // Thông tin thực phẩm
    netWeight: optionalNumber("Khối lượng tịnh"),
    netWeightUnit: optionalSelect("Đơn vị khối lượng tịnh", productNetWeightUnitList),
    ingredients: Joi.string().allow(""),
    allergens: jsonArray("Chất gây dị ứng", productAllergenList),
    calories: optionalNumber("Năng lượng"),
    protein: optionalNumber("Chất đạm"),
    fat: optionalNumber("Chất béo"),
    carbohydrate: optionalNumber("Carbohydrate"),
    storageType: optionalSelect("Điều kiện bảo quản", productStorageList),
    storageNote: Joi.string().allow(""),
    shelfLife: Joi.number().integer().min(0).allow("").label("Hạn sử dụng"),
    shelfLifeUnit: optionalSelect("Đơn vị hạn sử dụng", productShelfLifeUnitList),
    usageInstructions: Joi.string().allow(""),

    // Pháp lý tại Nga
    certificateNumber: Joi.string().allow(""),
    markingRequired: Joi.boolean().label("Mã Честный знак"),

    // Vận chuyển
    grossWeight: optionalNumber("Khối lượng cả bao bì"),
    packageLength: optionalNumber("Chiều dài"),
    packageWidth: optionalNumber("Chiều rộng"),
    packageHeight: optionalNumber("Chiều cao"),

    // Hình ảnh & mô tả
    avatar: Joi.string().allow(""),
    images: jsonArray("Album ảnh"),
    description: Joi.string().allow(""),
    content: Joi.string().allow(""),

    // Hiển thị
    status: Joi.string().valid("active", "inactive").label("Trạng thái"),
    featured: Joi.boolean().label("Sản phẩm nổi bật"),
    newArrival: Joi.boolean().label("Hàng mới về"),
    position: Joi.number().integer().min(0).allow("").label("Vị trí"),
    metaTitle: Joi.string().max(70).allow("").label("Tiêu đề SEO"),
    metaDescription: Joi.string().max(200).allow("").label("Mô tả SEO")
  }).messages(messages)

  const { error } = schema.validate(req.body, { errors: { wrap: { label: false } } })

  if(error){
    sendError(res, error)
    return
  }

  // Giá bán phải cao hơn giá nhập (giá vốn)
  if(req.body.costPrice !== "" && Number(req.body.price) <= Number(req.body.costPrice)){
    res.json({
      code: "error",
      message: "Giá bán phải cao hơn giá nhập (giá vốn)!"
    })
    return
  }

  // Giá trước khuyến mãi (hiện gạch ngang) phải cao hơn giá bán
  if(req.body.priceOld !== "" && Number(req.body.priceOld) <= Number(req.body.price)){
    res.json({
      code: "error",
      message: "Giá trước khuyến mãi phải cao hơn giá bán (để trống nếu không giảm giá)!"
    })
    return
  }

  next()
}
