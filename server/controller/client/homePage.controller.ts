import { Request, Response } from "express"
import { Product } from "../../models/product.model"
import { Blog } from "../../models/blog.model"
import { clientHomeProductLimit, productOriginList } from "../../config/variable.config"
import { addProductDisplayInfo, productOnSaleFind, productVisibleFind } from "../../helpers/client-product.helper"
import { addArticleDisplayInfo } from "./article.controller"

export const index = async (req: Request, res: Response) => {
  const limit = clientHomeProductLimit

  // Các mục của trang chủ không phụ thuộc nhau nên truy vấn song song cho nhanh
  const [
    featuredList,
    saleList,
    newArrivalList,
    bestSellerList,
    totalProduct,
    originCountList,
    articleList
  ]: any[] = await Promise.all([
    // Sản phẩm nổi bật (admin tick "Nổi bật")
    Product
      .find({ ...productVisibleFind, featured: true })
      .sort({ position: "asc", createdAt: "desc" })
      .limit(limit),
    // Đang giảm giá
    Product
      .find({ ...productVisibleFind, ...productOnSaleFind })
      .sort({ createdAt: "desc" })
      .limit(limit),
    // Hàng mới về (admin tick "Hàng mới về")
    Product
      .find({ ...productVisibleFind, newArrival: true })
      .sort({ createdAt: "desc" })
      .limit(limit),
    // Bán chạy
    Product
      .find({ ...productVisibleFind, sold: { $gt: 0 } })
      .sort({ sold: "desc" })
      .limit(limit),
    Product.countDocuments(productVisibleFind),
    // Số sản phẩm theo xuất xứ, để hiện mục "Sản phẩm từ nhiều quốc gia"
    Product.aggregate([
      {
        $match: {
          ...productVisibleFind,
          origin: { $nin: [null, "", "other"] }
        }
      },
      {
        $group: {
          _id: "$origin",
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]),
    // Bài viết mới
    Blog
      .find({ deleted: false, status: "published" })
      .sort({ publishedAt: "desc", createdAt: "desc" })
      .limit(3)
  ])

  // Admin chưa tick sản phẩm nào là "Hàng mới về" thì lấy các sản phẩm tạo gần nhất
  let newList = newArrivalList
  if(newList.length === 0){
    newList = await Product
      .find(productVisibleFind)
      .sort({ createdAt: "desc" })
      .limit(limit)
  }

  addProductDisplayInfo([...featuredList, ...saleList, ...newList, ...bestSellerList])
  addArticleDisplayInfo(articleList, [])

  const originList = originCountList
    .map((item: any) => ({
      ...productOriginList.find(origin => origin.id === item._id),
      total: item.total
    }))
    .filter((item: any) => item.id) // bỏ mã xuất xứ không còn trong productOriginList

  // Ảnh sản phẩm ở banner đầu trang: ưu tiên sản phẩm nổi bật, đang giảm giá, mới về
  const heroProductList = [...featuredList, ...saleList, ...newList]
    .filter((item: any, index: number, list: any[]) => item.avatar && list.findIndex(other => other.id === item.id) === index)
    .slice(0, 3)

  res.render("client/pages/home", {
    pageTitle: res.locals.t("siteTitle"),
    featuredList: featuredList,
    saleList: saleList,
    newList: newList,
    bestSellerList: bestSellerList,
    heroProductList: heroProductList,
    originList: originList,
    articleList: articleList,
    stats: {
      product: totalProduct,
      category: res.locals.allCategory.length,
      country: originList.length
    }
  })
}
