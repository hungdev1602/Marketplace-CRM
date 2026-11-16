import { Request, Response } from "express"
import { pathAdmin } from "../../config/variable.config"
import { getIntegrationDefinition, isShopSettingKey } from "../../config/integration.config"
import {
  getAllShopSettingViews,
  getIntegrationView,
  IntegrationSaveError,
  saveIntegration
} from "../../helpers/integration.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { writeLog } from "../../helpers/activity-log.helper"

// ===== Cài đặt cửa hàng (trang admin) =====
// Thông tin cửa hàng, đặt hàng, sản phẩm, đánh giá. Danh sách mục và các ô: config/shop-setting.config.ts
// Dùng chung cách lưu / đọc và trang sửa với Kết nối API (helpers/integration.helper.ts, views/admin/pages/integration-edit.pug)

const getAdminName = (res: Response): string => {
  const account = res.locals.account
  return account ? `${account.fullName} (${account.email})` : "Admin"
}

// Danh sách mục cài đặt: GET /admin/setting/list
export const list = async (req: Request, res: Response) => {
  const views: any[] = getAllShopSettingViews()
  for (const view of views) {
    view.updatedAtFormat = view.updatedAt ? formatShopDateTime(view.updatedAt, "HH:mm DD/MM/YYYY") : ""
    // Các ô đã sửa ở trang admin (khác mặc định)
    view.customCount = view.fields.filter((field: any) => field.source == "admin").length
  }

  res.render("admin/pages/setting-list", {
    pageTitle: "Cài đặt cửa hàng",
    views: views
  })
}

// Trang sửa 1 mục: GET /admin/setting/edit/:key
export const edit = async (req: Request, res: Response) => {
  const key = `${req.params.key}`
  const definition = isShopSettingKey(key) ? getIntegrationDefinition(key) : undefined
  if(!definition){
    res.redirect(`/${pathAdmin}/setting/list`)
    return
  }

  const view: any = getIntegrationView(definition)
  view.updatedAtFormat = view.updatedAt ? formatShopDateTime(view.updatedAt, "HH:mm DD/MM/YYYY") : ""

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
    pageTitle: `Cài đặt: ${definition.name}`,
    view: view,
    groups: groups,
    isSettingPage: true
  })
}

// Lưu: PATCH /admin/setting/edit/:key { values: { field: value } }
export const editPatch = async (req: Request, res: Response) => {
  const key = `${req.params.key}`
  const definition = isShopSettingKey(key) ? getIntegrationDefinition(key) : undefined
  if(!definition){
    res.json({ code: "error", message: "Mục cài đặt không tồn tại!" })
    return
  }

  try {
    // Chỉ nhận values (cài đặt cửa hàng không có bật / tắt, chế độ, khoá bí mật)
    const changed = await saveIntegration(key, { values: req.body?.values }, getAdminName(res))

    if(changed.length > 0){
      await writeLog(req, res, {
        module: "setting",
        action: "edit",
        description: `Sửa cài đặt "${definition.name}": ${changed.join(", ")}`.slice(0, 1000),
        targetId: key
      })
    }

    res.json({
      code: "success",
      message: changed.length > 0 ? `Đã lưu cài đặt ${definition.name}` : "Không có thay đổi"
    })
  } catch (error) {
    if(error instanceof IntegrationSaveError){
      res.json({ code: "error", message: error.message })
      return
    }
    console.log("Lưu cài đặt cửa hàng thất bại:", error)
    res.json({ code: "error", message: `Lưu thất bại: ${(error as Error).message}` })
  }
}
