import { Request, Response } from "express"
import { Blog } from "../../models/blog.model"
import { CategoryBlog } from "../../models/category-blog.model"
import { clientArticlePerPage } from "../../config/variable.config"
import { getDescendantIds } from "../../helpers/category.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { htmlToText } from "../../helpers/format.helper"
import { buildClientPagination } from "../../helpers/pagination.helper"
import { notFound } from "./error.controller"

// Bài viết khách được xem: chưa xoá và đã xuất bản
const articleVisibleFind = {
  deleted: false,
  status: "published"
}

// Ngày đăng (giờ cửa hàng) và danh mục của bài viết
// - allCategory: danh mục bài viết đang hoạt động
export const addArticleDisplayInfo = (articleList: any[], allCategory: any[]) => {
  for (const item of articleList) {
    item.publishedAtFormat = formatShopDateTime(item.publishedAt || item.createdAt, "DD.MM.YYYY")
    item.categoryList = allCategory.filter(category => item.category.includes(category.id))
  }
}

const getAllCategory = async () => {
  return await CategoryBlog
    .find({
      deleted: false,
      status: "active"
    })
    .sort({
      createdAt: "desc"
    })
}

// Trang blog: /blog (tất cả bài viết), /blog/category/:slug (theo danh mục)
export const list = async (req: Request, res: Response) => {
  const allCategory = await getAllCategory()

  const find: any = { ...articleVisibleFind }

  let category: any = null
  if(req.params.slug){
    category = allCategory.find(item => item.slug === req.params.slug)

    if(!category){
      notFound(req, res)
      return
    }

    // Lấy cả bài viết thuộc danh mục con
    find.category = {
      $in: [category.id, ...getDescendantIds(allCategory, category.id)]
    }
  }

  const totalRecord = await Blog.countDocuments(find)
  const pagination = buildClientPagination(req, totalRecord, clientArticlePerPage)

  const articleList: any = await Blog
    .find(find)
    .sort({
      publishedAt: "desc",
      createdAt: "desc"
    })
    .limit(clientArticlePerPage)
    .skip(pagination.skip)

  addArticleDisplayInfo(articleList, allCategory)

  const title = category ? category.name : res.locals.t("blog")

  res.render("client/pages/article-list", {
    pageTitle: `${title} — SFoodie`,
    metaDescription: res.locals.t("blogSub"),
    title: title,
    category: category,
    allCategory: allCategory.filter(item => !item.parent),
    articleList: articleList,
    pagination: pagination
  })
}

// Trang chi tiết bài viết: /blog/:slug
export const detail = async (req: Request, res: Response) => {
  const article: any = await Blog.findOne({
    ...articleVisibleFind,
    slug: req.params.slug
  })

  if(!article){
    notFound(req, res)
    return
  }

  // Tăng lượt xem, không đổi thời gian cập nhật (updatedAt) của bài viết
  await Blog.updateOne({ _id: article.id }, { $inc: { view: 1 } }, { timestamps: false })

  const allCategory = await getAllCategory()

  const latestList: any = await Blog
    .find({
      ...articleVisibleFind,
      _id: { $ne: article.id }
    })
    .sort({
      publishedAt: "desc",
      createdAt: "desc"
    })
    .limit(5)

  addArticleDisplayInfo([article, ...latestList], allCategory)

  res.render("client/pages/article-detail", {
    pageTitle: `${article.name} — SFoodie`,
    metaDescription: htmlToText(article.description),
    article: article,
    allCategory: allCategory.filter(item => !item.parent),
    latestList: latestList
  })
}
