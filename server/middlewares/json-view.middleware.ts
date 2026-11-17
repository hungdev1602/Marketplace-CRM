import { NextFunction, Request, Response } from "express"
import mongoose from "mongoose"
import {
  jsonViewHeaderName,
  jsonViewHeaderValue,
  jsonViewHiddenFieldsAll,
  jsonViewHiddenFieldsClient,
  jsonViewHiddenFieldsClientByModel,
  jsonViewSkipLocals
} from "../config/json-view.config"

// ===== Chế độ JSON cho giao diện Next.js (thư mục frontend) =====
// Request có header "X-Response-Format: json" thì:
// - res.render("ten-trang", data): không dựng trang PUG, trả về JSON { code: "render", view, data }
//   (data gồm cả các biến dùng chung trong res.locals: tài khoản, quyền, menu danh mục, giỏ hàng...)
// - res.redirect(url): không chuyển trang, trả về JSON { code: "redirect", url } để Next.js tự chuyển trang
// Các route trả JSON sẵn (res.json) thì không đổi gì.
// Không có header thì server chạy y như cũ (trang PUG), nên 2 giao diện chạy song song được.

type SerializeOptions = {
  hidden: Set<string> // tên trường bị ẩn ở mọi cấp
  hiddenByModel: { [modelName: string]: string[] } // tên trường bị ẩn theo model
}

// Đổi dữ liệu của trang thành dữ liệu JSON thuần
// - Bản ghi mongoose: lấy cả các trường trong database và các trường controller gắn thêm lúc chạy
//   (ví dụ product.priceFormat, product.cardImage) — res.json thông thường sẽ làm mất các trường gắn thêm này
// - Hàm (t, formatPrice...) bị bỏ, giao diện Next.js có sẵn các hàm tương ứng
const serialize = (value: any, options: SerializeOptions, seen: WeakSet<object>): any => {
  if(value === null || value === undefined) return value
  if(typeof value === "function" || typeof value === "symbol") return undefined
  if(typeof value === "bigint") return value.toString()
  if(typeof value !== "object") return value

  if(value instanceof Date) return value.toISOString()
  if(value instanceof mongoose.Types.ObjectId) return value.toString()
  if(value instanceof mongoose.Types.Decimal128) return Number(value.toString())
  if(Buffer.isBuffer(value)) return undefined
  if(value instanceof RegExp) return value.toString()

  // Tránh vòng lặp vô hạn khi dữ liệu trỏ vòng về chính nó
  if(seen.has(value)) return undefined
  seen.add(value)

  let result: any

  if(Array.isArray(value)){
    result = value.map(item => {
      const itemValue = serialize(item, options, seen)
      return itemValue === undefined ? null : itemValue
    })
  }
  else if(value instanceof Map){
    result = {}
    for (const [key, item] of value.entries()) {
      if(options.hidden.has(`${key}`)) continue
      const itemValue = serialize(item, options, seen)
      if(itemValue !== undefined) result[`${key}`] = itemValue
    }
  }
  else if(value instanceof mongoose.Document){
    result = serializeDocument(value, options, seen)
  }
  else {
    result = {}
    for (const key of Object.keys(value)) {
      if(options.hidden.has(key)) continue
      const itemValue = serialize(value[key], options, seen)
      if(itemValue !== undefined) result[key] = itemValue
    }
  }

  seen.delete(value)
  return result
}

const serializeDocument = (document: any, options: SerializeOptions, seen: WeakSet<object>): any => {
  // Các trường riêng của model này bị ẩn trong toàn bộ bản ghi (kể cả dữ liệu lồng bên trong)
  const modelName: string = document.constructor?.modelName || ""
  const modelHidden = options.hiddenByModel[modelName]
  const documentOptions: SerializeOptions = modelHidden
    ? { hidden: new Set([...options.hidden, ...modelHidden]), hiddenByModel: options.hiddenByModel }
    : options

  // Các trường trong database (virtuals: có thêm "id" là _id dạng chuỗi)
  const base: any = document.toObject({ virtuals: true, flattenMaps: true, versionKey: false })
  const result: any = {}
  for (const key of Object.keys(base)) {
    if(documentOptions.hidden.has(key)) continue

    // Bản ghi con (ví dụ order.items): lấy từ bản ghi gốc, để giữ các trường controller gắn thêm vào từng phần tử
    let live: any
    try { live = document.get(key) } catch (error) { live = undefined }
    const isLiveDocument = live instanceof mongoose.Document
      || (Array.isArray(live) && live.some((item: any) => item instanceof mongoose.Document))

    const itemValue = serialize(isLiveDocument ? live : base[key], documentOptions, seen)
    if(itemValue !== undefined) result[key] = itemValue
  }

  // Các trường controller gắn thêm lúc chạy (không có trong schema), bỏ các biến nội bộ của mongoose ($__, _doc...)
  for (const key of Object.keys(document)) {
    if(key.startsWith("$") || key.startsWith("__") || key === "_doc" || key === "isNew" || key === "errors") continue
    if(documentOptions.hidden.has(key)) continue
    const itemValue = serialize(document[key], documentOptions, seen)
    if(itemValue !== undefined) result[key] = itemValue
  }

  return result
}

// Dữ liệu của 1 trang => JSON (dùng cả ở chỗ khác nếu cần trả bản ghi mongoose có trường gắn thêm)
export const serializeViewData = (data: any, isAdminView: boolean): any => {
  const options: SerializeOptions = isAdminView
    ? { hidden: new Set(jsonViewHiddenFieldsAll), hiddenByModel: {} }
    : {
      hidden: new Set([...jsonViewHiddenFieldsAll, ...jsonViewHiddenFieldsClient]),
      hiddenByModel: jsonViewHiddenFieldsClientByModel
    }

  return serialize(data, options, new WeakSet())
}

export const isJsonViewRequest = (req: Request): boolean => {
  return `${req.get(jsonViewHeaderName) || ""}`.toLowerCase() === jsonViewHeaderValue
}

export const jsonView = (req: Request, res: Response, next: NextFunction) => {
  if(!isJsonViewRequest(req)){
    next()
    return
  }

  res.locals.isJsonView = true

  // res.render(view, data) => JSON
  const renderPug = res.render.bind(res)
  res.render = ((view: string, data?: any, callback?: any) => {
    // res.render có hàm callback: chỉ tạo HTML chứ không gửi cho trình duyệt (nội dung email đặt lại mật khẩu,...)
    // => vẫn dựng file PUG như cũ
    if(typeof data === "function" || typeof callback === "function"){
      renderPug(view, data, callback)
      return
    }

    const viewData: any = {}

    // Thứ tự ưu tiên giống Express: app.locals < res.locals < data truyền vào res.render
    // Các biến dùng chung không cần gửi (jsonViewSkipLocals) chỉ bỏ ở app.locals / res.locals,
    // dữ liệu controller truyền thẳng vào res.render thì luôn gửi (ví dụ trang blog truyền allCategory của blog)
    for (const source of [req.app.locals, res.locals]) {
      for (const key of Object.keys(source)) {
        if(key === "settings" || key === "isJsonView" || jsonViewSkipLocals.includes(key)) continue
        viewData[key] = source[key]
      }
    }
    if(typeof data === "object" && data){
      for (const key of Object.keys(data)) {
        viewData[key] = data[key]
      }
    }

    res.json({
      code: "render",
      status: res.statusCode,
      view: view,
      data: serializeViewData(viewData, view.startsWith("admin/"))
    })
  }) as any

  // res.redirect(url) hoặc res.redirect(status, url) => JSON
  res.redirect = ((...args: any[]) => {
    const url = `${args.length > 1 && typeof args[0] === "number" ? args[1] : args[0]}`
    res.status(200).json({
      code: "redirect",
      url: url
    })
  }) as any

  next()
}
