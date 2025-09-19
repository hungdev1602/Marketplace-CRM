import { Request, Response } from "express"
import { CategoryBlog } from "../../models/category-blog.model"
import { buildCategoryTree } from "../../helpers/category.helper"
import slugify from "slugify"
import { pathAdmin } from "../../config/variable.config"

export const category = async (req: Request, res: Response) => {
  const allCategory: any = await CategoryBlog.find({
    deleted: false
  })

  for (const item of allCategory) {
    if(item.parent) {
      const parent = await CategoryBlog.findById({
        _id: item.parent
      })

      item.parentName = parent?.name
    }
    else{
      item.parentName = "--"
    }
  }

  res.render("admin/pages/article-category", {
    pageTitle: "Quản lý danh mục bài viết",
    allCategory: allCategory
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

export const categoryEdit = async (req: Request, res: Response) => {
  try {
    const category = await CategoryBlog.findById(req.params.id)
    if(!category){
      res.redirect(`${pathAdmin}/article/category`)
      return
    }

    const allCategory = await CategoryBlog.find()

    const categoryTree = buildCategoryTree(allCategory)

    res.render("admin/pages/article-category-edit", {
      pageTitle: "Chỉnh sửa danh mục bài viết",
      category: category,
      allCategory: allCategory,
      categoryTree: categoryTree
    })
  } catch (error) {
    res.redirect(`${pathAdmin}/article/category`)
  }
}

export const categoryEditPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const existSlug = await CategoryBlog.findOne({
      _id: { $ne: id }, //đi tìm các bản ghi TRỪ chính nó
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

    await CategoryBlog.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    res.json({
      code: "success",
      message: "Chỉnh sửa danh mục bài viết thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}