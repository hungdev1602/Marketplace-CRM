import { Request, Response } from "express"
import { ApiCallLog } from "../../models/api-call-log.model"
import { apiCallLogRetentionDays, pathAdmin } from "../../config/variable.config"
import { getIntegrationDefinition, integrationCategoryList, integrationList } from "../../config/integration.config"
import {
  getAllIntegrationViews,
  getIntegrationView,
  IntegrationSaveError,
  saveIntegration,
  saveIntegrationTestResult,
  setIntegrationEnabled
} from "../../helpers/integration.helper"
import { getApiCallStats } from "../../helpers/api-call-log.helper"
import { canEncryptSecret, hasDedicatedSecretKey } from "../../helpers/secret.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { writeLog } from "../../helpers/activity-log.helper"
import { getSiteUrl } from "../../helpers/site-url.helper"
import { testTbankConnection } from "../../helpers/payment.helper"
import { testApishipConnection } from "../../helpers/apiship.helper"
import { getOrderNotifyEmail, testMailConnection } from "../../helpers/mail.helper"

// ===== Kết nối API bên thứ 3 (trang admin) =====
// Danh sách dịch vụ, trạng thái, nhập khoá API, bật / tắt, chế độ thử / thật, kiểm tra kết nối, nhật ký gọi API
// Danh sách dịch vụ và các ô cấu hình: config/integration.config.ts

const sendError = (res: Response, message: string) => {
  res.json({ code: "error", message: message })
}

const getAdminName = (res: Response): string => {
  const account = res.locals.account
  return account ? `${account.fullName} (${account.email})` : "Admin"
}

// Thông tin chung cho các trang: cảnh báo khoá mã hoá, địa chỉ nhận thông báo Т-Банк
const getCommonInfo = () => {
  const siteUrl = getSiteUrl()
  return {
    canEncrypt: canEncryptSecret(),
    hasDedicatedSecretKey: hasDedicatedSecretKey(),
    siteUrl: siteUrl,
    siteUrlHttps: siteUrl.startsWith("https://"),
    tbankNotificationUrl: `${siteUrl}/payment/tbank`
  }
}

const formatView = (view: any) => {
  view.lastTestAtFormat = view.lastTest ? formatShopDateTime(view.lastTest.at, "HH:mm DD/MM/YYYY") : ""
  view.updatedAtFormat = view.updatedAt ? formatShopDateTime(view.updatedAt, "HH:mm DD/MM/YYYY") : ""
  return view
}

// Danh sách kết nối: GET /admin/integration/list
export const list = async (req: Request, res: Response) => {
  const views = getAllIntegrationViews().map(formatView)

  let stats: any = {}
  try {
    stats = await getApiCallStats(24)
  } catch (error) {
    console.log("Lấy thống kê gọi API thất bại:", (error as Error).message)
  }
  for (const view of views) {
    const stat = stats[view.definition.key] || { total: 0, errors: 0, avgMs: 0, lastError: null }
    if(stat.lastError) stat.lastError.atFormat = formatShopDateTime(stat.lastError.at, "HH:mm DD/MM/YYYY")
    view.stat = stat
  }

  const categories = integrationCategoryList
    .map(category => ({
      ...category,
      views: views.filter(view => view.definition.category === category.id)
    }))
    .filter(category => category.views.length > 0)

  res.render("admin/pages/integration-list", {
    pageTitle: "Kết nối API bên thứ 3",
    categories: categories,
    ...getCommonInfo()
  })
}

// Trang cấu hình 1 kết nối: GET /admin/integration/edit/:key
export const edit = async (req: Request, res: Response) => {
  const definition = getIntegrationDefinition(`${req.params.key}`)
  if(!definition){
    res.redirect(`/${pathAdmin}/integration/list`)
    return
  }

  const view = formatView(getIntegrationView(definition))

  // Nhóm các ô theo group (giữ đúng thứ tự khai báo)
  const groups: { name: string, fields: any[] }[] = []
  for (const field of view.fields) {
    let group = groups.find(item => item.name === field.group)
    if(!group){
      group = { name: field.group, fields: [] }
      groups.push(group)
    }
    group.fields.push(field)
  }

  res.render("admin/pages/integration-edit", {
    pageTitle: `Cấu hình: ${definition.name}`,
    view: view,
    groups: groups,
    ...getCommonInfo()
  })
}

// Lưu cấu hình: PATCH /admin/integration/edit/:key
// body JSON: { enabled, mode, values: { field: value }, secrets: { field: value }, clearSecrets: [field] }
export const editPatch = async (req: Request, res: Response) => {
  const key = `${req.params.key}`
  const definition = getIntegrationDefinition(key)
  if(!definition){
    sendError(res, "Kết nối không tồn tại!")
    return
  }

  try {
    const changed = await saveIntegration(key, req.body, getAdminName(res))

    if(changed.length > 0){
      // Chỉ ghi tên các ô đã đổi, không ghi giá trị (khoá API, mật khẩu)
      await writeLog(req, res, {
        module: "integration",
        action: "edit",
        description: `Sửa kết nối "${definition.name}": ${changed.join(", ")}`,
        targetId: key
      })
    }

    res.json({
      code: "success",
      message: changed.length > 0 ? `Đã lưu cấu hình ${definition.name}` : "Không có thay đổi"
    })
  } catch (error) {
    if(error instanceof IntegrationSaveError){
      sendError(res, error.message)
      return
    }
    console.log("Lưu cấu hình kết nối API thất bại:", error)
    sendError(res, `Lưu thất bại: ${(error as Error).message}`)
  }
}

// Bật / tắt: PATCH /admin/integration/toggle/:key { enabled: true/false }
export const togglePatch = async (req: Request, res: Response) => {
  const key = `${req.params.key}`
  const definition = getIntegrationDefinition(key)
  if(!definition){
    sendError(res, "Kết nối không tồn tại!")
    return
  }

  try {
    const enabled = req.body?.enabled === true
    await setIntegrationEnabled(key, enabled, getAdminName(res))

    await writeLog(req, res, {
      module: "integration",
      action: "change-status",
      description: `${enabled ? "Bật" : "Tắt"} kết nối "${definition.name}"`,
      targetId: key
    })

    res.json({ code: "success", message: `Đã ${enabled ? "bật" : "tắt"} ${definition.name}` })
  } catch (error) {
    sendError(res, `Thất bại: ${(error as Error).message}`)
  }
}

// Kiểm tra kết nối: POST /admin/integration/test/:key
// Gọi thử dịch vụ bằng cấu hình đang lưu, trả về { ok, message, details }
export const testPost = async (req: Request, res: Response) => {
  const key = `${req.params.key}`
  const definition = getIntegrationDefinition(key)
  if(!definition){
    sendError(res, "Kết nối không tồn tại!")
    return
  }

  let result: { ok: boolean, message: string, details: string[] }
  try {
    if(key === "tbank"){
      result = await testTbankConnection()
    }
    else if(key === "apiship"){
      result = await testApishipConnection()
    }
    else if(key === "smtp"){
      // Gửi email thử tới email tài khoản admin đang đăng nhập (không có thì tới email nhận thông báo đơn hàng)
      result = await testMailConnection(`${res.locals.account?.email || ""}`.trim() || getOrderNotifyEmail())
    }
    else {
      result = { ok: false, message: "Kết nối này chưa có chức năng kiểm tra", details: [] }
    }
  } catch (error) {
    result = { ok: false, message: (error as Error).message || "Lỗi không xác định", details: [] }
  }

  try {
    await saveIntegrationTestResult(key, result, getAdminName(res))
    await writeLog(req, res, {
      module: "integration",
      action: "test-connection",
      description: `Kiểm tra kết nối "${definition.name}": ${result.ok ? "thành công" : "thất bại"} — ${result.message}`.slice(0, 500),
      targetId: key
    })
  } catch (error) {
    console.log("Lưu kết quả kiểm tra kết nối thất bại:", (error as Error).message)
  }

  res.json({
    code: "success",
    ok: result.ok,
    message: result.message,
    details: result.details
  })
}

// Nhật ký gọi API: GET /admin/integration/log
export const log = async (req: Request, res: Response) => {
  const find: any = {}

  if(req.query.provider && integrationList.some(item => item.key === `${req.query.provider}`)){
    find.provider = `${req.query.provider}`
  }
  if(req.query.result === "ok") find.ok = true
  if(req.query.result === "error") find.ok = false

  // Pagination
  const limitItem: number = 50
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Math.floor(Number(req.query.page))
  }
  const totalRecord = await ApiCallLog.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem
  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const logList: any[] = await ApiCallLog
    .find(find)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitItem)
    .skip(skip)
    .lean()

  for (const item of logList) {
    item.createdAtFormat = formatShopDateTime(item.createdAt, "HH:mm:ss DD/MM/YYYY")
    item.providerName = integrationList.find(integration => integration.key === item.provider)?.name || item.provider
  }

  res.render("admin/pages/integration-log", {
    pageTitle: "Nhật ký gọi API bên thứ 3",
    logList: logList,
    providerList: integrationList.map(item => ({ id: item.key, name: item.name })),
    retentionDays: apiCallLogRetentionDays,
    filter: {
      provider: find.provider || "",
      result: req.query.result === "ok" || req.query.result === "error" ? req.query.result : ""
    },
    pagination: pagination,
    page: page
  })
}
