import { NextFunction, Request, Response } from "express"
import Joi from "joi"

// Kiểm tra dữ liệu form tài khoản khách (đăng ký, đăng nhập, sửa thông tin, đổi mật khẩu, quên mật khẩu)
// Lời báo lỗi là key từ ngữ trong locales (ru.ts, vi.ts), dịch theo ngôn ngữ khách đang chọn
// Trả về JSON { code: "error", message, field } (field: ô bị lỗi, main.js tô đỏ ô đó)

const fullNameSchema = Joi.string().trim().min(2).max(60).required().messages({
  "string.empty": "nameRequired",
  "any.required": "nameRequired",
  "string.min": "nameLength",
  "string.max": "nameLength"
})

// Không kiểm tra đuôi tên miền (tlds) để email tên miền .рф, .ru,... đều hợp lệ
const emailSchema = Joi.string().trim().lowercase().max(100).email({ tlds: { allow: false } }).required().messages({
  "string.empty": "emailRequired",
  "any.required": "emailRequired",
  "string.email": "emailInvalid",
  "string.max": "emailInvalid"
})

// Không bắt buộc, ví dụ: +7 999 123-45-67, 89991234567
const phoneSchema = Joi.string().trim().allow("").max(20).pattern(/^\+?[0-9\s\-()]{10,20}$/).messages({
  "string.pattern.base": "phoneInvalid",
  "string.max": "phoneInvalid"
})

// Mật khẩu mới: 8 - 72 ký tự (bcrypt chỉ dùng 72 byte đầu), có cả chữ và số
const newPasswordSchema = Joi.string().min(8).max(72).pattern(/\p{L}/u).pattern(/[0-9]/).required().messages({
  "string.empty": "passwordRequired",
  "any.required": "passwordRequired",
  "string.min": "passwordRule",
  "string.max": "passwordRule",
  "string.pattern.base": "passwordRule"
})

const confirmPasswordSchema = (field: string) => Joi.any().valid(Joi.ref(field)).required().messages({
  "any.only": "passwordMismatch",
  "any.required": "passwordMismatch"
})

// Kiểm tra req.body theo schema, hợp lệ thì thay req.body bằng dữ liệu đã chuẩn hoá (bỏ khoảng trắng, email chữ thường)
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

export const registerPost = validate(Joi.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: newPasswordSchema,
  confirmPassword: confirmPasswordSchema("password"),
  // Đồng ý xử lý dữ liệu cá nhân (bắt buộc theo luật 152-ФЗ của Nga)
  agree: Joi.string().valid("on").required().messages({
    "any.only": "agreeRequired",
    "any.required": "agreeRequired",
    "string.empty": "agreeRequired"
  }),
  next: Joi.string().allow("")
}))

export const loginPost = validate(Joi.object({
  email: emailSchema,
  password: Joi.string().max(200).required().messages({
    "string.empty": "passwordRequired",
    "any.required": "passwordRequired",
    "string.max": "loginFailed"
  }),
  remember: Joi.string().allow(""),
  next: Joi.string().allow("")
}))

export const profilePatch = validate(Joi.object({
  fullName: fullNameSchema,
  phone: phoneSchema
}))

// Mật khẩu hiện tại để trống được: tài khoản tạo bằng Google chưa có mật khẩu thì đặt mật khẩu mới luôn
// (tài khoản đã có mật khẩu thì controller bắt buộc nhập)
export const passwordPatch = validate(Joi.object({
  currentPassword: Joi.string().max(200).allow("").messages({
    "string.max": "currentPasswordWrong"
  }),
  password: newPasswordSchema,
  confirmPassword: confirmPasswordSchema("password")
}))

// Quên mật khẩu: POST /account/forgot-password { email }
export const forgotPasswordPost = validate(Joi.object({
  email: emailSchema
}))

// Đặt lại mật khẩu: POST /account/reset-password { token, password, confirmPassword }
// token: mã trong link email (64 ký tự 0-9, a-f), sai định dạng thì báo link không hợp lệ
export const resetPasswordPost = validate(Joi.object({
  token: Joi.string().pattern(/^[a-f0-9]{64}$/).required().messages({
    "string.empty": "resetLinkInvalid",
    "any.required": "resetLinkInvalid",
    "string.pattern.base": "resetLinkInvalid"
  }),
  password: newPasswordSchema,
  confirmPassword: confirmPasswordSchema("password")
}))
