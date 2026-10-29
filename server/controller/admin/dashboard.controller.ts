import { Request, Response } from "express"
import moment from "moment"
import { Product } from "../../models/product.model"
import { CategoryProduct } from "../../models/category-product.model"
import { Coupon } from "../../models/coupon.model"
import { Blog } from "../../models/blog.model"
import { ActivityLog } from "../../models/activity-log.model"
import { getDescendantIds } from "../../helpers/category.helper"
import { formatNumber, formatPrice } from "../../helpers/format.helper"
import { buildCouponStatusFind, couponStatusList, formatCouponDiscount, formatShopDateTime } from "../../helpers/coupon.helper"
import { buildMissingInfoFind, productMissingInfoList } from "./product.controller"
import {
  activityLogActionList,
  activityLogModuleList,
  productLowStockThreshold,
  productOriginList,
  productStorageList,
  productUnitList
} from "../../config/variable.config"

// Số cột tối đa của 1 biểu đồ, các cột nhỏ còn lại gộp thành 1 cột (ví dụ "Xuất xứ khác")
const chartMaxBars = 8

// Dữ liệu biểu đồ cột: bỏ cột bằng 0, xếp giảm dần, gộp các cột nhỏ nếu quá nhiều
const buildBarChartData = (list: { name: string, value: number }[], otherName: string) => {
  const sortedList = list
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  if(sortedList.length > chartMaxBars){
    const otherList = sortedList.splice(chartMaxBars - 1)
    sortedList.push({
      name: otherName,
      value: otherList.reduce((sum, item) => sum + item.value, 0)
    })
  }

  return {
    labels: sortedList.map(item => item.name),
    values: sortedList.map(item => item.value)
  }
}

// Làm tròn tiền đến kopek (tránh sai số khi cộng số thập phân, ví dụ 0.1 + 0.2)
const roundMoney = (value: number) => Math.round(value * 100) / 100

// ===== Sản phẩm =====
const getProductStats = async () => {
  const allCategory = await CategoryProduct
    .find({
      deleted: false
    })
    .select("name parent")
  const categoryIds = allCategory.map(category => category.id)

  // Chỉ lấy các trường cần để tính số liệu (lean: lấy dữ liệu thô cho nhanh)
  const productList = await Product
    .find({
      deleted: false
    })
    .select("status category origin storageType stock price costPrice")
    .lean()

  // Tồn kho (chỉ tính sản phẩm đang bán, giống bộ lọc tồn kho ở danh sách sản phẩm)
  const activeList = productList.filter(product => product.status === "active")
  const outOfStockCount = activeList.filter(product => !((product.stock || 0) > 0)).length
  const lowStockCount = activeList.filter(product => (product.stock || 0) > 0 && (product.stock || 0) <= productLowStockThreshold).length

  // Giá trị hàng tồn kho (gồm cả sản phẩm ngừng bán vì hàng vẫn nằm trong kho)
  let stockCostValue = 0
  let stockPriceValue = 0
  let missingCostPriceCount = 0
  for (const product of productList) {
    const stock = product.stock || 0
    if(stock <= 0){
      continue
    }

    stockPriceValue += stock * (product.price || 0)
    if(product.costPrice && product.costPrice > 0){
      stockCostValue += stock * product.costPrice
    }
    else{
      missingCostPriceCount++
    }
  }

  // Biểu đồ theo danh mục gốc (tính cả sản phẩm thuộc danh mục con), 1 sản phẩm có thể thuộc nhiều danh mục
  const rootCategoryList = allCategory.filter(category => !category.parent || !categoryIds.includes(category.parent))
  const categoryChartList = rootCategoryList.map(root => {
    const subtreeIds = [root.id, ...getDescendantIds(allCategory, root.id)]
    return {
      name: `${root.name}`,
      value: productList.filter(product => product.category.some(id => subtreeIds.includes(id))).length
    }
  })
  categoryChartList.push({
    name: "Chưa có danh mục",
    value: productList.filter(product => !product.category.some(id => categoryIds.includes(id))).length
  })

  // Biểu đồ theo xuất xứ
  const originChartList = productOriginList.map(origin => ({
    name: origin.name,
    value: productList.filter(product => product.origin === origin.id).length
  }))
  originChartList.push({
    name: "Chưa chọn xuất xứ",
    value: productList.filter(product => !productOriginList.some(origin => origin.id === product.origin)).length
  })

  // Điều kiện bảo quản
  const storageList = productStorageList.map(storage => ({
    ...storage,
    count: productList.filter(product => product.storageType === storage.id).length
  }))
  const noStorageCount = productList.filter(product => !productStorageList.some(storage => storage.id === product.storageType)).length

  // Sản phẩm đang bán cần nhập thêm hàng (tồn kho ít nhất trước)
  const lowStockList: any = await Product
    .find({
      deleted: false,
      status: "active",
      stock: { $not: { $gt: productLowStockThreshold } } // gồm cả sản phẩm chưa nhập tồn kho
    })
    .sort({
      stock: "asc",
      name: "asc"
    })
    .limit(8)
    .select("name nameRu sku avatar stock unit")
  for (const item of lowStockList) {
    item.unitName = productUnitList.find(unit => unit.id === item.unit)?.name
  }

  // Số sản phẩm còn thiếu từng thông tin
  const missingInfoList = await Promise.all(productMissingInfoList.map(async item => ({
    ...item,
    count: await Product.countDocuments({
      deleted: false,
      ...buildMissingInfoFind(item.id, allCategory)
    })
  })))

  return {
    totalCount: productList.length,
    activeCount: activeList.length,
    inactiveCount: productList.length - activeList.length,
    outOfStockCount: outOfStockCount,
    lowStockCount: lowStockCount,
    stockCostValueFormat: formatPrice(roundMoney(stockCostValue)),
    stockPriceValueFormat: formatPrice(roundMoney(stockPriceValue)),
    missingCostPriceCount: missingCostPriceCount,
    categoryChart: buildBarChartData(categoryChartList, "Danh mục khác"),
    originChart: buildBarChartData(originChartList, "Xuất xứ khác"),
    storageList: storageList,
    noStorageCount: noStorageCount,
    lowStockList: lowStockList,
    missingInfoList: missingInfoList
  }
}

// ===== Mã giảm giá =====
const getCouponStats = async () => {
  const now = new Date()

  // Số mã theo từng trạng thái (giống bộ lọc trạng thái ở danh sách mã giảm giá)
  const statusList = await Promise.all(couponStatusList.map(async status => ({
    ...status,
    count: await Coupon.countDocuments({
      deleted: false,
      ...buildCouponStatusFind(status.id, now)
    })
  })))

  // Mã đang chạy sẽ hết hạn trong 7 ngày tới
  const endingSoonList: any = await Coupon
    .find({
      deleted: false,
      ...buildCouponStatusFind("running", now),
      endAt: { $lte: moment(now).add(7, "days").toDate() }
    })
    .sort({
      endAt: "asc"
    })
    .limit(5)

  for (const item of endingSoonList) {
    item.discountText = formatCouponDiscount(item)
    item.endAtFormat = formatShopDateTime(item.endAt)

    const hoursLeft = moment(item.endAt).diff(now, "hours")
    item.timeLeft = hoursLeft >= 24
      ? `còn ${Math.floor(hoursLeft / 24)} ngày`
      : hoursLeft >= 1 ? `còn ${hoursLeft} giờ` : "còn dưới 1 giờ"
  }

  return {
    totalCount: statusList.reduce((sum, status) => sum + status.count, 0),
    statusList: statusList,
    endingSoonList: endingSoonList
  }
}

// ===== Bài viết =====
const getArticleStats = async () => {
  const [publishedCount, draftCount, archivedCount] = await Promise.all(
    ["published", "draft", "archived"].map(status => Blog.countDocuments({
      deleted: false,
      status: status
    }))
  )

  return {
    totalCount: publishedCount + draftCount + archivedCount,
    publishedCount: publishedCount,
    draftCount: draftCount,
    archivedCount: archivedCount
  }
}

// ===== Hoạt động gần đây (chỉ Super Admin) =====
const getRecentActivityList = async () => {
  const logList: any = await ActivityLog
    .find({})
    .sort({
      createdAt: "desc"
    })
    .limit(8)

  for (const item of logList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY")
    item.moduleName = activityLogModuleList.find(module => module.id === item.module)?.name || item.module

    const action = activityLogActionList.find(action => action.id === item.action)
    item.actionName = action?.name || item.action
    item.actionColor = action?.color || "bg-secondary"
  }

  return logList
}

// Trang tổng quan: mỗi phần chỉ hiện khi tài khoản có quyền xem chức năng đó
export const dashboard = async (req: Request, res: Response) => {
  const permissions: string[] = res.locals.permissions

  const [productStats, couponStats, articleStats, activityList] = await Promise.all([
    permissions.includes("product-list") ? getProductStats() : null,
    permissions.includes("coupon-list") ? getCouponStats() : null,
    permissions.includes("article-list") ? getArticleStats() : null,
    res.locals.account.isSuperAdmin ? getRecentActivityList() : null
  ])

  res.render("admin/pages/dashboard", {
    pageTitle: "Trang tổng quan",
    updatedAt: formatShopDateTime(new Date()),
    lowStockThreshold: productLowStockThreshold,
    productStats: productStats,
    couponStats: couponStats,
    articleStats: articleStats,
    activityList: activityList,
    formatNumber: formatNumber
  })
}
