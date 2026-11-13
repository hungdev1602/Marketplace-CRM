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
import { isVideoPath } from "../../helpers/media.helper"
import { buildClientPagination } from "../../helpers/pagination.helper"
import {
  addProductDisplayInfo,
  clientProductSortList,
  clientSearchSortList,
  productOnSaleFind,
  productVisibleFind
} from "../../helpers/client-product.helper"
import {
  addKeywordFind,
  cleanKeyword,
  findProductByBarcode,
  findProductsByRelevance,
  getPopularQueries,
  logSearchKeyword,
  resolveSearchKeyword
} from "../../helpers/client-search.helper"
import { notFound } from "./error.controller"
import { buildReviewView } from "./review.controller"
import { Review } from "../../models/review.model"
import { Order } from "../../models/order.model"
import {
  findProductReviews,
  getProductReviewSummary,
  getReviewListFilter,
  getUserVoteMap,
  reviewSortList
} from "../../helpers/review.helper"
import { domainFileManager, reviewStatusList } from "../../config/variable.config"
import { getSiteUrl } from "../../helpers/site-url.helper"

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
// Tìm kiếm (helpers/client-search.helper.ts):
// - Gõ / quét đúng mã vạch của 1 sản phẩm thì mở luôn trang sản phẩm đó
// - Không có sản phẩm thì tự sửa từ khoá (gõ nhầm bàn phím, sai chính tả)
// - Mặc định xếp theo mức độ phù hợp với từ khoá
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
  const keyword = cleanKeyword(req.query.keyword)
  const isFirstPage = !req.query.page || Number(req.query.page) <= 1

  // Gõ / quét đúng mã vạch: mở luôn trang sản phẩm
  if(keyword && isFirstPage){
    const barcodeProduct = await findProductByBarcode(keyword)
    if(barcodeProduct){
      res.redirect(`/product/${barcodeProduct.slug}`)
      return
    }
  }

  // Từ khoá dùng để tìm (đã sửa nếu khách gõ nhầm bàn phím / sai chính tả)
  const searchInfo = keyword ? await resolveSearchKeyword(keyword) : null
  if(searchInfo){
    addKeywordFind(find, searchInfo.keyword)

    // Đã sửa từ khoá: ô tìm kiếm ở đầu trang hiện từ khoá đúng (лапша) thay cho chữ gõ nhầm (kfgif)
    if(searchInfo.corrected){
      res.locals.query = { ...req.query, keyword: searchInfo.keyword }
    }
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

  const hasFilter = filter.origin.length + filter.storageType.length + filter.dietTags.length > 0
    || filter.priceMin !== null || filter.priceMax !== null || filter.inStock || filter.onSale

  // Kiểu sắp xếp: đang tìm kiếm thì mặc định là "phù hợp nhất"
  const sortList: any[] = searchInfo ? clientSearchSortList : clientProductSortList
  const sortItem = sortList.find(item => item.id === req.query.sort) || sortList[0]

  const totalRecord = await Product.countDocuments(find)
  const pagination = buildClientPagination(req, totalRecord, clientProductPerPage)

  let productList: any = []
  if(searchInfo && !sortItem.sort){
    productList = await findProductsByRelevance(find, searchInfo.keyword, pagination.skip, clientProductPerPage)
  }
  else {
    productList = await Product
      .find(find)
      .sort({
        ...sortItem.sort,
        _id: "desc" // các sản phẩm bằng nhau (cùng giá,...) luôn giữ đúng thứ tự khi chuyển trang
      } as any)
      .limit(clientProductPerPage)
      .skip(pagination.skip)
  }

  addProductDisplayInfo(productList)

  // Lưu từ khoá để hiện "Часто ищут" (chỉ trang đầu, chưa lọc thêm gì, để không đếm 1 lượt tìm nhiều lần)
  if(searchInfo && isFirstPage && !hasFilter && !category){
    logSearchKeyword(searchInfo.keyword, res.locals.lang, totalRecord)
  }

  // Không tìm thấy sản phẩm nào: gợi ý từ khoá hay tìm và sản phẩm bán chạy
  let recommendList: any = []
  let popularQueryList: string[] = []
  if(searchInfo && totalRecord === 0){
    [recommendList, popularQueryList] = await Promise.all([
      Product
        .find({
          ...productVisibleFind,
          stock: { $gt: 0 }
        })
        .sort({
          sold: "desc",
          createdAt: "desc"
        })
        .limit(8),
      getPopularQueries(res.locals.lang)
    ])
    addProductDisplayInfo(recommendList)
  }

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
    searchInfo: searchInfo,
    recommendList: recommendList,
    popularQueryList: popularQueryList,
    category: category,
    categoryPath: category ? getCategoryPath(allCategory, category) : [],
    subCategoryList: category ? findCategoryNode(res.locals.categoryTree, category.id)?.children || [] : [],
    productList: productList,
    pagination: pagination,
    filter: filter,
    hasFilter: hasFilter,
    originFilterList: originFilterList,
    sortList: sortList,
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

  // Album ảnh / video (bỏ file trùng)
  // Giống Ozon, Wildberries: video lên đầu danh sách, sau đó ảnh đại diện, rồi các ảnh còn lại
  const fileList = [product.avatar, ...(product.images || [])]
    .filter((item, index, list) => item && list.indexOf(item) === index)
  const mediaList = [
    ...fileList.filter(item => isVideoPath(item)),
    ...fileList.filter(item => !isVideoPath(item))
  ].map(path => ({
    path: path,
    isVideo: isVideoPath(path)
  }))

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

  // Đánh giá: tổng quan (số lượt theo từng mức sao, ảnh của khách) + trang đầu danh sách đánh giá
  const reviewFilter = getReviewListFilter({})
  const [reviewSummary, reviewResult] = await Promise.all([
    getProductReviewSummary(product.id),
    findProductReviews(product.id, reviewFilter)
  ])
  const account = res.locals.clientAccount
  const voteMap = await getUserVoteMap(reviewResult.reviewList.map(review => review.id), account?.id)

  // Nút "Написать отзыв": khách đã đăng nhập, đã nhận đơn có sản phẩm này
  // - Đã đánh giá: nút "Ваш отзыв" mở trang sửa đánh giá
  let reviewAction: { type: string, url: string, statusName?: string } | null = null
  if(account){
    const myReview: any = await Review.findOne({ customerKey: `user:${account.id}`, productId: product.id })
    if(myReview){
      const statusInfo = reviewStatusList.find(item => item.id === myReview.status)
      reviewAction = {
        type: "edit",
        url: `/review/write/${myReview.orderCode}/${product.id}`,
        statusName: statusInfo ? res.locals.tName(statusInfo) : ""
      }
    }
    else {
      const deliveredOrder: any = await Order
        .findOne({ userId: account.id, status: "delivered", "items.productId": product.id })
        .sort({ createdAt: -1 })
        .select("code")
      if(deliveredOrder){
        reviewAction = { type: "write", url: `/review/write/${deliveredOrder.code}/${product.id}` }
      }
    }
  }

  // Dữ liệu có cấu trúc (schema.org) cho Google / Yandex: hiện giá, còn hàng, số sao ngay trên trang kết quả tìm kiếm
  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    sku: product.sku || undefined,
    gtin13: /^\d{13}$/.test(product.barcode || "") ? product.barcode : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.cardImage ? [`${domainFileManager}${product.cardImage}`] : undefined,
    description: htmlToText(product.description, 300) || undefined,
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl()}/product/${product.slug}`,
      priceCurrency: "RUB",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  }
  if(product.ratingCount > 0){
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      ratingCount: product.ratingCount,
      reviewCount: product.reviewCount || undefined,
      bestRating: 5,
      worstRating: 1
    }
  }

  res.render("client/pages/product-detail", {
    pageTitle: `${product.metaTitle || productName} — SFoodie`,
    metaDescription: product.metaDescription || htmlToText(product.description),
    product: product,
    productName: productName,
    mediaList: mediaList,
    categoryPath: category ? getCategoryPath(allCategory, category) : [],
    productCategoryList: allCategory.filter(item => product.category.includes(item.id)),
    shelfLifeKey: shelfLifeKeyList[product.shelfLifeUnit],
    hasNutrition: [product.calories, product.protein, product.fat, product.carbohydrate]
      .some(value => value !== null && value !== undefined),
    relatedList: relatedList,
    reviewSummary: reviewSummary,
    reviewResult: reviewResult,
    reviewFilter: reviewFilter,
    reviewSortList: reviewSortList,
    reviewViewList: reviewResult.reviewList.map(review => buildReviewView(review, res, voteMap)),
    reviewAction: reviewAction,
    // Chuỗi JSON đặt trong thẻ <script>: đổi "<" để nội dung không đóng được thẻ script
    structuredDataJson: JSON.stringify(structuredData).replace(/</g, "\\u003c")
  })
}
