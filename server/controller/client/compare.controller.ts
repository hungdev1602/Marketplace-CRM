import { Request, Response } from "express"
import { Product } from "../../models/product.model"
import { clientCompareMaxItems } from "../../config/variable.config"
import { addProductDisplayInfo, productVisibleFind, shelfLifeKeyList } from "../../helpers/client-product.helper"
import { isValidProductId } from "../../helpers/client-token.helper"
import { getCompareIds, getUnitPrice, setCompareIds } from "../../helpers/compare.helper"
import { formatPrice } from "../../helpers/format.helper"
import { notFound } from "./error.controller"

// ===== So sánh sản phẩm =====
// Danh sách so sánh nằm trong cookie "compareList" (helpers/compare.helper.ts), không lưu trong database
// Trang so sánh chỉ có ở giao diện Next.js (frontend/src/app/(client)/compare), giao diện PUG cũ không có trang này

// Trả lỗi dạng JSON cho JS ở trang khách hàng (hiện thông báo)
const sendError = (res: Response, message: string, link?: { url: string, text: string }) => {
  res.json({
    code: "error",
    message: message,
    link: link || null
  })
}

// Các trường sản phẩm không dùng ở trang so sánh (mô tả dài, SEO, vận chuyển,...), không lấy để trang nhẹ hơn
const compareSkipFields = [
  "content",
  "description",
  "metaTitle",
  "metaDescription",
  "usageInstructions",
  "storageNote",
  "certificateNumber",
  "barcode",
  "grossWeight",
  "packageLength",
  "packageWidth",
  "packageHeight"
].map(field => `-${field}`).join(" ")

// Trang so sánh sản phẩm: /compare
// Sản phẩm xếp theo thứ tự khách thêm vào. Sản phẩm đã ngừng bán / bị xoá thì tự bỏ khỏi danh sách so sánh
export const index = async (req: Request, res: Response) => {
  if(!res.locals.isJsonView){
    notFound(req, res)
    return
  }

  const idList = getCompareIds(req)
  const foundList: any[] = idList.length > 0
    ? await Product.find({ _id: { $in: idList }, ...productVisibleFind }).select(compareSkipFields)
    : []

  const productList: any[] = idList
    .map(id => foundList.find(product => product.id === id))
    .filter(Boolean)

  if(productList.length !== idList.length){
    setCompareIds(res, productList.map(product => product.id))
  }

  addProductDisplayInfo(productList)

  const allCategory: any[] = res.locals.allCategory
  for (const product of productList) {
    // Hạn sử dụng: từ ngữ theo đơn vị (6 + month => "6 месяцев")
    product.shelfLifeKey = shelfLifeKeyList[product.shelfLifeUnit] || ""

    // Giá cho 1 kg / 1 l, để so sánh sản phẩm khác khối lượng
    const unitPrice = getUnitPrice(product)
    product.unitPrice = unitPrice ? unitPrice.value : null
    product.unitPriceUnit = unitPrice ? unitPrice.unit : ""
    product.unitPriceFormat = unitPrice ? formatPrice(unitPrice.value) : ""

    // Danh mục đang hoạt động của sản phẩm
    product.categoryList = allCategory
      .filter(category => product.category.includes(category.id))
      .map(category => ({
        id: category.id,
        name: category.name,
        nameRu: category.nameRu,
        slug: category.slug
      }))
  }

  // Số trên biểu tượng so sánh ở đầu trang theo danh sách đã dọn
  res.locals.compareCount = productList.length
  res.locals.compareMap = Object.fromEntries(productList.map(product => [product.id, true]))

  res.render("client/pages/compare", {
    pageTitle: `${res.locals.t("compare")} — SFoodie`,
    productList: productList,
    compareMaxItems: clientCompareMaxItems
  })
}

// Bấm "Сравнить": chưa có thì thêm vào so sánh, có rồi thì bỏ ra
// POST /compare/toggle { productId }
export const togglePost = async (req: Request, res: Response) => {
  try {
    const t = res.locals.t
    const productId = req.body?.productId

    if(!isValidProductId(productId)){
      sendError(res, t("productUnavailable"))
      return
    }

    const id = productId.toLowerCase()
    const idList = getCompareIds(req)
    const isAdded = idList.includes(id)
    let newIdList: string[] = []

    if(isAdded){
      newIdList = idList.filter(item => item !== id)
    }
    else {
      // Chỉ thêm sản phẩm đang bán (hết hàng vẫn so sánh được)
      const product = await Product.findOne({
        _id: id,
        ...productVisibleFind
      }).select("_id")

      if(!product){
        sendError(res, t("productUnavailable"))
        return
      }

      // Đủ số sản phẩm tối đa: khách mở trang so sánh bỏ bớt sản phẩm rồi thêm lại
      if(idList.length >= clientCompareMaxItems){
        sendError(res, t("compareFull").replace("{count}", `${clientCompareMaxItems}`), {
          url: "/compare",
          text: t("goToCompare")
        })
        return
      }

      newIdList = [...idList, id]
    }

    setCompareIds(res, newIdList)

    res.json({
      code: "success",
      message: t(isAdded ? "removedFromCompare" : "addedToCompare"),
      productId: id,
      added: !isAdded,
      compareCount: newIdList.length,
      link: isAdded ? null : {
        url: "/compare",
        text: t("goToCompare")
      }
    })
  } catch (error) {
    console.log(error)
    sendError(res, res.locals.t("errorGeneral"))
  }
}

// Xoá hết danh sách so sánh: DELETE /compare/clear
export const clearDelete = (req: Request, res: Response) => {
  setCompareIds(res, [])

  res.json({
    code: "success",
    message: res.locals.t("compareCleared"),
    compareCount: 0
  })
}
