import { Request, Response } from "express"
import slugify from "slugify"
import mongoose from "mongoose"
import { CategoryProduct } from "../../models/category-product.model"
import { Product } from "../../models/product.model"
import { buildCategoryTree, getDescendantIds } from "../../helpers/category.helper"
import { formatPrice } from "../../helpers/format.helper"
import { writeLog } from "../../helpers/activity-log.helper"
import { productExcelGroupList } from "../../helpers/product-excel.helper"
import {
  pathAdmin,
  productAllergenList,
  productDietTagList,
  productLowStockThreshold,
  productNetWeightUnitList,
  productOriginList,
  productShelfLifeUnitList,
  productStorageList,
  productUnitList,
  productVatList
} from "../../config/variable.config"

// Các danh sách lựa chọn ở trang tạo/sửa/danh sách sản phẩm (config/variable.config.ts)
const productOptions = {
  originList: productOriginList,
  unitList: productUnitList,
  netWeightUnitList: productNetWeightUnitList,
  storageList: productStorageList,
  shelfLifeUnitList: productShelfLifeUnitList,
  allergenList: productAllergenList,
  dietTagList: productDietTagList,
  vatList: productVatList
}

// Chuyển từ khoá tìm kiếm thành RegExp (dùng chung cho trang mã giảm giá)
// slugify để tìm không dấu (tiếng Việt) và tìm được bằng tiếng Nga (chữ Nga được chuyển thành chữ Latin giống lúc lưu)
export const keywordToRegex = (keyword: string) => {
  const keywordSlug = slugify(keyword, {
    replacement: " ",
    lower: true
  })

  // Thêm "\" trước các ký tự đặc biệt của RegExp (. * + ? ( ) ...) để tìm đúng chuỗi đã nhập, ví dụ SKU có dấu "."
  return new RegExp(keywordSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
}

// Lấy tên danh mục cha của danh sách danh mục bằng 1 truy vấn (thay vì mỗi danh mục 1 truy vấn)
const addParentName = async (categoryList: any) => {
  const parentList = await CategoryProduct.find({
    _id: {
      $in: categoryList.filter((item: any) => item.parent).map((item: any) => item.parent)
    }
  })

  for (const item of categoryList) {
    const parent = parentList.find(parent => parent.id == item.parent)
    item.parentName = parent ? parent.name : "--"
  }
}

// ===== Danh mục sản phẩm =====

export const category = async (req: Request, res: Response) => {
  const find: {
    deleted: boolean,
    search?: RegExp
  } = {
    deleted: false
  }

  if(req.query.keyword){
    find.search = keywordToRegex(`${req.query.keyword}`)
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await CategoryProduct.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const allCategory: any = await CategoryProduct
    .find(find)
    .sort({
      position: "asc",
      createdAt: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  await addParentName(allCategory)

  // Đếm số sản phẩm (chưa xoá) của từng danh mục bằng 1 truy vấn
  const productCountList = await Product.aggregate([
    {
      $match: {
        deleted: false,
        category: { $in: allCategory.map((item: any) => item.id) }
      }
    },
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category",
        total: { $sum: 1 }
      }
    }
  ])

  for (const item of allCategory) {
    item.productCount = productCountList.find(count => count._id == item.id)?.total || 0
  }

  res.render("admin/pages/product-category", {
    pageTitle: "Quản lý danh mục sản phẩm",
    allCategory: allCategory,
    pagination: pagination,
    page: page
  })
}

export const categoryTrash = async (req: Request, res: Response) => {
  const allCategory: any = await CategoryProduct
    .find({
      deleted: true
    })
    .sort({
      deletedAt: "desc"
    })

  await addParentName(allCategory)

  res.render("admin/pages/product-category-trash", {
    pageTitle: "Thùng rác danh mục sản phẩm",
    allCategory: allCategory
  })
}

export const categoryCreate = async (req: Request, res: Response) => {
  const allCategory = await CategoryProduct.find({
    deleted: false
  })

  const categoryTree = buildCategoryTree(allCategory)

  res.render("admin/pages/product-category-create", {
    pageTitle: "Tạo danh mục sản phẩm",
    categoryTree: categoryTree
  })
}

export const categoryCreatePost = async (req: Request, res: Response) => {
  try {
    const existSlug = await CategoryProduct.findOne({
      slug: req.body.slug
    })

    if(existSlug){
      res.json({
        code: "error",
        message: "Đường dẫn đã tồn tại!"
      })
      return
    }

    // Danh mục cha phải còn tồn tại (chưa bị xoá)
    if(req.body.parent){
      const existParent = await CategoryProduct.findOne({
        _id: req.body.parent,
        deleted: false
      })

      if(!existParent){
        res.json({
          code: "error",
          message: "Danh mục cha không tồn tại!"
        })
        return
      }
    }

    // Không nhập vị trí thì xếp xuống cuối
    if(req.body.position === "" || req.body.position === undefined){
      req.body.position = await CategoryProduct.countDocuments({}) + 1
    }

    req.body.search = slugify(`${req.body.name} ${req.body.nameRu || ""}`, {
      replacement: " ",
      lower: true
    })

    const newRecord = new CategoryProduct(req.body)
    await newRecord.save()

    await writeLog(req, res, {
      module: "product-category",
      action: "create",
      description: `Tạo danh mục sản phẩm "${req.body.name}"`,
      targetId: newRecord.id
    })

    res.json({
      code: "success",
      message: "Tạo danh mục sản phẩm thành công"
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
    const id = req.params.id

    const categoryDetail = await CategoryProduct.findOne({
      _id: id,
      deleted: false
    })

    if(!categoryDetail){
      res.redirect(`/${pathAdmin}/product/category`)
      return
    }

    // Không cho chọn chính nó và danh mục con của nó làm danh mục cha (tránh vòng lặp)
    const allCategory = await CategoryProduct.find({
      deleted: false
    })
    const excludeIds = [id, ...getDescendantIds(allCategory, id)]

    const categoryTree = buildCategoryTree(allCategory.filter(item => !excludeIds.includes(item.id)))

    res.render("admin/pages/product-category-edit", {
      pageTitle: "Chỉnh sửa danh mục sản phẩm",
      categoryDetail: categoryDetail,
      categoryTree: categoryTree
    })
  } catch (error) {
    res.redirect(`/${pathAdmin}/product/category`)
  }
}

export const categoryEditPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const categoryDetail = await CategoryProduct.findOne({
      _id: id,
      deleted: false
    })

    if(!categoryDetail){
      res.json({
        code: "error",
        message: "Danh mục sản phẩm không tồn tại!"
      })
      return
    }

    const existSlug = await CategoryProduct.findOne({
      _id: { $ne: id }, // tìm các bản ghi TRỪ CHÍNH NÓ
      slug: req.body.slug
    })

    if(existSlug){
      res.json({
        code: "error",
        message: "Đường dẫn đã tồn tại!"
      })
      return
    }

    if(req.body.parent){
      const allCategory = await CategoryProduct.find({
        deleted: false
      })

      // Danh mục cha không được là chính nó hoặc danh mục con của nó
      if([id, ...getDescendantIds(allCategory, id)].includes(req.body.parent)){
        res.json({
          code: "error",
          message: "Không thể chọn chính danh mục này hoặc danh mục con của nó làm danh mục cha!"
        })
        return
      }

      if(!allCategory.some(item => item.id == req.body.parent)){
        res.json({
          code: "error",
          message: "Danh mục cha không tồn tại!"
        })
        return
      }
    }

    // Để trống vị trí thì giữ nguyên vị trí cũ
    if(req.body.position === ""){
      delete req.body.position
    }

    req.body.search = slugify(`${req.body.name} ${req.body.nameRu || ""}`, {
      replacement: " ",
      lower: true
    })

    await CategoryProduct.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    await writeLog(req, res, {
      module: "product-category",
      action: "edit",
      description: `Chỉnh sửa danh mục sản phẩm "${req.body.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Chỉnh sửa danh mục sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const categoryDeletePatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const categoryDetail = await CategoryProduct.findOne({
      _id: id,
      deleted: false
    })

    if(!categoryDetail){
      res.json({
        code: "error",
        message: "Danh mục sản phẩm không tồn tại!"
      })
      return
    }

    // Còn danh mục con thì không cho xoá (danh mục con sẽ bị mất danh mục cha)
    const childCount = await CategoryProduct.countDocuments({
      parent: id,
      deleted: false
    })

    if(childCount > 0){
      res.json({
        code: "error",
        message: `Danh mục đang có ${childCount} danh mục con, vui lòng xoá hoặc chuyển danh mục con sang danh mục khác trước!`
      })
      return
    }

    await CategoryProduct.updateOne({
      _id: id
    }, {
      deleted: true,
      deletedAt: Date.now()
    })

    await writeLog(req, res, {
      module: "product-category",
      action: "delete",
      description: `Xoá danh mục sản phẩm "${categoryDetail.name}" vào thùng rác`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Xoá danh mục sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const categoryUndo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const categoryDetail = await CategoryProduct.findOne({
      _id: id,
      deleted: true
    })

    if(!categoryDetail){
      res.json({
        code: "error",
        message: "Danh mục sản phẩm không tồn tại!"
      })
      return
    }

    const dataUpdate: {
      deleted: boolean,
      parent?: string
    } = {
      deleted: false
    }

    // Danh mục cha đã bị xoá thì chuyển thành danh mục gốc
    let message = "Khôi phục danh mục sản phẩm thành công"
    if(categoryDetail.parent){
      const existParent = await CategoryProduct.findOne({
        _id: categoryDetail.parent,
        deleted: false
      })

      if(!existParent){
        dataUpdate.parent = ""
        message = "Khôi phục thành công. Danh mục cha đã bị xoá nên danh mục này được chuyển thành danh mục gốc"
      }
    }

    await CategoryProduct.updateOne({
      _id: id
    }, dataUpdate)

    await writeLog(req, res, {
      module: "product-category",
      action: "undo",
      description: `Khôi phục danh mục sản phẩm "${categoryDetail.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: message
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const categoryDeletePermanently = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const categoryDetail = await CategoryProduct.findOne({
      _id: id,
      deleted: true
    })

    if(!categoryDetail){
      res.json({
        code: "error",
        message: "Danh mục sản phẩm không tồn tại!"
      })
      return
    }

    await CategoryProduct.deleteOne({
      _id: id
    })

    // Danh mục con (đang nằm trong thùng rác) khi khôi phục sẽ thành danh mục gốc
    await CategoryProduct.updateMany({
      parent: id
    }, {
      parent: ""
    })

    // Bỏ danh mục này khỏi các sản phẩm
    await Product.updateMany({
      category: id
    }, {
      $pull: { category: id }
    })

    await writeLog(req, res, {
      module: "product-category",
      action: "delete-permanently",
      description: `Xoá vĩnh viễn danh mục sản phẩm "${categoryDetail.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Danh mục đã được xoá vĩnh viễn"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

// ===== Sản phẩm =====

// Chuẩn hoá dữ liệu sản phẩm gửi lên (đã qua validate), dùng chung cho tạo mới và chỉnh sửa
const formatProductBody = (body: any) => {
  // Các ô chọn nhiều gửi lên dạng chuỗi JSON
  body.category = body.category ? JSON.parse(body.category) : []
  body.dietTags = body.dietTags ? JSON.parse(body.dietTags) : []
  body.allergens = body.allergens ? JSON.parse(body.allergens) : []
  body.images = body.images ? JSON.parse(body.images) : []

  // Không nhập tồn kho thì là 0
  if(body.stock === ""){
    body.stock = 0
  }

  // Tìm kiếm theo tên, tên tiếng Nga, mã SKU, mã vạch, thương hiệu
  body.search = slugify(`${body.name} ${body.nameRu || ""} ${body.sku || ""} ${body.barcode || ""} ${body.brand || ""}`, {
    replacement: " ",
    lower: true
  })
}

// Lọc danh sách id danh mục của sản phẩm trước khi lưu (dùng chung cho danh mục áp dụng mã giảm giá)
// - Chỉ giữ danh mục có thật (bỏ id lạ gửi lên)
// - Danh mục đang nằm trong thùng rác không hiện ở form sửa, nên giữ nguyên nếu sản phẩm đã thuộc danh mục đó
//   (khôi phục danh mục thì sản phẩm vẫn nằm trong danh mục)
export const resolveCategoryIds = async (categoryIds: string[], oldCategoryIds: string[] = []) => {
  const categoryList = await CategoryProduct
    .find({
      _id: {
        $in: [...categoryIds, ...oldCategoryIds].filter(id => mongoose.isValidObjectId(id))
      }
    })
    .select("deleted")

  return categoryList
    .filter(category => category.deleted ? oldCategoryIds.includes(category.id) : categoryIds.includes(category.id))
    .map(category => category.id)
}

// Mã SKU không được trùng với sản phẩm khác (kể cả sản phẩm trong thùng rác)
const checkExistSku = async (sku: string, excludeId?: string) => {
  if(!sku){
    return false
  }

  const find: {
    sku: string,
    _id?: { $ne: string }
  } = {
    sku: sku
  }

  // Khi chỉnh sửa: tìm các bản ghi TRỪ CHÍNH NÓ
  if(excludeId){
    find._id = { $ne: excludeId }
  }

  const existSku = await Product.findOne(find)

  return !!existSku
}

export const create = async (req: Request, res: Response) => {
  const allCategory = await CategoryProduct.find({
    deleted: false
  })

  const categoryList = buildCategoryTree(allCategory)

  res.render("admin/pages/product-create", {
    pageTitle: "Tạo sản phẩm",
    categoryList: categoryList,
    options: productOptions
  })
}

export const createPost = async (req: Request, res: Response) => {
  try {
    const existSlug = await Product.findOne({
      slug: req.body.slug
    })

    if(existSlug){
      res.json({
        code: "error",
        message: "Đường dẫn đã tồn tại!"
      })
      return
    }

    if(await checkExistSku(req.body.sku)){
      res.json({
        code: "error",
        message: "Mã sản phẩm (SKU) đã tồn tại!"
      })
      return
    }

    formatProductBody(req.body)
    req.body.category = await resolveCategoryIds(req.body.category)

    // Không nhập vị trí thì xếp xuống cuối
    if(req.body.position === "" || req.body.position === undefined){
      req.body.position = await Product.countDocuments({}) + 1
    }

    const newRecord = new Product(req.body)
    await newRecord.save()

    await writeLog(req, res, {
      module: "product",
      action: "create",
      description: `Tạo sản phẩm "${req.body.name}"`,
      targetId: newRecord.id
    })

    res.json({
      code: "success",
      message: "Tạo sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

// Kiểu sắp xếp ở trang danh sách sản phẩm (dùng chung cho xuất Excel)
export const productSortList = [
  { id: "", name: "Mới nhất", sort: { createdAt: "desc" } },
  { id: "oldest", name: "Cũ nhất", sort: { createdAt: "asc" } },
  { id: "price-asc", name: "Giá tăng dần", sort: { price: "asc" } },
  { id: "price-desc", name: "Giá giảm dần", sort: { price: "desc" } },
  { id: "stock-asc", name: "Tồn kho ít nhất", sort: { stock: "asc" } },
  { id: "sold-desc", name: "Bán chạy nhất", sort: { sold: "desc" } },
  { id: "name-asc", name: "Tên A - Z", sort: { name: "asc" } },
  { id: "position-asc", name: "Vị trí hiển thị", sort: { position: "asc" } }
]

// Lọc theo tình trạng tồn kho
const productStockFilterList = [
  { id: "in", name: "Còn hàng" },
  { id: "low", name: `Sắp hết hàng (từ ${productLowStockThreshold} trở xuống)` },
  { id: "out", name: "Hết hàng" }
]

// Điều kiện lọc theo bộ lọc ở trang danh sách sản phẩm (dùng chung cho xuất Excel)
// - query: req.query
// - allCategory: danh sách danh mục chưa xoá (để lọc cả sản phẩm thuộc danh mục con)
export const buildProductFind = (query: any, allCategory: any[]) => {
  const find: {
    deleted: boolean,
    search?: RegExp,
    category?: { $in: string[] },
    status?: string,
    origin?: string,
    storageType?: string,
    stock?: any
  } = {
    deleted: false
  }

  if(query.keyword){
    find.search = keywordToRegex(`${query.keyword}`)
  }

  // Lọc theo danh mục: lấy cả sản phẩm thuộc danh mục con
  if(query.category){
    const categoryId = `${query.category}`
    find.category = {
      $in: [categoryId, ...getDescendantIds(allCategory, categoryId)]
    }
  }

  if(query.status){
    find.status = `${query.status}`
  }

  if(query.origin){
    find.origin = `${query.origin}`
  }

  if(query.storageType){
    find.storageType = `${query.storageType}`
  }

  if(query.stock === "in"){
    find.stock = { $gt: 0 }
  }
  else if(query.stock === "low"){
    find.stock = { $gt: 0, $lte: productLowStockThreshold }
  }
  else if(query.stock === "out"){
    find.stock = { $not: { $gt: 0 } } // gồm cả sản phẩm chưa nhập tồn kho
  }

  return find
}

export const list = async (req: Request, res: Response) => {
  const allCategory = await CategoryProduct.find({
    deleted: false
  })

  const find = buildProductFind(req.query, allCategory)

  const sortItem = productSortList.find(item => item.id === req.query.sort) || productSortList[0]

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await Product.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const allProduct: any = await Product
    .find(find)
    .sort({
      ...sortItem.sort,
      _id: "desc" // các sản phẩm bằng nhau (cùng giá, cùng tồn kho...) luôn giữ đúng thứ tự khi chuyển trang
    } as any)
    .limit(limitItem)
    .skip(skip)

  for (const item of allProduct) {
    item.categoryName = allCategory
      .filter(category => item.category.includes(category.id))
      .map(category => category.name)
    item.priceFormat = formatPrice(item.price)
    item.priceOldFormat = formatPrice(item.priceOld)
    if(item.priceOld > item.price){
      item.discountPercent = Math.round((1 - item.price / item.priceOld) * 100)
    }
    item.unitName = productUnitList.find(unit => unit.id === item.unit)?.name
    item.originName = productOriginList.find(origin => origin.id === item.origin)?.name
    item.storage = productStorageList.find(storage => storage.id === item.storageType)
  }

  res.render("admin/pages/product-list", {
    pageTitle: "Quản lý sản phẩm",
    allProduct: allProduct,
    categoryTree: buildCategoryTree(allCategory),
    options: productOptions,
    sortList: productSortList,
    stockFilterList: productStockFilterList,
    lowStockThreshold: productLowStockThreshold,
    excelGroupList: productExcelGroupList,
    filter: {
      keyword: req.query.keyword || "",
      category: req.query.category || "",
      status: req.query.status || "",
      origin: req.query.origin || "",
      storageType: req.query.storageType || "",
      stock: req.query.stock || "",
      sort: sortItem.id
    },
    pagination: pagination,
    page: page
  })
}

export const listTrash = async (req: Request, res: Response) => {
  const allProduct: any = await Product
    .find({
      deleted: true
    })
    .sort({
      deletedAt: "desc"
    })

  for (const item of allProduct) {
    item.priceFormat = formatPrice(item.price)
  }

  res.render("admin/pages/product-trash", {
    pageTitle: "Thùng rác sản phẩm",
    allProduct: allProduct
  })
}

export const edit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const productDetail = await Product.findOne({
      _id: id,
      deleted: false
    })

    if(!productDetail){
      res.redirect(`/${pathAdmin}/product/list`)
      return
    }

    const allCategory = await CategoryProduct.find({
      deleted: false
    })

    const categoryList = buildCategoryTree(allCategory)

    res.render("admin/pages/product-edit", {
      pageTitle: "Chỉnh sửa sản phẩm",
      categoryList: categoryList,
      options: productOptions,
      productDetail: productDetail
    })
  } catch (error) {
    res.redirect(`/${pathAdmin}/product/list`)
  }
}

export const editPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const productDetail = await Product.findOne({
      _id: id,
      deleted: false
    })

    if(!productDetail){
      res.json({
        code: "error",
        message: "Sản phẩm không tồn tại!"
      })
      return
    }

    const existSlug = await Product.findOne({
      _id: { $ne: id }, // tìm các bản ghi TRỪ CHÍNH NÓ
      slug: req.body.slug
    })

    if(existSlug){
      res.json({
        code: "error",
        message: "Đường dẫn đã tồn tại!"
      })
      return
    }

    if(await checkExistSku(req.body.sku, id)){
      res.json({
        code: "error",
        message: "Mã sản phẩm (SKU) đã tồn tại!"
      })
      return
    }

    formatProductBody(req.body)
    req.body.category = await resolveCategoryIds(req.body.category, productDetail.category)

    // Để trống vị trí thì giữ nguyên vị trí cũ
    if(req.body.position === ""){
      delete req.body.position
    }

    await Product.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    await writeLog(req, res, {
      module: "product",
      action: "edit",
      description: `Chỉnh sửa sản phẩm "${req.body.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Cập nhật sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const deletePatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const productDetail = await Product.findOne({
      _id: id,
      deleted: false
    })

    if(!productDetail){
      res.json({
        code: "error",
        message: "Sản phẩm không tồn tại!"
      })
      return
    }

    await Product.updateOne({
      _id: id
    }, {
      deleted: true,
      deletedAt: Date.now()
    })

    await writeLog(req, res, {
      module: "product",
      action: "delete",
      description: `Xoá sản phẩm "${productDetail.name}" vào thùng rác`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Xoá sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const undo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const productDetail = await Product.findOne({
      _id: id,
      deleted: true
    })

    if(!productDetail){
      res.json({
        code: "error",
        message: "Sản phẩm không tồn tại!"
      })
      return
    }

    await Product.updateOne({
      _id: id
    }, {
      deleted: false
    })

    await writeLog(req, res, {
      module: "product",
      action: "undo",
      description: `Khôi phục sản phẩm "${productDetail.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Khôi phục sản phẩm thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const deletePermanently = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const productDetail = await Product.findOne({
      _id: id,
      deleted: true
    })

    if(!productDetail){
      res.json({
        code: "error",
        message: "Sản phẩm không tồn tại!"
      })
      return
    }

    await Product.deleteOne({
      _id: id
    })

    await writeLog(req, res, {
      module: "product",
      action: "delete-permanently",
      description: `Xoá vĩnh viễn sản phẩm "${productDetail.name}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Sản phẩm đã được xoá vĩnh viễn"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}
