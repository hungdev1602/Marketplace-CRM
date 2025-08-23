import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export const categoryCreatePost = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string()
      .required()
      .messages({
        "string.empty": "Vui lòng nhập tên danh mục!"
      }),
    parent: Joi.string().allow(""),
    description: Joi.string().allow("")
  })

  const value = schema.validate(req.body)

  // value.error?.details[0].message -> thông báo lỗi
  if(value.error){
    const errorMessage = value.error?.details[0].message
    res.json({
      code: "error",
      message: errorMessage
    })
    return 
  }

  next()
}