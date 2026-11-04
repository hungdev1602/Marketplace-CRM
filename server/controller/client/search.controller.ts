import { Request, Response } from "express"
import {
  clientSearchSuggestBrandLimit,
  clientSearchSuggestCategoryLimit,
  clientSearchSuggestProductLimit,
  clientSearchSuggestQueryLimit,
  domainFileManager,
  productNetWeightUnitList
} from "../../config/variable.config"
import { getDescendantIds } from "../../helpers/category.helper"
import { formatNumber } from "../../helpers/format.helper"
import { addProductDisplayInfo, productVisibleFind } from "../../helpers/client-product.helper"
import {
  addKeywordFind,
  cleanKeyword,
  findBrandsByKeyword,
  findCategoriesByKeyword,
  findProductsByRelevance,
  findQueriesByKeyword,
  getPopularQueries,
  getSearchCategories,
  resolveSearchKeyword
} from "../../helpers/client-search.helper"
import { Product } from "../../models/product.model"

// Link ảnh lưu ở server quản lý file (giống mediaUrl trong layout.middleware.ts)
const mediaUrl = (path: string) => path ? `${domainFileManager}${path}` : "/client/assets/images/no-image.svg"

// Khung gợi ý khi khách gõ từ khoá: GET /search/suggest?keyword=...&category=slug
// main.js gọi mỗi khi khách ngừng gõ, trả về JSON:
// - products: sản phẩm phù hợp nhất (lọc theo danh mục khách chọn ở ô tìm kiếm, nếu có)
// - total: tổng số sản phẩm tìm thấy (nút "Показать все")
// - categories, brands: danh mục, thương hiệu có tên khớp từ khoá
// - queries: từ khoá khách khác hay tìm, bắt đầu bằng chữ đang gõ
// - usedKeyword, corrected: từ khoá đã được sửa (gõ nhầm bàn phím, sai chính tả)
export const suggest = async (req: Request, res: Response) => {
  const keyword = cleanKeyword(req.query.keyword)
  const lang: string = res.locals.lang
  const tName = res.locals.tName
  const tOption = res.locals.tOption

  if(!keyword){
    res.json({
      code: "success",
      keyword: "",
      usedKeyword: "",
      corrected: false,
      total: 0,
      products: [],
      categories: [],
      brands: [],
      queries: []
    })
    return
  }

  try {
    const resolved = await resolveSearchKeyword(keyword)

    // Lọc theo danh mục khách chọn ở ô tìm kiếm (gồm cả danh mục con)
    const find: any = addKeywordFind({ ...productVisibleFind }, resolved.keyword)
    const { allCategory } = await getSearchCategories()
    const category = req.query.category ? allCategory.find(item => item.slug === req.query.category) : null
    if(category){
      find.category = {
        $in: [category.id, ...getDescendantIds(allCategory, category.id)]
      }
    }

    const [productList, total, categoryList, brandList, queryList] = await Promise.all([
      findProductsByRelevance(find, resolved.keyword, 0, clientSearchSuggestProductLimit),
      category ? Product.countDocuments(find) : Promise.resolve(resolved.total),
      findCategoriesByKeyword(resolved.keyword, clientSearchSuggestCategoryLimit),
      findBrandsByKeyword(resolved.keyword, clientSearchSuggestBrandLimit),
      findQueriesByKeyword(resolved.keyword, lang, clientSearchSuggestQueryLimit)
    ])

    addProductDisplayInfo(productList)

    res.json({
      code: "success",
      keyword: keyword,
      usedKeyword: resolved.keyword,
      corrected: resolved.corrected,
      total: total,
      products: productList.map((product: any) => {
        // Khối lượng · thương hiệu, ví dụ: "75 г · Acecook"
        const metaList: string[] = []
        if(product.netWeight){
          metaList.push(`${formatNumber(product.netWeight)} ${tOption(productNetWeightUnitList, product.netWeightUnit)}`)
        }
        if(product.brand){
          metaList.push(product.brand)
        }

        return {
          name: tName(product),
          url: `/product/${product.slug}`,
          image: mediaUrl(product.cardImage),
          meta: metaList.join(" · "),
          price: product.priceFormat,
          priceOld: product.discountPercent ? product.priceOldFormat : "",
          discountPercent: product.discountPercent || 0,
          inStock: product.stock > 0
        }
      }),
      categories: categoryList.map((item: any) => ({
        name: tName(item),
        url: `/category/${item.slug}`,
        image: item.avatar ? mediaUrl(item.avatar) : ""
      })),
      brands: brandList.map((name: string) => ({
        name: name,
        url: `/products?keyword=${encodeURIComponent(name)}`
      })),
      queries: queryList
    })
  } catch (error) {
    console.log("Lỗi gợi ý tìm kiếm:", error)
    res.status(500).json({
      code: "error",
      message: res.locals.t("errorGeneral")
    })
  }
}

// "Часто ищут": GET /search/popular
// main.js gọi khi khách bấm vào ô tìm kiếm còn trống (cùng với lịch sử tìm kiếm lưu trên trình duyệt)
export const popular = async (req: Request, res: Response) => {
  try {
    res.json({
      code: "success",
      queries: await getPopularQueries(res.locals.lang)
    })
  } catch (error) {
    console.log("Lỗi lấy từ khoá hay tìm:", error)
    res.json({
      code: "success",
      queries: []
    })
  }
}
