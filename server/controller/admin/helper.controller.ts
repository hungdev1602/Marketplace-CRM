import { Request, Response } from "express"
import slugify from "slugify"
import { CategoryBlog } from "../../models/category-blog.model"
import { Blog } from "../../models/blog.model"
import { generateRandomString } from "../../helpers/generate.helper"
// import mongoose from "mongoose"

const models: any = {
  CategoryBlog: CategoryBlog,
  Blog: Blog
}

export const generateSlug = async (req: Request, res: Response) => {
  try {
    const { string, modelName } = req.body

    let slug = slugify(string, {
      lower: true, // chuyển hết thành chữ in thường
      strict: true // loại bỏ các ký tự đặc biệt
    })

    const Model = models[modelName]

    // Kiểm tra xem slug tồn tại hay chưa, nếu có thì thêm chuỗi random
    const checkExistSlug = await Model.findOne({
      slug: slug
    })

    if(checkExistSlug){
      const stringRandom = generateRandomString()
      slug = slug + "-" + stringRandom
    }

    res.json({
      code: "success",
      message: "Tạo slug thành công",
      slug: slug
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Model không hợp lệ!"
    })
  }
}