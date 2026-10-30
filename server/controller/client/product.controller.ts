import { Request, Response } from "express"
import { Product } from "../../models/product.model"
import {
  clientProductPerPage,
  productDietTagList,
  productOriginList,
  productStorageList
} from "../../config/variable.config"
import { getDescendantIds } from "../../helpers/category.helper"
import { htmlToText } from "../../helpers/format.helper"
import { buildClientPagination } from "../../helpers/pagination.helper"
import {
  addProductDisplayInfo,
  clientProductSortList,
  productOnSaleFind,
  productVisibleFind
} from "../../helpers/client-product.helper"
import { keywordToRegex } from "../admin/product.controller"
import { notFound } from "./error.controller"

// Từ ngữ hạn sử dụng theo đơn vị (locales), ví dụ: 6 + month => "6 месяцев" / "6 tháng"
const shelfLifeKeyList: { [unit: string]: string } = {
  day: "shelfLifeDay",
  month: "shelfLifeMonth",
  year: "shelfLifeYear"
}

// Giá trị bộ lọc trên link (?origin=VN&origin=TH) => mảng, chỉ giữ giá trị có trong danh sách lựa chọn
const getFilterList = (value: any, optionList: { id: string }[]): string[] => {
  return ([] as any[])
    .concat(value || [])
    .map(item => `${item}`)
    .filter(item => optionList.some(option => option.id === item))
}

// Giá trên link => số >= 0, không hợp lệ thì bỏ qua
const getFilterPrice = (value: any): number | null => {
  if(value === undefined || value === "") return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

// Danh mục và các danh mục cha của nó (từ gốc đến danh mục), dùng cho breadcrumb
const getCategoryPath = (allCategory: any[], category: any): any[] => {
  const path: any[] = []
  let current = category
  while(current && !path.includes(current)){
    path.unshift(current)
    current = allCategory.find(item => item.id === current.parent)
  }
  return path
}

// Tìm danh mục trong cây danh mục (res.locals.categoryTree) để lấy các danh mục con
const findCategoryNode = (tree: any[], id: string): any => {
  for (const node of tree) {
    if(node.id === id) return node
    const child = findCategoryNode(node.children, id)
    if(child) return child
  }
  return null
}

// Trang danh sách sản phẩm
// - /products: tất cả sản phẩm, tìm kiếm (?keyword=), lọc theo danh mục ở ô tìm kiếm (?category=slug)
// - /category/:slug: sản phẩm theo danh mục (gồm cả danh mục con)
export const list = async (req: Request, res: Response) => {
  const allCategory: any[] = res.locals.allCategory

  const find: any = { ...productVisibleFind }

  // Danh mục
  let category: any = null
  const categorySlug = req.params.slug || req.query.category
  if(categorySlug){
    category = allCategory.find(item => item.slug === categorySlug)

    // Danh mục không tồn tại hoặc đang tạm dừng
    if(!category && req.params.slug){
      notFound(req, res)
      return
    }
  }
  if(category){
    find.category = {
      $in: [category.id, ...getDescendantIds(allCategory, category.id)]
    }
  }

  // Tìm kiếm (không dấu, tìm được cả tên tiếng Nga, mã sản phẩm, mã vạch, thương hiệu)
  const keyword = `${req.query.keyword || ""}`.trim()
  if(keyword){
    find.search = keywordToRegex(keyword)
  }

  // Bộ lọc
  const filter = {
    origin: getFilterList(req.query.origin, productOriginList),
    storageType: getFilterList(req.query.storageType, productStorageList),
    dietTags: getFilterList(req.query.dietTags, productDietTagList),
    priceMin: getFilterPrice(req.query.priceMin),
    priceMax: getFilterPrice(req.query.priceMax),
    inStock: req.query.inStock === "1",
    onSale: req.query.onSale === "1"
  }

  if(filter.origin.length > 0){
    find.origin = { $in: filter.origin }
  }
  if(filter.storageType.length > 0){
    find.storageType = { $in: filter.storageType }
  }
  if(filter.dietTags.length > 0){
    find.dietTags = { $all: filter.dietTags } // có đủ tất cả đặc điểm đã chọn, ví dụ vừa chay vừa không gluten
  }
  if(filter.priceMin !== null || filter.priceMax !== null){
    find.price = {}
    if(filter.priceMin !== null) find.price.$gte = filter.priceMin
    if(filter.priceMax !== null) find.price.$lte = filter.priceMax
  }
  if(filter.inStock){
    find.stock = { $gt: 0 }
  }
  if(filter.onSale){
    Object.assign(find, productOnSaleFind)
  }

  const sortItem = clientProductSortList.find(item => item.id === req.query.sort) || clientProductSortList[0]

  const totalRecord = await Product.countDocuments(find)
  const pagination = buildClientPagination(req, totalRecord, clientProductPerPage)

  const productList: any = await Product
    .find(find)
    .sort({
      ...sortItem.sort,
      _id: "desc" // các sản phẩm bằng nhau (cùng giá,...) luôn giữ đúng thứ tự khi chuyển trang
    } as any)
    .limit(clientProductPerPage)
    .skip(pagination.skip)

  addProductDisplayInfo(productList)

  // Xuất xứ có sản phẩm đang bán, để hiện trong bộ lọc
  const originCountList = await Product.aggregate([
    {
      $match: {
        ...productVisibleFind,
        origin: { $nin: [null, ""] }
      }
    },
    {
      $group: {
        _id: "$origin",
        total: { $sum: 1 }
      }
    }
  ])
  const originFilterList = productOriginList
    .filter(origin => originCountList.some(item => item._id === origin.id))

  // Tiêu đề trang
  let title = res.locals.t("allProducts")
  if(category){
    title = res.locals.tName(category)
  }
  else if(keyword){
    title = res.locals.t("searchResult")
  }

  res.render("client/pages/product-list", {
    pageTitle: `${category?.metaTitle || title} — SFoodie`,
    metaDescription: category?.metaDescription || htmlToText(category?.description),
    title: title,
    keyword: keyword,
    category: category,
    categoryPath: category ? getCategoryPath(allCategory, category) : [],
    subCategoryList: category ? findCategoryNode(res.locals.categoryTree, category.id)?.children || [] : [],
    productList: productList,
    pagination: pagination,
    filter: filter,
    hasFilter: filter.origin.length + filter.storageType.length + filter.dietTags.length > 0
      || filter.priceMin !== null || filter.priceMax !== null || filter.inStock || filter.onSale,
    originFilterList: originFilterList,
    sortList: clientProductSortList,
    sort: sortItem.id,
    formAction: `${req.baseUrl}${req.path}`
  })
}

// Trang tất cả danh mục: /categories
export const categories = (req: Request, res: Response) => {
  res.render("client/pages/category-list", {
    pageTitle: `${res.locals.t("allCategories")} — SFoodie`
  })
}

// Trang chi tiết sản phẩm: /product/:slug
export const detail = async (req: Request, res: Response) => {
  const product: any = await Product.findOne({
    ...productVisibleFind,
    slug: req.params.slug
  })

  if(!product){
    notFound(req, res)
    return
  }

  // Tăng lượt xem, không đổi thời gian cập nhật (updatedAt) của sản phẩm
  await Product.updateOne({ _id: product.id }, { $inc: { view: 1 } }, { timestamps: false })

  addProductDisplayInfo([product])

  // Album ảnh: ảnh đại diện trước, bỏ ảnh trùng
  const imageList = [product.avatar, ...(product.images || [])]
    .filter((item, index, list) => item && list.indexOf(item) === index)

  // Danh mục đầu tiên còn hoạt động của sản phẩm (cho breadcrumb)
  const allCategory: any[] = res.locals.allCategory
  const category = allCategory.find(item => product.category.includes(item.id))

  // Sản phẩm tương tự: cùng danh mục, bán chạy trước
  let relatedList: any = []
  if(product.category.length > 0){
    relatedList = await Product
      .find({
        ...productVisibleFind,
        _id: { $ne: product.id },
        category: { $in: product.category }
      })
      .sort({
        sold: "desc",
        createdAt: "desc"
      })
      .limit(10)
    addProductDisplayInfo(relatedList)
  }

  const productName = res.locals.tName(product)

  res.render("client/pages/product-detail", {
    pageTitle: `${product.metaTitle || productName} — SFoodie`,
    metaDescription: product.metaDescription || htmlToText(product.description),
    product: product,
    productName: productName,
    imageList: imageList,
    categoryPath: category ? getCategoryPath(allCategory, category) : [],
    productCategoryList: allCategory.filter(item => product.category.includes(item.id)),
    shelfLifeKey: shelfLifeKeyList[product.shelfLifeUnit],
    hasNutrition: [product.calories, product.protein, product.fat, product.carbohydrate]
      .some(value => value !== null && value !== undefined),
    relatedList: relatedList
  })
}
