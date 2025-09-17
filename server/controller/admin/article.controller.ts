import { Request, Response } from "express"
import { CategoryBlog } from "../../models/category-blog.model"
import { buildCategoryTree } from "../../helpers/category.helper"
import slugify from "slugify"

export const category = (req: Request, res: Response) => {
  res.render("admin/pages/article-category", {
    pageTitle: "Quản lý danh mục bài viết"
  })
}

export const categoryCreate = async (req: Request, res: Response) => {
  const allCategory = await CategoryBlog.find()

  const categoryTree = buildCategoryTree(allCategory)

  res.render("admin/pages/article-category-create", {
    pageTitle: "Tạo danh mục bài viết",
    allCategory: allCategory,
    categoryTree: categoryTree
  })
}

export const categoryCreatePost = async (req: Request, res: Response) => {
  try {
    const existSlug = await CategoryBlog.findOne({
      slug: req.body.slug
    })

    if(existSlug){
      res.json({
        code: "error",
        message: "Đường dẫn đã tồn tại!"
      })
      return
    }

    req.body.search = slugify(`${req.body.name}`, {
      replacement: " ",
      lower: true
    })

    const newRecord = new CategoryBlog(req.body)
    await newRecord.save()

    res.json({
      code: "success",
      message: "Tạo danh mục bài viết thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}