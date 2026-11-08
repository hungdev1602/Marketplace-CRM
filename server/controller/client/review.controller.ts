import { Request, Response } from "express"
import mongoose from "mongoose"
import { Review } from "../../models/review.model"
import { ReviewVote } from "../../models/review-vote.model"
import { Product } from "../../models/product.model"
import {
  reviewEditDays,
  reviewMaxPhotos,
  reviewModeration,
  reviewPhotoMaxSide,
  reviewPhotoMaxSize,
  reviewStatusList,
  reviewTextMaxLength
} from "../../config/variable.config"
import { addProductDisplayInfo } from "../../helpers/client-product.helper"
import { isValidProductId } from "../../helpers/client-token.helper"
import { findCustomerOrder, getOrderUrl } from "../../helpers/order.helper"
import {
  buildAuthorName,
  buildReviewSearch,
  canEditReview,
  cleanReviewText,
  deleteReview,
  deleteReviewPhotos,
  findProductReviews,
  formatReviewDate,
  getAccountWaitingReviews,
  getReviewCustomerKey,
  getReviewListFilter,
  getReviewPhotoType,
  getReviewWriteUrl,
  getUserVoteMap,
  isOrderReviewable,
  updateProductRating,
  updateReviewVoteCount,
  uploadReviewPhotos
} from "../../helpers/review.helper"
import * as errorController from "./error.controller"

// ===== Đánh giá sản phẩm (trang khách hàng) =====
// - Viết / sửa đánh giá: /review/write/:mã đơn/:id sản phẩm?key=... (chỉ đơn đã giao)
// - Danh sách đánh giá của sản phẩm (tải thêm, lọc): /review/product/:id sản phẩm (trả về HTML)
// - "Полезный отзыв?": POST /review/:id/vote
// - Đánh giá của tài khoản: /account/reviews

const sendError = (res: Response, key: string, field?: string) => {
  res.json({ code: "error", message: res.locals.t(key), field: field })
}

// Dữ liệu hiển thị 1 đánh giá (trang sản phẩm, trang "Мои отзывы")
export const buildReviewView = (review: any, res: Response, voteMap: { [reviewId: string]: number } = {}) => {
  const account = res.locals.clientAccount
  const authorName = review.anonymous || !review.authorName ? res.locals.t("reviewAnonymous") : review.authorName
  return {
    review: review,
    authorName: authorName,
    authorInitial: `${authorName}`.trim().charAt(0).toUpperCase() || "?",
    dateText: formatReviewDate(review.createdAt, res.locals.lang),
    replyDateText: review.reply?.text ? formatReviewDate(review.reply.at, res.locals.lang) : "",
    myVote: voteMap[review.id] || 0,
    isMine: !!(account && review.userId && review.userId === account.id)
  }
}

// Tìm đơn hàng + sản phẩm khách muốn đánh giá (đúng mã bí mật của đơn, hoặc đơn của tài khoản đang đăng nhập)
const findReviewContext = async (req: Request, res: Response, key: any) => {
  const order: any = await findCustomerOrder(req.params.code, key, res.locals.clientAccount)
  if(!order) return null

  const productId = `${req.params.productId || ""}`
  if(!isValidProductId(productId)) return null

  const item = order.items.find((orderItem: any) => orderItem.productId === productId)
  if(!item) return null

  const [product, review]: any[] = await Promise.all([
    Product.findOne({ _id: productId, deleted: false }),
    Review.findOne({ customerKey: getReviewCustomerKey(order), productId: productId })
  ])

  return { order, item, product, review }
}

// Lý do không viết / sửa được đánh giá (key từ ngữ), trống là được
const getBlockedKey = (context: { order: any, product: any, review: any }): string => {
  if(!isOrderReviewable(context.order)) return "reviewNotDelivered"
  if(!context.product && !context.review) return "reviewProductUnavailable"
  if(context.review && !canEditReview(context.review)) return "reviewEditExpired"
  return ""
}

// Viết xong / xoá xong thì quay về: trang "Мои отзывы" (đơn của tài khoản), không thì trang đơn hàng
const getBackUrl = (order: any, res: Response): string => {
  const account = res.locals.clientAccount
  return account && order.userId === account.id ? "/account/reviews" : getOrderUrl(order)
}

// Trang viết / sửa đánh giá: /review/write/:code/:productId?key=...&rating=5
export const write = async (req: Request, res: Response) => {
  // Link có mã bí mật của đơn hàng: tải ảnh, link ngoài,... chỉ gửi tên miền (header Referer), không gửi mã
  res.set("Referrer-Policy", "strict-origin")

  try {
    const context = await findReviewContext(req, res, req.query.key)
    if(!context){
      errorController.notFound(req, res)
      return
    }

    const { order, item, product, review } = context
    if(product) addProductDisplayInfo([product])

    const presetRating = Number(req.query.rating)
    const statusInfo = review ? reviewStatusList.find(status => status.id === review.status) : null

    res.render("client/pages/review-write", {
      pageTitle: `${res.locals.t(review ? "reviewEditTitle" : "reviewWriteTitle")} — SFoodie`,
      order: order,
      item: item,
      product: product,
      review: review,
      blockedKey: getBlockedKey(context),
      accessKey: order.accessKey,
      orderUrl: getOrderUrl(order),
      backUrl: getBackUrl(order, res),
      productName: res.locals.tName(product || item),
      productImage: product ? product.cardImage : item.image,
      rating: review?.rating || ([1, 2, 3, 4, 5].includes(presetRating) ? presetRating : 0),
      authorName: review?.authorName || buildAuthorName(order.customer?.fullName) || res.locals.t("reviewAnonymous"),
      orderDateText: formatReviewDate(order.createdAt, res.locals.lang),
      formAction: `/review/write/${order.code}/${item.productId}`,
      statusName: statusInfo ? res.locals.tName(statusInfo) : "",
      editUntilText: review
        ? formatReviewDate(new Date(new Date(review.createdAt).getTime() + reviewEditDays * 24 * 60 * 60 * 1000), res.locals.lang)
        : "",
      moderation: reviewModeration,
      limits: {
        maxPhotos: reviewMaxPhotos,
        photoMaxSide: reviewPhotoMaxSide,
        photoMaxSize: reviewPhotoMaxSize,
        text: reviewTextMaxLength
      }
    })
  } catch (error) {
    console.log(error)
    errorController.notFound(req, res)
  }
}

// Gửi đánh giá (viết mới hoặc sửa): POST /review/write/:code/:productId
// multipart/form-data: key, rating, pros, cons, comment, anonymous, keepPhotos (ảnh cũ giữ lại), photos (ảnh mới)
export const writePost = async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || []

  try {
    const context = await findReviewContext(req, res, req.body.key)
    if(!context){
      sendError(res, "orderNotFound")
      return
    }

    const blockedKey = getBlockedKey(context)
    if(blockedKey){
      sendError(res, blockedKey)
      return
    }

    const { order, item, product, review } = context
    const productId = item.productId

    // Ảnh cũ khách giữ lại: chỉ nhận ảnh đang có trong đánh giá (không nhận đường dẫn lạ)
    let keepRequest: string[] = []
    try {
      const parsed = JSON.parse(req.body.keepPhotos || "[]")
      if(Array.isArray(parsed)) keepRequest = parsed.map(photo => `${photo}`)
    } catch (error) {}
    const keepPhotos: string[] = (review?.photos || []).filter((photo: string) => keepRequest.includes(photo))

    if(keepPhotos.length + files.length > reviewMaxPhotos){
      res.json({ code: "error", message: res.locals.t("reviewPhotoTooMany").replace("{count}", `${reviewMaxPhotos}`) })
      return
    }
    if(files.some(file => !getReviewPhotoType(file.buffer))){
      sendError(res, "reviewPhotoInvalid")
      return
    }

    const pros = cleanReviewText(req.body.pros, reviewTextMaxLength.pros)
    const cons = cleanReviewText(req.body.cons, reviewTextMaxLength.cons)
    const comment = cleanReviewText(req.body.comment, reviewTextMaxLength.comment)

    let newPhotos: string[] = []
    if(files.length > 0){
      try {
        newPhotos = await uploadReviewPhotos(files)
      } catch (error) {
        console.log("Tải ảnh đánh giá lên server Quản lý file thất bại:", (error as Error).message)
        sendError(res, "reviewPhotoUploadError")
        return
      }
    }

    const photos = [...keepPhotos, ...newPhotos]
    const hasContent = !!(pros || cons || comment) || photos.length > 0

    // Chờ duyệt khi: bật duyệt, có chữ / ảnh, và nội dung mới (sửa mỗi số sao của đánh giá đã đăng thì vẫn giữ đã đăng)
    const contentChanged = !review
      || review.status !== "published"
      || pros !== (review.pros || "")
      || cons !== (review.cons || "")
      || comment !== (review.comment || "")
      || photos.join("|") !== (review.photos || []).join("|")
    const status = reviewModeration && hasContent && contentChanged ? "pending" : "published"

    const data: any = {
      rating: req.body.rating,
      pros: pros,
      cons: cons,
      comment: comment,
      photos: photos,
      hasContent: hasContent,
      hasPhoto: photos.length > 0,
      anonymous: req.body.anonymous === "1" || req.body.anonymous === "on",
      status: status,
      rejectReason: "",
      publishedAt: status === "published" ? (review?.publishedAt || new Date()) : null,
      search: buildReviewSearch({
        productName: product?.name || item.name || "",
        productNameRu: product?.nameRu || item.nameRu || "",
        customerName: order.customer?.fullName || "",
        customerEmail: order.customer?.email || "",
        orderCode: review?.orderCode || order.code,
        pros: pros,
        cons: cons,
        comment: comment
      })
    }

    let saved: any
    if(review){
      saved = await Review.findOneAndUpdate({ _id: review._id }, {
        $set: { ...data, editedAt: new Date() }
      }, { new: true })
    }
    else {
      try {
        saved = await Review.create({
          ...data,
          productId: productId,
          orderId: order.id,
          orderCode: order.code,
          userId: order.userId || "",
          customerKey: getReviewCustomerKey(order),
          customerName: order.customer?.fullName || "",
          customerEmail: order.customer?.email || "",
          authorName: buildAuthorName(order.customer?.fullName),
          lang: res.locals.lang
        })
      } catch (error: any) {
        await deleteReviewPhotos(newPhotos)
        if(error?.code === 11000){
          sendError(res, "reviewAlreadyExists")
          return
        }
        throw error
      }
    }

    // Ảnh khách đã bỏ khi sửa
    const removedPhotos = (review?.photos || []).filter((photo: string) => !photos.includes(photo))
    if(removedPhotos.length > 0){
      await deleteReviewPhotos(removedPhotos)
    }

    if(review?.status === "published" || saved.status === "published"){
      await updateProductRating(productId)
    }

    res.json({
      code: "success",
      message: res.locals.t(saved.status === "pending" ? "reviewSentModeration" : "reviewPublished"),
      redirect: getBackUrl(order, res)
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Xoá đánh giá của mình: POST /review/write/:code/:productId/delete { key }
export const deletePost = async (req: Request, res: Response) => {
  try {
    const context = await findReviewContext(req, res, req.body?.key)
    if(!context?.review){
      sendError(res, "reviewNotFound")
      return
    }
    if(!canEditReview(context.review)){
      sendError(res, "reviewEditExpired")
      return
    }

    await deleteReview(context.review)

    res.json({
      code: "success",
      message: res.locals.t("reviewDeleted"),
      redirect: getBackUrl(context.order, res)
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Danh sách đánh giá của sản phẩm (HTML, main.js chèn vào trang sản phẩm khi lọc / bấm "Показать ещё")
// GET /review/product/:productId?rating=5&photo=1&sort=helpful&page=2
export const productReviews = async (req: Request, res: Response) => {
  try {
    const productId = `${req.params.productId || ""}`
    if(!isValidProductId(productId)){
      res.status(404).send("")
      return
    }

    const filter = getReviewListFilter(req.query)
    const reviewResult = await findProductReviews(productId, filter)
    const voteMap = await getUserVoteMap(reviewResult.reviewList.map(review => review.id), res.locals.clientAccount?.id)

    res.render("client/partials/review-list", {
      reviewViewList: reviewResult.reviewList.map(review => buildReviewView(review, res, voteMap)),
      reviewResult: reviewResult,
      reviewFilter: filter
    })
  } catch (error) {
    console.log(error)
    res.status(500).send("")
  }
}

// "Полезный отзыв?" 👍 / 👎: POST /review/:id/vote { value: 1 | -1 }
// Bấm lại đúng nút đã bấm thì bỏ lượt bấm. Chỉ khách đã đăng nhập, không bấm cho đánh giá của chính mình
export const votePost = async (req: Request, res: Response) => {
  try {
    const account = res.locals.clientAccount
    if(!account){
      res.json({
        code: "error",
        message: res.locals.t("reviewVoteLogin"),
        login: true
      })
      return
    }

    const id = `${req.params.id || ""}`
    const value = Number(req.body?.value)
    if(!mongoose.isValidObjectId(id) || ![1, -1].includes(value)){
      sendError(res, "reviewNotFound")
      return
    }

    const review: any = await Review.findOne({ _id: id, status: "published" })
    if(!review){
      sendError(res, "reviewNotFound")
      return
    }
    if(review.userId && review.userId === account.id){
      sendError(res, "reviewVoteOwn")
      return
    }

    const existVote: any = await ReviewVote.findOne({ reviewId: id, userId: account.id })
    let myVote = value
    if(existVote && Number(existVote.value) === value){
      await ReviewVote.deleteOne({ _id: existVote._id })
      myVote = 0
    }
    else if(existVote){
      await ReviewVote.updateOne({ _id: existVote._id }, { value: value })
    }
    else {
      try {
        await ReviewVote.create({ reviewId: id, userId: account.id, value: value })
      } catch (error: any) {
        // Bấm 2 lần cùng lúc: lượt bấm đã được tạo ở lần trước
        if(error?.code !== 11000) throw error
        await ReviewVote.updateOne({ reviewId: id, userId: account.id }, { value: value })
      }
    }

    const counts = await updateReviewVoteCount(id)
    res.json({ code: "success", myVote: myVote, ...counts })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Trang "Мои отзывы": /account/reviews (phải đăng nhập)
// - Ждут оценки: sản phẩm trong các đơn đã giao chưa được đánh giá
// - Мои отзывы: đánh giá đã viết (trạng thái duyệt, lý do bị từ chối, câu trả lời của cửa hàng)
export const accountReviews = async (req: Request, res: Response) => {
  const account = res.locals.clientAccount

  const [waitingList, reviewList] = await Promise.all([
    getAccountWaitingReviews(account.id),
    Review.find({ customerKey: `user:${account.id}` }).sort({ createdAt: -1 }).limit(200)
  ])

  const productList: any[] = await Product
    .find({ _id: { $in: reviewList.map(review => review.productId).filter(id => isValidProductId(id)) } })
    .select("name nameRu slug avatar images deleted status")
  addProductDisplayInfo(productList)
  addProductDisplayInfo(waitingList.map(waiting => waiting.product))

  res.render("client/pages/account-reviews", {
    pageTitle: `${res.locals.t("myReviews")} — SFoodie`,
    waitingViewList: waitingList.map(waiting => ({
      ...waiting,
      writeUrl: getReviewWriteUrl(waiting.order, waiting.item.productId),
      starUrls: [1, 2, 3, 4, 5].map(star => getReviewWriteUrl(waiting.order, waiting.item.productId, { rating: star }))
    })),
    myReviewViewList: reviewList.map(review => {
      const product = productList.find(item => item.id === review.productId)
      const statusInfo = reviewStatusList.find(status => status.id === review.status) || reviewStatusList[0]
      return {
        ...buildReviewView(review, res),
        product: product && !product.deleted ? product : null,
        statusName: res.locals.tName(statusInfo),
        canEdit: canEditReview(review),
        editUrl: `/review/write/${review.orderCode}/${review.productId}`
      }
    })
  })
}
