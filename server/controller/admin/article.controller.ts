import { Request, Response } from "express"
import { CategoryBlog } from "../../models/category-blog.model"

export const category = (req: Request, res: Response) => {
  res.render("admin/pages/article-category", {
    pageTitle: "Quản lý danh mục bài viết"
  })
}

export const categoryCreate = async (req: Request, res: Response) => {
  const allCategory = await CategoryBlog.find()

  res.render("admin/pages/article-category-create", {
    pageTitle: "Tạo danh mục bài viết",
    allCategory: allCategory
  })
}

export const categoryCreatePost = async (req: Request, res: Response) => {
  const newRecord = new CategoryBlog(req.body)
  await newRecord.save()

  res.json({
    code: "success",
    message: "Tạo danh mục bài viết thành công"
  })
}