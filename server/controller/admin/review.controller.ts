import { Request, Response } from "express"
import mongoose from "mongoose"
import slugify from "slugify"
import { Review } from "../../models/review.model"
import { Product } from "../../models/product.model"
import { reviewModeration, reviewStatusList } from "../../config/variable.config"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { writeLog } from "../../helpers/activity-log.helper"
import { cleanReviewText, deleteReview, updateProductRating } from "../../helpers/review.helper"

// ===== Quản lý đánh giá sản phẩm (trang admin) =====
// - Duyệt: đánh giá hiện trên trang sản phẩm, được tính vào điểm trung bình
// - Từ chối: đánh giá bị ẩn, khách thấy lý do ở trang "Мои отзывы" và sửa lại được
// - Trả lời: hiện dưới đánh giá ("Ответ магазина SFoodie")
// - Xoá: xoá hẳn đánh giá và ảnh (ví dụ spam), khách viết lại được

const sendError = (res: Response, message: string) => {
  res.json({ code: "error", message: message })
}

// Tên nhân viên ghi vào đánh giá (người duyệt, người trả lời)
const getAdminName = (res: Response): string => {
  const account = res.locals.account
  return account ? `${account.fullName} (${account.email})` : "Admin"
}

const findReview = async (id: any) => {
  if(!mongoose.isValidObjectId(id)) return null
  return await Review.findById(id)
}

// Mô tả ngắn để ghi nhật ký hoạt động, ví dụ: đánh giá 5★ của "Анна Иванова" cho sản phẩm "Mì Hảo Hảo"
const describeReview = async (review: any): Promise<string> => {
  const product: any = mongoose.isValidObjectId(review.productId)
    ? await Product.findById(review.productId).select("name")
    : null
  return `đánh giá ${review.rating}★ của "${review.customerName}" (đơn ${review.orderCode}) cho sản phẩm "${product?.name || review.productId}"`
}

// Từ khoá => điều kiện tìm (chữ gốc hoặc chữ đã chuyển sang latin)
const buildKeywordFind = (keyword: string) => {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const raw = keyword.trim().toLowerCase()
  const slug = slugify(raw, { replacement: " ", lower: true })
  const orList: any[] = [{ search: new RegExp(escape(raw), "i") }]
  if(slug && slug !== raw) orList.push({ search: new RegExp(escape(slug), "i") })
  return { $or: orList }
}

export const list = async (req: Request, res: Response) => {
  const find: any = {}

  const keyword = `${req.query.keyword || ""}`.trim().slice(0, 100)
  if(keyword){
    Object.assign(find, buildKeywordFind(keyword))
  }

  if(reviewStatusList.some(item => item.id === req.query.status)){
    find.status = `${req.query.status}`
  }

  const rating = Number(req.query.rating)
  if([1, 2, 3, 4, 5].includes(rating)){
    find.rating = rating
  }

  // Loại: có ảnh / có chữ hoặc ảnh / chỉ chấm sao
  if(req.query.type === "photo"){
    find.hasPhoto = true
  }
  else if(req.query.type === "content"){
    find.hasContent = true
  }
  else if(req.query.type === "rating-only"){
    find.hasContent = false
  }

  // Đánh giá của 1 sản phẩm (link từ trang danh sách sản phẩm)
  if(typeof req.query.productId === "string" && mongoose.isValidObjectId(req.query.productId)){
    find.productId = req.query.productId
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Math.floor(Number(req.query.page))
  }
  const totalRecord = await Review.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const reviewList: any[] = await Review
    .find(find)
    .sort({ createdAt: "desc", _id: "desc" })
    .limit(limitItem)
    .skip(skip)

  const productList: any[] = await Product
    .find({ _id: { $in: reviewList.map(review => review.productId).filter(id => mongoose.isValidObjectId(id)) } })
    .select("name nameRu slug avatar images deleted status rating ratingCount")

  for (const review of reviewList) {
    review.statusInfo = reviewStatusList.find(item => item.id === review.status) || reviewStatusList[0]
    review.createdAtFormat = formatShopDateTime(review.createdAt)
    review.editedAtFormat = formatShopDateTime(review.editedAt)
    review.replyAtFormat = formatShopDateTime(review.reply?.at)
    review.productInfo = productList.find(product => product.id === review.productId) || null
    if(review.productInfo){
      review.productImage = [review.productInfo.avatar, ...(review.productInfo.images || [])]
        .find(path => path && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(path)) || ""
    }
  }

  // Sản phẩm đang lọc (hiện tên ở đầu trang)
  const filterProduct = find.productId ? await Product.findById(find.productId).select("name") : null

  res.render("admin/pages/review-list", {
    pageTitle: "Đánh giá sản phẩm",
    reviewList: reviewList,
    statusList: reviewStatusList,
    pendingCount: await Review.countDocuments({ status: "pending" }),
    moderation: reviewModeration,
    filter: {
      keyword: keyword,
      status: find.status || "",
      rating: find.rating || "",
      type: ["photo", "content", "rating-only"].includes(`${req.query.type}`) ? `${req.query.type}` : "",
      productId: find.productId || ""
    },
    filterProduct: filterProduct,
    pagination: pagination,
    page: page
  })
}

// Duyệt: PATCH /admin/review/approve/:id
export const approvePatch = async (req: Request, res: Response) => {
  try {
    const review: any = await findReview(req.params.id)
    if(!review){
      sendError(res, "Không tìm thấy đánh giá")
      return
    }
    if(review.status === "published"){
      sendError(res, "Đánh giá này đã được đăng")
      return
    }

    await Review.updateOne({ _id: review._id }, {
      $set: {
        status: "published",
        rejectReason: "",
        publishedAt: review.publishedAt || new Date(),
        moderatedBy: getAdminName(res)
      }
    })
    await updateProductRating(review.productId)

    await writeLog(req, res, {
      module: "review",
      action: "approve",
      description: `Duyệt ${await describeReview(review)}`,
      targetId: review.id
    })

    res.json({ code: "success", message: "Đã duyệt, đánh giá đã hiện trên trang sản phẩm" })
  } catch (error) {
    console.log(error)
    sendError(res, "Có lỗi xảy ra, vui lòng thử lại!")
  }
}

// Từ chối (ẩn khỏi trang sản phẩm): PATCH /admin/review/reject/:id { reason }
export const rejectPatch = async (req: Request, res: Response) => {
  try {
    const review: any = await findReview(req.params.id)
    if(!review){
      sendError(res, "Không tìm thấy đánh giá")
      return
    }
    if(review.status === "rejected"){
      sendError(res, "Đánh giá này đã bị từ chối")
      return
    }

    const reason = cleanReviewText(req.body?.reason, 500)
    await Review.updateOne({ _id: review._id }, {
      $set: {
        status: "rejected",
        rejectReason: reason,
        moderatedBy: getAdminName(res)
      }
    })
    if(review.status === "published"){
      await updateProductRating(review.productId)
    }

    await writeLog(req, res, {
      module: "review",
      action: "reject",
      description: `Từ chối ${await describeReview(review)}${reason ? `. Lý do: ${reason}` : ""}`,
      targetId: review.id
    })

    res.json({ code: "success", message: "Đã từ chối, đánh giá không còn hiện trên trang sản phẩm" })
  } catch (error) {
    console.log(error)
    sendError(res, "Có lỗi xảy ra, vui lòng thử lại!")
  }
}

// Trả lời (để trống là xoá câu trả lời): PATCH /admin/review/reply/:id { reply }
export const replyPatch = async (req: Request, res: Response) => {
  try {
    const review: any = await findReview(req.params.id)
    if(!review){
      sendError(res, "Không tìm thấy đánh giá")
      return
    }

    const text = cleanReviewText(req.body?.reply, 2000)
    if(text){
      await Review.updateOne({ _id: review._id }, {
        $set: {
          reply: {
            text: text,
            by: getAdminName(res),
            at: new Date()
          }
        }
      })
    }
    else {
      await Review.updateOne({ _id: review._id }, { $unset: { reply: "" } })
    }

    await writeLog(req, res, {
      module: "review",
      action: "reply",
      description: `${text ? "Trả lời" : "Xoá câu trả lời của"} ${await describeReview(review)}`,
      targetId: review.id
    })

    res.json({ code: "success", message: text ? "Đã lưu câu trả lời" : "Đã xoá câu trả lời" })
  } catch (error) {
    console.log(error)
    sendError(res, "Có lỗi xảy ra, vui lòng thử lại!")
  }
}

// Xoá hẳn (cả ảnh): DELETE /admin/review/delete/:id
export const deleteDel = async (req: Request, res: Response) => {
  try {
    const review: any = await findReview(req.params.id)
    if(!review){
      sendError(res, "Không tìm thấy đánh giá")
      return
    }

    const description = await describeReview(review)
    await deleteReview(review)

    await writeLog(req, res, {
      module: "review",
      action: "delete-permanently",
      description: `Xoá ${description}`,
      targetId: review.id
    })

    res.json({ code: "success", message: "Đã xoá đánh giá" })
  } catch (error) {
    console.log(error)
    sendError(res, "Có lỗi xảy ra, vui lòng thử lại!")
  }
}
