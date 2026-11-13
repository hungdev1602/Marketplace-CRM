import { NextFunction, Request, Response } from "express"
import Joi from "joi"
import multer from "multer"
import { reviewMaxPhotos, reviewPhotoMaxSize, reviewTextMaxLength } from "../../config/variable.config"

// Kiểm tra dữ liệu form viết đánh giá (/review/write/...)
// Form gửi dạng multipart/form-data (có ảnh), main.js gửi bằng fetch, trả về JSON { code, message, field }
// Lời báo lỗi là key từ ngữ trong locales (ru.ts, vi.ts), dịch theo ngôn ngữ khách đang chọn

// Nhận ảnh khách gửi lên (giữ trong bộ nhớ, kiểm tra xong mới gửi sang server Quản lý file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: reviewPhotoMaxSize * 1024 * 1024,
    files: reviewMaxPhotos,
    fields: 20,
    fieldSize: 64 * 1024
  }
}).array("photos", reviewMaxPhotos)

export const uploadPhotos = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (error: any) => {
    if(error){
      let message = res.locals.t("errorGeneral")
      if(error.code === "LIMIT_FILE_SIZE"){
        message = res.locals.t("reviewPhotoTooLarge").replace("{size}", `${reviewPhotoMaxSize}`)
      }
      else if(error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"){
        message = res.locals.t("reviewPhotoTooMany").replace("{count}", `${reviewMaxPhotos}`)
      }
      res.json({ code: "error", message: message })
      return
    }
    next()
  })
}

const textSchema = (maxLength: number) => Joi.string().allow("").max(maxLength).messages({
  "string.max": "reviewTextTooLong",
  "string.base": "reviewTextTooLong"
})

const reviewSchema = Joi.object({
  key: Joi.string().allow("").max(64),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "reviewRatingRequired",
    "number.integer": "reviewRatingRequired",
    "number.min": "reviewRatingRequired",
    "number.max": "reviewRatingRequired",
    "any.required": "reviewRatingRequired"
  }),
  pros: textSchema(reviewTextMaxLength.pros),
  cons: textSchema(reviewTextMaxLength.cons),
  comment: textSchema(reviewTextMaxLength.comment),
  anonymous: Joi.string().valid("1", "0", "on", "").default(""),
  keepPhotos: Joi.string().allow("").max(10000) // ảnh cũ khách giữ lại khi sửa (chuỗi JSON danh sách đường dẫn)
})

export const writePost = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = reviewSchema.validate(req.body || {}, { stripUnknown: true })

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
