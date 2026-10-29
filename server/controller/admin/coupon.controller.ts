import { Request, Response } from "express"
import slugify from "slugify"
import mongoose from "mongoose"
import { Coupon } from "../../models/coupon.model"
import { CategoryProduct } from "../../models/category-product.model"
import { Product } from "../../models/product.model"
import { buildCategoryTree } from "../../helpers/category.helper"
import { formatPrice } from "../../helpers/format.helper"
import { writeLog } from "../../helpers/activity-log.helper"
import {
  buildCouponStatusFind,
  couponStatusList,
  formatCouponDiscount,
  formatShopDateTime,
  getCouponStatus,
  parseShopDateTime,
  shopDateTimeInputFormat
} from "../../helpers/coupon.helper"
import { keywordToRegex, resolveCategoryIds } from "./product.controller"
import { couponApplyToList, couponTypeList, pathAdmin, shopUtcOffset } from "../../config/variable.config"

// Các danh sách lựa chọn ở trang tạo/sửa/danh sách mã giảm giá (config/variable.config.ts)
const couponOptions = {
  typeList: couponTypeList,
  applyToList: couponApplyToList,
  statusList: couponStatusList,
  utcOffset: shopUtcOffset
}

// Mã giảm giá không được trùng với mã khác (kể cả mã trong thùng rác)
const checkExistCode = async (code: string, excludeId?: string) => {
  const find: {
    code: string,
    _id?: { $ne: string }
  } = {
    code: code
  }

  // Khi chỉnh sửa: tìm các bản ghi TRỪ CHÍNH NÓ
  if(excludeId){
    find._id = { $ne: excludeId }
  }

  const existCode = await Coupon.findOne(find)

  return !!existCode
}

// Chỉ giữ sản phẩm có thật (bỏ id lạ, id trùng gửi lên), giữ đúng thứ tự đã chọn
const resolveProductIds = async (productIds: string[]) => {
  const uniqueIds = [...new Set(productIds)].filter(id => mongoose.isValidObjectId(id))

  const productList = await Product
    .find({
      _id: { $in: uniqueIds }
    })
    .select("_id")

  return uniqueIds.filter(id => productList.some(product => product.id == id))
}

// Chuẩn hoá dữ liệu mã giảm giá gửi lên (đã qua validate), dùng chung cho tạo mới và chỉnh sửa
// Trả về thông báo lỗi nếu danh mục / sản phẩm đã chọn không còn tồn tại
const formatCouponBody = async (body: any, oldCoupon?: any) => {
  // Các ô chọn nhiều gửi lên dạng chuỗi JSON
  body.categories = body.categories ? JSON.parse(body.categories) : []
  body.products = body.products ? JSON.parse(body.products) : []

  // Miễn phí giao hàng: không có mức giảm, áp dụng cho cả đơn hàng
  if(body.discountType === "free-shipping"){
    body.discountValue = ""
    body.applyTo = "all"
  }

  // Giảm tối đa chỉ dùng cho loại giảm theo %
  if(body.discountType !== "percent"){
    body.maxDiscount = ""
  }

  // Chỉ lưu danh mục / sản phẩm của phạm vi đang chọn
  body.categories = body.applyTo === "category"
    ? await resolveCategoryIds(body.categories, oldCoupon ? oldCoupon.categories : [])
    : []
  body.products = body.applyTo === "product"
    ? await resolveProductIds(body.products)
    : []

  if(body.applyTo === "category" && body.categories.length === 0){
    return "Danh mục đã chọn không tồn tại, vui lòng tải lại trang và chọn lại!"
  }

  if(body.applyTo === "product" && body.products.length === 0){
    return "Sản phẩm đã chọn không tồn tại, vui lòng tải lại trang và chọn lại!"
  }

  // Ngày giờ nhập theo giờ cửa hàng (giờ Moscow)
  body.startAt = parseShopDateTime(body.startAt)
  body.endAt = body.endAt ? parseShopDateTime(body.endAt) : null

  // Tìm kiếm theo mã, tên chương trình
  body.search = slugify(`${body.code} ${body.name}`, {
    replacement: " ",
    lower: true
  })

  return ""
}

export const list = async (req: Request, res: Response) => {
  const find: any = {
    deleted: false
  }

  if(req.query.keyword){
    find.search = keywordToRegex(`${req.query.keyword}`)
  }

  if(req.query.discountType){
    find.discountType = `${req.query.discountType}`
  }

  // Lọc theo trạng thái (đang chạy, chưa bắt đầu, hết hạn,...)
  if(req.query.status){
    Object.assign(find, buildCouponStatusFind(`${req.query.status}`))
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await Coupon.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const couponList: any = await Coupon
    .find(find)
    .sort({
      createdAt: "desc",
      _id: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  // Lấy tên danh mục, sản phẩm được áp dụng của cả trang bằng 2 truy vấn
  const categoryList = await CategoryProduct
    .find({
      _id: { $in: couponList.flatMap((item: any) => item.categories) }
    })
    .select("name")
  const productList = await Product
    .find({
      _id: { $in: couponList.flatMap((item: any) => item.products) }
    })
    .select("name")

  for (const item of couponList) {
    item.statusInfo = couponStatusList.find(status => status.id === getCouponStatus(item))
    item.discountText = formatCouponDiscount(item)
    item.minOrderValueFormat = formatPrice(item.minOrderValue)
    item.startAtFormat = formatShopDateTime(item.startAt)
    item.endAtFormat = formatShopDateTime(item.endAt)

    if(item.applyTo === "category"){
      item.applyToNameList = categoryList
        .filter(category => item.categories.includes(category.id))
        .map(category => category.name)
    }
    else if(item.applyTo === "product"){
      item.applyToNameList = productList
        .filter(product => item.products.includes(product.id))
        .map(product => product.name)
    }
  }

  res.render("admin/pages/coupon-list", {
    pageTitle: "Quản lý mã giảm giá",
    couponList: couponList,
    options: couponOptions,
    filter: {
      keyword: req.query.keyword || "",
      status: req.query.status || "",
      discountType: req.query.discountType || ""
    },
    pagination: pagination,
    page: page
  })
}

export const trash = async (req: Request, res: Response) => {
  const couponList: any = await Coupon
    .find({
      deleted: true
    })
    .sort({
      deletedAt: "desc"
    })

  for (const item of couponList) {
    item.discountText = formatCouponDiscount(item)
    item.deletedAtFormat = formatShopDateTime(item.deletedAt)
  }

  res.render("admin/pages/coupon-trash", {
    pageTitle: "Thùng rác mã giảm giá",
    couponList: couponList
  })
}

export const create = async (req: Request, res: Response) => {
  const allCategory = await CategoryProduct.find({
    deleted: false
  })

  res.render("admin/pages/coupon-create", {
    pageTitle: "Tạo mã giảm giá",
    categoryTree: buildCategoryTree(allCategory),
    options: couponOptions,
    // Mặc định bắt đầu từ bây giờ
    defaultStartAt: formatShopDateTime(new Date(), shopDateTimeInputFormat)
  })
}

export const createPost = async (req: Request, res: Response) => {
  try {
    if(await checkExistCode(req.body.code)){
      res.json({
        code: "error",
        message: "Mã giảm giá đã tồn tại (kể cả mã trong thùng rác), vui lòng chọn mã khác!"
      })
      return
    }

    // Tạo mới thì thời gian kết thúc phải ở tương lai (sửa mã cũ đã hết hạn thì không bắt buộc)
    if(req.body.endAt && parseShopDateTime(req.body.endAt) <= new Date()){
      res.json({
        code: "error",
        message: "Thời gian kết thúc đã qua, vui lòng chọn thời gian sau thời điểm hiện tại!"
      })
      return
    }

    const errorMessage = await formatCouponBody(req.body)
    if(errorMessage){
      res.json({
        code: "error",
        message: errorMessage
      })
      return
    }

    const newRecord = new Coupon(req.body)
    await newRecord.save()

    await writeLog(req, res, {
      module: "coupon",
      action: "create",
      description: `Tạo mã giảm giá "${req.body.code}" (${req.body.name})`,
      targetId: newRecord.id
    })

    res.json({
      code: "success",
      message: `Tạo mã giảm giá ${req.body.code} thành công`
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

export const edit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const couponDetail: any = await Coupon.findOne({
      _id: id,
      deleted: false
    })

    if(!couponDetail){
      res.redirect(`/${pathAdmin}/coupon/list`)
      return
    }

    const allCategory = await CategoryProduct.find({
      deleted: false
    })

    // Sản phẩm đã chọn (giữ đúng thứ tự đã chọn), sản phẩm trong thùng rác vẫn hiện để bỏ chọn được
    const productList: any = await Product
      .find({
        _id: { $in: couponDetail.products }
      })
      .select("name nameRu sku avatar price deleted")
    const selectedProducts = couponDetail.products
      .map((productId: string) => productList.find((product: any) => product.id == productId))
      .filter((product: any) => product)
    for (const product of selectedProducts) {
      product.priceFormat = formatPrice(product.price)
    }

    couponDetail.startAtInput = formatShopDateTime(couponDetail.startAt, shopDateTimeInputFormat)
    couponDetail.endAtInput = formatShopDateTime(couponDetail.endAt, shopDateTimeInputFormat)

    res.render("admin/pages/coupon-edit", {
      pageTitle: "Chỉnh sửa mã giảm giá",
      couponDetail: couponDetail,
      selectedProducts: selectedProducts,
      categoryTree: buildCategoryTree(allCategory),
      options: couponOptions
    })
  } catch (error) {
    res.redirect(`/${pathAdmin}/coupon/list`)
  }
}

export const editPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const couponDetail = await Coupon.findOne({
      _id: id,
      deleted: false
    })

    if(!couponDetail){
      res.json({
        code: "error",
        message: "Mã giảm giá không tồn tại!"
      })
      return
    }

    if(await checkExistCode(req.body.code, id)){
      res.json({
        code: "error",
        message: "Mã giảm giá đã tồn tại (kể cả mã trong thùng rác), vui lòng chọn mã khác!"
      })
      return
    }

    // Tổng số lượt dùng không được ít hơn số lượt khách đã dùng
    if(req.body.usageLimit !== "" && Number(req.body.usageLimit) < couponDetail.usedCount){
      res.json({
        code: "error",
        message: `Mã đã được dùng ${couponDetail.usedCount} lần, tổng số lượt dùng không được nhỏ hơn số này!`
      })
      return
    }

    const errorMessage = await formatCouponBody(req.body, couponDetail)
    if(errorMessage){
      res.json({
        code: "error",
        message: errorMessage
      })
      return
    }

    await Coupon.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    await writeLog(req, res, {
      module: "coupon",
      action: "edit",
      description: couponDetail.code === req.body.code
        ? `Chỉnh sửa mã giảm giá "${req.body.code}" (${req.body.name})`
        : `Chỉnh sửa mã giảm giá "${couponDetail.code}", đổi mã thành "${req.body.code}" (${req.body.name})`,
      targetId: id
    })

    res.json({
      code: "success",
      message: `Cập nhật mã giảm giá ${req.body.code} thành công`
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

// Tạm dừng / bật lại mã giảm giá (nút ở trang danh sách)
export const changeStatusPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const couponDetail = await Coupon.findOne({
      _id: id,
      deleted: false
    })

    if(!couponDetail){
      res.json({
        code: "error",
        message: "Mã giảm giá không tồn tại!"
      })
      return
    }

    const status = couponDetail.status === "active" ? "inactive" : "active"

    await Coupon.updateOne({
      _id: id
    }, {
      status: status
    })

    await writeLog(req, res, {
      module: "coupon",
      action: "edit",
      description: status === "active"
        ? `Bật lại mã giảm giá "${couponDetail.code}"`
        : `Tạm dừng mã giảm giá "${couponDetail.code}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: status === "active"
        ? `Đã bật lại mã ${couponDetail.code}`
        : `Đã tạm dừng mã ${couponDetail.code}, khách không dùng được mã này nữa`
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

    const couponDetail = await Coupon.findOne({
      _id: id,
      deleted: false
    })

    if(!couponDetail){
      res.json({
        code: "error",
        message: "Mã giảm giá không tồn tại!"
      })
      return
    }

    await Coupon.updateOne({
      _id: id
    }, {
      deleted: true,
      deletedAt: Date.now()
    })

    await writeLog(req, res, {
      module: "coupon",
      action: "delete",
      description: `Xoá mã giảm giá "${couponDetail.code}" vào thùng rác`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Xoá mã giảm giá thành công"
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

    const couponDetail = await Coupon.findOne({
      _id: id,
      deleted: true
    })

    if(!couponDetail){
      res.json({
        code: "error",
        message: "Mã giảm giá không tồn tại!"
      })
      return
    }

    await Coupon.updateOne({
      _id: id
    }, {
      deleted: false
    })

    await writeLog(req, res, {
      module: "coupon",
      action: "undo",
      description: `Khôi phục mã giảm giá "${couponDetail.code}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Khôi phục mã giảm giá thành công"
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

    const couponDetail = await Coupon.findOne({
      _id: id,
      deleted: true
    })

    if(!couponDetail){
      res.json({
        code: "error",
        message: "Mã giảm giá không tồn tại!"
      })
      return
    }

    await Coupon.deleteOne({
      _id: id
    })

    await writeLog(req, res, {
      module: "coupon",
      action: "delete-permanently",
      description: `Xoá vĩnh viễn mã giảm giá "${couponDetail.code}"`,
      targetId: id
    })

    res.json({
      code: "success",
      message: "Mã giảm giá đã được xoá vĩnh viễn"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Data không hợp lệ!"
    })
  }
}

// Tìm sản phẩm để chọn sản phẩm áp dụng mã (ô tìm kiếm ở trang tạo/sửa mã giảm giá)
// Tìm theo tên (Việt / Nga), SKU, mã vạch, thương hiệu; không nhập từ khoá thì lấy sản phẩm mới nhất
export const productSearch = async (req: Request, res: Response) => {
  try {
    const find: {
      deleted: boolean,
      search?: RegExp
    } = {
      deleted: false
    }

    if(req.query.keyword){
      find.search = keywordToRegex(`${req.query.keyword}`)
    }

    const productList = await Product
      .find(find)
      .sort({
        createdAt: "desc"
      })
      .limit(20)
      .select("name nameRu sku avatar price status")

    res.json({
      code: "success",
      productList: productList.map(product => ({
        id: product.id,
        name: product.name,
        nameRu: product.nameRu,
        sku: product.sku,
        avatar: product.avatar,
        priceFormat: formatPrice(product.price),
        status: product.status
      }))
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Tìm sản phẩm thất bại, vui lòng thử lại!"
    })
  }
}
