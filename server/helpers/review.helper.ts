import crypto from "crypto"
import path from "path"
import axios from "axios"
import FormData from "form-data"
import slugify from "slugify"
import { Review } from "../models/review.model"
import { ReviewVote } from "../models/review-vote.model"
import { Product } from "../models/product.model"
import { Order } from "../models/order.model"
import { Media } from "../models/media.model"
import {
  domainFileManager,
  reviewEditDays,
  reviewImageFolder,
  reviewPerPage,
  reviewPreviewLength,
  reviewReplyPreviewLength,
  reviewRequestDelayHours,
  reviewRequestEmail,
  reviewRequestMaxDays
} from "../config/variable.config"
import { detectImageType } from "./remote-image.helper"
import { isValidProductId } from "./client-token.helper"
import { localizedName, translate } from "./language.helper"
import { sendMail } from "./mail.helper"
import { getSiteUrl } from "./site-url.helper"
import { getOrderUrl } from "./order.helper"

const pug = require("pug") // dùng require vì thư viện pug không có sẵn khai báo kiểu cho TypeScript

// ===== Đánh giá sản phẩm =====
// Quy trình (giống Wildberries):
// 1. Đơn hàng chuyển sang "Đã giao hàng" => ở trang đơn hàng, trang "Мои отзывы" hiện nút chấm sao cho từng sản phẩm,
//    sau reviewRequestDelayHours giờ khách nhận email "Как вам покупка?" có link chấm sao
// 2. Khách chấm sao, viết ưu điểm / nhược điểm / nhận xét, thêm ảnh (trang /review/write/:mã đơn/:id sản phẩm)
// 3. Đánh giá có chữ / ảnh chờ nhân viên duyệt (reviewModeration), duyệt xong thì hiện ở trang sản phẩm
//    và được tính vào điểm trung bình của sản phẩm

// Nhận diện khách viết đánh giá: tài khoản (nếu đặt hàng khi đã đăng nhập), không thì theo email đặt hàng
// Mỗi khách chỉ đánh giá mỗi sản phẩm 1 lần, dù mua sản phẩm đó nhiều lần
export const getReviewCustomerKey = (order: any): string => {
  if(order.userId) return `user:${order.userId}`
  return `email:${`${order.customer?.email || ""}`.trim().toLowerCase()}`
}

// Tên hiện công khai: tên + chữ cái đầu của họ, ví dụ "Анна Иванова" => "Анна И."
// (ô "Имя и фамилия" ở trang đặt hàng: chữ đầu là tên, chữ sau là họ)
export const buildAuthorName = (fullName: string): string => {
  const words = `${fullName || ""}`.trim().split(/\s+/).filter(Boolean)
  if(words.length === 0) return ""
  const firstName = words[0].slice(0, 30)
  return words[1] ? `${firstName} ${words[1][0].toUpperCase()}.` : firstName
}

// Chỉ đơn đã giao mới được đánh giá
export const isOrderReviewable = (order: any): boolean => {
  return order?.status === "delivered"
}

// Khách còn được sửa / xoá đánh giá (trong reviewEditDays ngày kể từ lúc viết)
export const canEditReview = (review: any): boolean => {
  if(!review?.createdAt) return true
  return Date.now() - new Date(review.createdAt).getTime() < reviewEditDays * 24 * 60 * 60 * 1000
}

// Link trang viết đánh giá (có mã bí mật của đơn hàng, khách chưa đăng nhập cũng mở được)
// - rating: chọn sẵn số sao (khách bấm ngôi sao ở trang đơn hàng / trong email)
export const getReviewWriteUrl = (order: any, productId: string, options: { rating?: number, absolute?: boolean } = {}): string => {
  const ratingQuery = options.rating ? `&rating=${options.rating}` : ""
  return `${options.absolute ? getSiteUrl() : ""}/review/write/${order.code}/${productId}?key=${order.accessKey}${ratingQuery}`
}

// Đánh giá của từng sản phẩm trong đơn đã giao (trang đơn hàng, email nhắc đánh giá)
// Trả về { id sản phẩm: { canReview, review } }
// - canReview: sản phẩm còn trên web (chưa bị xoá) hoặc khách đã có đánh giá (sửa được)
export const getOrderReviewMap = async (order: any) => {
  const map: { [productId: string]: { canReview: boolean, review: any } } = {}
  if(!isOrderReviewable(order)) return map

  const productIds = [...new Set<string>(order.items.map((item: any) => item.productId))]
    .filter(id => isValidProductId(id))
  if(productIds.length === 0) return map

  const [productList, reviewList] = await Promise.all([
    Product.find({ _id: { $in: productIds }, deleted: false }).select("_id"),
    Review.find({ customerKey: getReviewCustomerKey(order), productId: { $in: productIds } })
  ])

  for (const productId of productIds) {
    const review = reviewList.find(item => item.productId === productId) || null
    map[productId] = {
      canReview: !!review || productList.some(item => item.id === productId),
      review: review
    }
  }
  return map
}

// Sản phẩm chờ đánh giá của 1 tài khoản (trang "Мои отзывы", số trên trang tài khoản):
// sản phẩm trong các đơn đã giao, chưa được đánh giá, còn trên web; mỗi sản phẩm 1 lần (lấy đơn mới nhất)
export const getAccountWaitingReviews = async (accountId: string) => {
  const [orderList, reviewList]: any[][] = await Promise.all([
    Order
      .find({ userId: accountId, status: "delivered" })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("code accessKey userId status items createdAt"),
    Review.find({ customerKey: `user:${accountId}` }).select("productId")
  ])

  const reviewedIds = new Set(reviewList.map(review => review.productId))
  const candidateList: { order: any, item: any }[] = []
  for (const order of orderList) {
    for (const item of order.items) {
      if(!isValidProductId(item.productId) || reviewedIds.has(item.productId)) continue
      if(candidateList.some(candidate => candidate.item.productId === item.productId)) continue
      candidateList.push({ order, item })
    }
  }
  if(candidateList.length === 0) return []

  const productList: any[] = await Product
    .find({ _id: { $in: candidateList.map(candidate => candidate.item.productId) }, deleted: false })
    .select("name nameRu slug avatar images")

  return candidateList
    .map(candidate => ({ ...candidate, product: productList.find(product => product.id === candidate.item.productId) }))
    .filter(candidate => candidate.product)
}

// Làm sạch chữ khách nhập: bỏ ký tự điều khiển, gộp nhiều dòng trống, cắt theo độ dài tối đa
export const cleanReviewText = (value: any, maxLength: number): string => {
  return `${value ?? ""}`
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength)
}

// Cắt chữ còn tối đa maxLength ký tự, cắt ở chỗ khoảng trắng gần nhất (không cắt giữa từ), thêm "…"
const cutText = (text: string, maxLength: number): string => {
  if(text.length <= maxLength) return text
  let cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  if(lastSpace > maxLength - 25) cut = cut.slice(0, lastSpace)
  return `${cut.replace(/[\s,.;:!?-]+$/, "")}…`
}

// Đoạn đầu của đánh giá hiện trên thẻ trong slider (trang sản phẩm)
// - Gộp ưu điểm, nhược điểm, nhận xét theo thứ tự, tổng cộng tối đa reviewPreviewLength ký tự, xuống dòng đổi thành dấu cách
// - truncated: đánh giá dài hơn => hiện nút "Читать полностью", bấm mới tải toàn bộ (GET /review/item/:id)
// Chỉ gửi đoạn đầu cho trình duyệt: đánh giá rất dài không làm trang sản phẩm nặng
export const buildReviewPreview = (review: any) => {
  const fieldList = [
    { key: "reviewPros", text: review.pros },
    { key: "reviewCons", text: review.cons },
    { key: "reviewComment", text: review.comment }
  ]
    .map(field => ({ key: field.key, text: `${field.text || ""}`.replace(/\s+/g, " ").trim() }))
    .filter(field => field.text)

  const partList: { key: string, text: string }[] = []
  let budget = reviewPreviewLength
  let truncated = false
  for (const field of fieldList) {
    // Còn ít chỗ quá thì không hiện thêm mục mới (tránh "Недостатки: Ма…")
    if(budget < 40 && partList.length > 0){
      truncated = true
      break
    }
    if(field.text.length > budget){
      partList.push({ key: field.key, text: cutText(field.text, budget) })
      truncated = true
      break
    }
    partList.push(field)
    budget -= field.text.length
  }

  const replyText = `${review.reply?.text || ""}`.replace(/\s+/g, " ").trim()
  const replyPreview = cutText(replyText, reviewReplyPreviewLength)

  return {
    partList: partList,
    replyText: replyPreview,
    truncated: truncated || replyPreview !== replyText
  }
}

// Chuỗi tìm kiếm ở trang admin: chữ gốc (tiếng Nga) + chữ đã chuyển sang latin
export const buildReviewSearch = (data: {
  productName: string,
  productNameRu: string,
  customerName: string,
  customerEmail: string,
  orderCode: string,
  pros: string,
  cons: string,
  comment: string
}): string => {
  const text = Object.values(data).filter(Boolean).join(" ").toLowerCase().slice(0, 6000)
  return `${text} ${slugify(text, { replacement: " ", lower: true })}`
}

// Ngày viết đánh giá theo ngôn ngữ, ví dụ "8 ноября 2026" / "8 tháng 11, 2026"
export const formatReviewDate = (date: any, lang: string): string => {
  if(!date) return ""
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow"
  }).format(new Date(date)).replace(/\s?г\.$/, "")
}

// ===== Ảnh đánh giá: lưu trên server Quản lý file (thư mục /media/danh-gia) =====
// Ảnh khách gửi lên phải là JPG, PNG, WEBP (kiểm tra theo nội dung file, không tin đuôi file)
export const getReviewPhotoType = (buffer: Buffer) => {
  const type = detectImageType(buffer)
  return type && type.mimetype !== "image/gif" ? type : undefined
}

// Tạo thư mục lưu ảnh (đã có thì server Quản lý file báo "đã tồn tại", bỏ qua)
// Không kết nối được server Quản lý file thì lần sau thử tạo lại
let reviewFolderReady: Promise<any> | undefined
const ensureReviewFolder = () => {
  if(!reviewFolderReady){
    const formData = new FormData()
    formData.append("folderName", reviewImageFolder)
    reviewFolderReady = axios.post(`${domainFileManager}/file-manager/folder/create`, formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    }).catch(() => {
      reviewFolderReady = undefined
    })
  }
  return reviewFolderReady
}

// Tải ảnh lên server Quản lý file, trả về đường dẫn ảnh (/media/danh-gia/...)
// Tên file do server tự đặt (chuỗi ngẫu nhiên), không dùng tên file của khách
export const uploadReviewPhotos = async (files: Express.Multer.File[]): Promise<string[]> => {
  if(files.length === 0) return []

  await ensureReviewFolder()

  const formData = new FormData()
  for (const file of files) {
    const type = getReviewPhotoType(file.buffer)
    if(!type) throw new Error("Ảnh không hợp lệ")
    formData.append("files", file.buffer, {
      filename: `${crypto.randomBytes(6).toString("hex")}.${type.extension}`,
      contentType: type.mimetype
    })
  }
  formData.append("folderPath", reviewImageFolder)

  const response = await axios.post(`${domainFileManager}/file-manager/upload`, formData, {
    headers: formData.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000
  })
  if(response.data?.code !== "success"){
    throw new Error(response.data?.message || "Lỗi upload ảnh đánh giá")
  }

  // Lưu vào database để ảnh hiện ở trang Quản lý file của admin (thư mục danh-gia)
  const saveLinks: { folder: string, filename: string }[] = response.data.saveLinks
  await Media.insertMany(saveLinks)
  return saveLinks.map(item => `${item.folder}/${item.filename}`)
}

// Xoá ảnh đánh giá (khách bỏ ảnh khi sửa, xoá đánh giá). Chỉ xoá file trong thư mục ảnh đánh giá
// Lỗi thì chỉ in ra terminal (ảnh thừa không ảnh hưởng khách, xoá tay được ở trang Quản lý file)
export const deleteReviewPhotos = async (photoList: string[]) => {
  for (const photo of photoList) {
    const index = `${photo}`.lastIndexOf("/")
    const folder = photo.slice(0, index)
    const filename = photo.slice(index + 1)
    if(folder !== `/media/${reviewImageFolder}` || !filename || filename.includes("..")) continue

    try {
      const formData = new FormData()
      formData.append("folder", folder)
      formData.append("fileName", filename)
      await axios.patch(`${domainFileManager}/file-manager/delete-file`, formData, {
        headers: formData.getHeaders(),
        timeout: 15000
      })
      await Media.deleteOne({ folder: folder, filename: filename })
    } catch (error) {
      console.log(`Không xoá được ảnh đánh giá ${photo}:`, (error as Error).message)
    }
  }
}

// ===== Điểm trung bình của sản phẩm =====
// Tính lại từ các đánh giá đã đăng, lưu vào sản phẩm (rating, ratingCount, reviewCount)
// Gọi mỗi khi 1 đánh giá được đăng, bị từ chối, bị sửa, bị xoá
export const updateProductRating = async (productId: string) => {
  if(!isValidProductId(productId)) return

  const [statList, reviewCount] = await Promise.all([
    Review.aggregate([
      { $match: { productId: productId, status: "published" } },
      { $group: { _id: null, total: { $sum: "$rating" }, count: { $sum: 1 } } }
    ]),
    Review.countDocuments({ productId: productId, status: "published", hasContent: true })
  ])

  const stat = statList[0]
  const ratingCount = stat?.count || 0
  const rating = ratingCount > 0 ? Math.round(stat.total / ratingCount * 10) / 10 : 0

  // Không đổi thời gian cập nhật (updatedAt) của sản phẩm
  await Product.updateOne({ _id: productId }, {
    $set: {
      rating: rating,
      ratingCount: ratingCount,
      reviewCount: reviewCount
    }
  }, { timestamps: false })
}

// ===== Danh sách đánh giá ở trang sản phẩm =====
// Kiểu sắp xếp (key: từ ngữ trong locales)
export const reviewSortList = [
  { id: "", key: "reviewSortNewest", sort: { createdAt: -1 } },
  { id: "helpful", key: "reviewSortHelpful", sort: { helpfulCount: -1, createdAt: -1 } },
  { id: "rating-desc", key: "reviewSortRatingDesc", sort: { rating: -1, createdAt: -1 } },
  { id: "rating-asc", key: "reviewSortRatingAsc", sort: { rating: 1, createdAt: -1 } }
]

// Bộ lọc trên link: ?rating=5&photo=1&sort=helpful&page=2
export const getReviewListFilter = (query: any) => {
  const rating = Number(query.rating)
  const page = Math.floor(Number(query.page))
  const sortItem = reviewSortList.find(item => item.id === query.sort) || reviewSortList[0]
  return {
    rating: [1, 2, 3, 4, 5].includes(rating) ? rating : 0,
    photo: query.photo === "1",
    sort: sortItem.id,
    sortValue: sortItem.sort,
    page: page > 0 ? page : 1
  }
}

// Đánh giá đã đăng có chữ / ảnh của 1 sản phẩm (chỉ chấm sao thì không hiện trong danh sách)
export const findProductReviews = async (productId: string, filter: ReturnType<typeof getReviewListFilter>) => {
  const find: any = {
    productId: productId,
    status: "published",
    hasContent: true
  }
  if(filter.rating) find.rating = filter.rating
  if(filter.photo) find.hasPhoto = true

  const total = await Review.countDocuments(find)
  const reviewList = await Review
    .find(find)
    .sort({ ...filter.sortValue, _id: -1 } as any)
    .skip((filter.page - 1) * reviewPerPage)
    .limit(reviewPerPage)

  return {
    reviewList: reviewList,
    total: total,
    page: filter.page,
    hasMore: filter.page * reviewPerPage < total
  }
}

// Tổng quan đánh giá của sản phẩm: số lượt theo từng mức sao, ảnh của khách (hiện ở đầu phần đánh giá)
export const getProductReviewSummary = async (productId: string) => {
  const [groupList, photoReviewList, photoReviewCount] = await Promise.all([
    Review.aggregate([
      { $match: { productId: productId, status: "published" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } }
    ]),
    Review
      .find({ productId: productId, status: "published", hasPhoto: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("photos"),
    Review.countDocuments({ productId: productId, status: "published", hasPhoto: true })
  ])

  const total = groupList.reduce((sum, item) => sum + item.count, 0)
  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = groupList.find(item => item._id === star)?.count || 0
    return {
      star: star,
      count: count,
      percent: total > 0 ? Math.round(count / total * 100) : 0
    }
  })

  const photoList: { path: string, reviewId: string }[] = []
  for (const review of photoReviewList) {
    for (const photo of review.photos) {
      if(photoList.length < 12) photoList.push({ path: photo, reviewId: review.id })
    }
  }

  return {
    total: total,
    distribution: distribution,
    photoList: photoList,
    photoReviewCount: photoReviewCount
  }
}

// Lượt bấm 👍 / 👎 của tài khoản đang đăng nhập: { id đánh giá: 1 | -1 }
export const getUserVoteMap = async (reviewIds: string[], userId: string | undefined) => {
  const map: { [reviewId: string]: number } = {}
  if(!userId || reviewIds.length === 0) return map

  const voteList = await ReviewVote.find({ reviewId: { $in: reviewIds }, userId: userId })
  for (const vote of voteList) {
    map[`${vote.reviewId}`] = Number(vote.value)
  }
  return map
}

// Đếm lại lượt bấm 👍 / 👎 của 1 đánh giá
export const updateReviewVoteCount = async (reviewId: string) => {
  const [helpfulCount, unhelpfulCount] = await Promise.all([
    ReviewVote.countDocuments({ reviewId: reviewId, value: 1 }),
    ReviewVote.countDocuments({ reviewId: reviewId, value: -1 })
  ])
  await Review.updateOne({ _id: reviewId }, { $set: { helpfulCount, unhelpfulCount } }, { timestamps: false })
  return { helpfulCount, unhelpfulCount }
}

// Xoá hẳn 1 đánh giá: ảnh, lượt bấm 👍 / 👎, tính lại điểm sản phẩm
export const deleteReview = async (review: any) => {
  await Review.deleteOne({ _id: review._id })
  await ReviewVote.deleteMany({ reviewId: review.id })
  await deleteReviewPhotos(review.photos || [])
  if(review.status === "published"){
    await updateProductRating(review.productId)
  }
}

// ===== Email nhắc đánh giá sau khi nhận hàng =====
// Mỗi giờ tìm các đơn đã giao được reviewRequestDelayHours giờ (trong vòng reviewRequestMaxDays ngày), chưa gửi email,
// gửi email "Как вам покупка?" có 5 ngôi sao cho từng sản phẩm chưa được đánh giá (bấm sao là mở trang viết đánh giá)
const renderReviewRequestEmail = (order: any, itemList: any[]) => {
  const lang = order.lang || "ru"
  const t = (key: string) => translate(lang, key)
  const subject = `${t("reviewEmailSubject")} — SFoodie`

  const html = pug.renderFile(path.join(__dirname, "../views/client/emails/review-request.pug"), {
    lang: lang,
    t: t,
    order: order,
    itemList: itemList,
    orderUrl: getOrderUrl(order, true),
    subject: subject
  })

  const lines = [
    `${t("hello")}, ${order.customer.fullName}!`,
    "",
    t("reviewEmailText"),
    ""
  ]
  for (const item of itemList) {
    lines.push(`- ${item.name}: ${item.url}`)
  }
  lines.push("", "SFoodie")

  return { subject, html, text: lines.join("\n") }
}

export const sendReviewRequests = async () => {
  if(!reviewRequestEmail) return

  try {
    const now = Date.now()
    const orderList: any[] = await Order.find({
      status: "delivered",
      reviewRequestSentAt: null,
      "customer.email": { $nin: [null, ""] },
      statusHistory: {
        $elemMatch: {
          status: "delivered",
          at: {
            $lte: new Date(now - reviewRequestDelayHours * 60 * 60 * 1000),
            $gte: new Date(now - reviewRequestMaxDays * 24 * 60 * 60 * 1000)
          }
        }
      }
    }).limit(50)

    for (const order of orderList) {
      // Đánh dấu đã gửi trước (chạy song song / server khởi động lại cũng không gửi 2 lần)
      const claimed = await Order.findOneAndUpdate({
        _id: order._id,
        reviewRequestSentAt: null
      }, {
        $set: { reviewRequestSentAt: new Date() }
      }, {
        timestamps: false
      })
      if(!claimed) continue

      const reviewMap = await getOrderReviewMap(order)
      const lang = order.lang || "ru"
      const itemList = order.items
        .filter((item: any, index: number, list: any[]) => list.findIndex(other => other.productId === item.productId) === index)
        .filter((item: any) => reviewMap[item.productId]?.canReview && !reviewMap[item.productId]?.review)
        .map((item: any) => ({
          name: localizedName(item, lang),
          url: getReviewWriteUrl(order, item.productId, { absolute: true }),
          starUrls: [1, 2, 3, 4, 5].map(star => getReviewWriteUrl(order, item.productId, { absolute: true, rating: star }))
        }))

      // Khách đã đánh giá hết sản phẩm trong đơn: không cần nhắc
      if(itemList.length === 0) continue

      try {
        await sendMail({ to: order.customer.email, ...renderReviewRequestEmail(order, itemList) })
      } catch (error) {
        console.log(`Gửi email nhắc đánh giá đơn ${order.code} thất bại:`, (error as Error).message)
      }
    }
  } catch (error) {
    console.log("Gửi email nhắc đánh giá thất bại")
    console.log(error)
  }
}

// Chạy khi khởi động server, sau đó mỗi giờ 1 lần
export const scheduleReviewJobs = () => {
  sendReviewRequests()
  setInterval(sendReviewRequests, 60 * 60 * 1000)
}
