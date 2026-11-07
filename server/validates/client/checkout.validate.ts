import { NextFunction, Request, Response } from "express"
import Joi from "joi"

// Kiểm tra dữ liệu trang đặt hàng (/checkout)
// Lời báo lỗi là key từ ngữ trong locales (ru.ts, vi.ts), dịch theo ngôn ngữ khách đang chọn
// Trả về JSON { code: "error", message, field } (field: ô bị lỗi, main.js tô đỏ ô đó)

const deliveryTypeSchema = Joi.string().valid("courier", "point").required().messages({
  "any.only": "deliveryTypeRequired",
  "any.required": "deliveryTypeRequired",
  "string.empty": "deliveryTypeRequired"
})

const citySchema = Joi.string().trim().min(2).max(100).required().messages({
  "string.empty": "cityRequired",
  "any.required": "cityRequired",
  "string.min": "cityRequired",
  "string.max": "cityRequired"
})

const regionSchema = Joi.string().trim().allow("").max(100)

// Giao tận cửa: bắt buộc mã bưu chính (6 chữ số), đường, số nhà
const courierRequired = (schema: Joi.StringSchema) => Joi.when("deliveryType", {
  is: "courier",
  then: schema.required(),
  otherwise: Joi.string().allow("").strip()
})

const postIndexSchema = courierRequired(Joi.string().trim().pattern(/^\d{6}$/).messages({
  "string.empty": "postIndexRequired",
  "any.required": "postIndexRequired",
  "string.pattern.base": "postIndexInvalid"
}))

const streetSchema = courierRequired(Joi.string().trim().max(150).messages({
  "string.empty": "streetRequired",
  "any.required": "streetRequired",
  "string.max": "streetRequired"
}))

const houseSchema = courierRequired(Joi.string().trim().max(30).messages({
  "string.empty": "houseRequired",
  "any.required": "houseRequired",
  "string.max": "houseRequired"
}))

const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body || {}, { stripUnknown: true })

    if(error){
      res.json({
        code: "error",
        message: res.locals.t(error.details[0].message),
        field: error.details[0].path[0]
      })
      return
    }

    req.body = value
    next()
  }
}

// Tính phí giao hàng: POST /checkout/delivery
export const deliveryPost = validate(Joi.object({
  deliveryType: deliveryTypeSchema,
  city: citySchema,
  region: regionSchema,
  postIndex: postIndexSchema,
  street: streetSchema,
  house: houseSchema
}))

// Đặt hàng: POST /checkout
export const orderPost = validate(Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "nameRequired",
    "any.required": "nameRequired",
    "string.min": "nameLength",
    "string.max": "nameLength"
  }),
  phone: Joi.string().trim().max(20).pattern(/^\+?[0-9\s\-()]{10,20}$/).required().messages({
    "string.empty": "phoneRequired",
    "any.required": "phoneRequired",
    "string.pattern.base": "phoneInvalid",
    "string.max": "phoneInvalid"
  }),
  email: Joi.string().trim().lowercase().max(100).email({ tlds: { allow: false } }).required().messages({
    "string.empty": "emailRequired",
    "any.required": "emailRequired",
    "string.email": "emailInvalid",
    "string.max": "emailInvalid"
  }),
  deliveryType: deliveryTypeSchema,
  city: citySchema,
  region: regionSchema,
  postIndex: postIndexSchema,
  street: streetSchema,
  house: houseSchema,
  apartment: Joi.string().trim().allow("").max(30),
  comment: Joi.string().trim().allow("").max(500).messages({
    "string.max": "commentTooLong"
  }),
  // Kết quả tính phí giao hàng (id lưu tạm trong database) và tariff khách chọn
  quoteId: Joi.string().pattern(/^[a-f0-9]{24}$/).required().messages({
    "string.empty": "deliveryChoose",
    "any.required": "deliveryChoose",
    "string.pattern.base": "deliveryChoose"
  }),
  optionIndex: Joi.number().integer().min(0).max(500).required().messages({
    "number.base": "deliveryChoose",
    "any.required": "deliveryChoose"
  }),
  // Điểm nhận hàng (chỉ khi giao tới điểm nhận hàng)
  pointId: Joi.when("deliveryType", {
    is: "point",
    then: Joi.number().integer().min(1).required().messages({
      "number.base": "pointChoose",
      "any.required": "pointChoose"
    }),
    otherwise: Joi.any().strip()
  }),
  // Đồng ý xử lý dữ liệu cá nhân (luật 152-ФЗ) và điều kiện mua hàng
  agree: Joi.string().valid("on").required().messages({
    "any.only": "checkoutAgreeRequired",
    "any.required": "checkoutAgreeRequired",
    "string.empty": "checkoutAgreeRequired"
  })
}))
