import { NextFunction, Request, Response } from "express"
import Joi from "joi"
import { couponApplyToList, couponTypeList } from "../../config/variable.config"
import { isValidShopDateTime, parseShopDateTime } from "../../helpers/coupon.helper"
import { jsonArray, messages, optionalNumber, sendError } from "./product.validate"

// Ngày giờ từ ô chọn ngày giờ (dạng "2027-01-25T09:00")
const dateTime = (label: string) => {
  return Joi.string().allow("").label(label).custom((value, helpers) => {
    if(value !== "" && !isValidShopDateTime(value)){
      return helpers.error("any.invalid")
    }

    return value
  })
}

const sendErrorMessage = (res: Response, message: string) => {
  res.json({
    code: "error",
    message: message
  })
}

export const createPost = (req: Request, res: Response, next: NextFunction) => {
  // Mã luôn lưu chữ in hoa, khách nhập "tet2027" hay "TET2027" đều được
  if(typeof req.body.code === "string"){
    req.body.code = req.body.code.trim().toUpperCase()
  }

  const schema = Joi.object({
    code: Joi.string()
      .required()
      .pattern(/^[A-Z0-9_-]{3,30}$/)
      .messages({
        "string.empty": "Vui lòng nhập mã giảm giá!",
        "string.pattern.base": "Mã giảm giá gồm 3 đến 30 ký tự: chữ cái Latin không dấu (A-Z), chữ số, dấu - hoặc _ (không có khoảng trắng)!"
      }),
    name: Joi.string()
      .required()
      .max(200)
      .label("Tên chương trình")
      .messages({
        "string.empty": "Vui lòng nhập tên chương trình!"
      }),
    description: Joi.string().max(500).allow("").label("Mô tả cho khách"),

    // Mức giảm
    discountType: Joi.string()
      .required()
      .valid(...couponTypeList.map(item => item.id))
      .label("Loại giảm giá"),
    discountValue: optionalNumber("Mức giảm"),
    maxDiscount: Joi.number().min(1).allow("").label("Giảm tối đa"),

    // Điều kiện áp dụng
    minOrderValue: optionalNumber("Giá trị đơn hàng tối thiểu"),
    applyTo: Joi.string()
      .valid(...couponApplyToList.map(item => item.id))
      .label("Phạm vi áp dụng"),
    categories: jsonArray("Danh mục áp dụng"),
    products: jsonArray("Sản phẩm áp dụng"),

    // Giới hạn lượt dùng
    usageLimit: Joi.number().integer().min(1).allow("").label("Tổng số lượt dùng"),
    usageLimitPerCustomer: Joi.number().integer().min(1).allow("").label("Số lần mỗi khách được dùng"),

    // Thời gian áp dụng
    startAt: dateTime("Thời gian bắt đầu"),
    endAt: dateTime("Thời gian kết thúc"),

    status: Joi.string().valid("active", "inactive").label("Trạng thái")
  }).messages(messages)

  const { error } = schema.validate(req.body, { errors: { wrap: { label: false } } })

  if(error){
    sendError(res, error)
    return
  }

  const discountValue = Number(req.body.discountValue)

  // Giảm theo %: từ 1% đến 100%
  if(req.body.discountType === "percent"){
    if(req.body.discountValue === "" || req.body.discountValue === undefined){
      sendErrorMessage(res, "Vui lòng nhập số % giảm!")
      return
    }

    if(discountValue <= 0 || discountValue > 100){
      sendErrorMessage(res, "Số % giảm phải lớn hơn 0 và không quá 100!")
      return
    }
  }

  // Giảm số tiền cố định
  if(req.body.discountType === "fixed"){
    if(req.body.discountValue === "" || req.body.discountValue === undefined){
      sendErrorMessage(res, "Vui lòng nhập số tiền giảm!")
      return
    }

    if(discountValue <= 0){
      sendErrorMessage(res, "Số tiền giảm phải lớn hơn 0!")
      return
    }

    // Tránh nhầm lẫn tạo mã làm đơn hàng thành 0 ₽, ví dụ giảm 500 ₽ cho đơn từ 300 ₽
    if(req.body.minOrderValue !== "" && req.body.minOrderValue !== undefined && discountValue >= Number(req.body.minOrderValue)){
      sendErrorMessage(res, "Số tiền giảm phải nhỏ hơn giá trị đơn hàng tối thiểu!")
      return
    }
  }

  // Miễn phí giao hàng áp dụng cho cả đơn hàng, không cần chọn danh mục / sản phẩm
  if(req.body.discountType !== "free-shipping"){
    if(req.body.applyTo === "category" && JSON.parse(req.body.categories || "[]").length === 0){
      sendErrorMessage(res, "Vui lòng chọn ít nhất 1 danh mục được áp dụng mã!")
      return
    }

    if(req.body.applyTo === "product" && JSON.parse(req.body.products || "[]").length === 0){
      sendErrorMessage(res, "Vui lòng chọn ít nhất 1 sản phẩm được áp dụng mã!")
      return
    }
  }

  if(!req.body.startAt){
    sendErrorMessage(res, "Vui lòng chọn thời gian bắt đầu!")
    return
  }

  if(req.body.endAt && parseShopDateTime(req.body.endAt) <= parseShopDateTime(req.body.startAt)){
    sendErrorMessage(res, "Thời gian kết thúc phải sau thời gian bắt đầu!")
    return
  }

  next()
}
