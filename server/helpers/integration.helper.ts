import { ApiIntegration } from "../models/api-integration.model"
import {
  getIntegrationDefinition,
  IntegrationDefinition,
  IntegrationField,
  integrationList
} from "../config/integration.config"
import { decryptSecret, encryptSecret } from "./secret.helper"

// ===== Cấu hình kết nối API bên thứ 3 (Т-Банк, ApiShip, email SMTP...) =====
// Giá trị của 1 ô: nhập ở trang admin (database) => biến trong file .env => mặc định (config/integration.config.ts)
// Cấu hình trong database được nạp sẵn vào bộ nhớ server (loadIntegrations) để các hàm đọc cấu hình chạy ngay,
// không phải hỏi database mỗi lần (ví dụ getPaymentProvider() được gọi ở rất nhiều nơi)
// - Lưu ở trang admin: nạp lại ngay
// - Mỗi phút nạp lại 1 lần (phòng khi chạy nhiều server dùng chung database)
// Chưa kết nối được database thì dùng cấu hình trong file .env (như trước khi có trang admin)

type CachedIntegration = {
  enabled: boolean,
  mode: string,
  values: { [field: string]: any },
  secrets: { [field: string]: string }, // đã giải mã
  brokenSecrets: string[], // ô bí mật không giải mã được (đổi INTEGRATION_SECRET_KEY / JWT_SECRET)
  lastTest: any,
  updatedAt: Date | null,
  updatedBy: string
}

let cache: { [key: string]: CachedIntegration } = {}

const toCached = (record: any): CachedIntegration => {
  const secrets: { [field: string]: string } = {}
  const brokenSecrets: string[] = []
  for (const [field, value] of Object.entries(record.secrets || {})) {
    if(!value) continue
    const text = decryptSecret(`${value}`)
    if(text === null) brokenSecrets.push(field)
    else secrets[field] = text
  }

  return {
    enabled: record.enabled !== false,
    mode: `${record.mode || ""}`,
    values: record.values && typeof record.values === "object" ? { ...record.values } : {},
    secrets: secrets,
    brokenSecrets: brokenSecrets,
    lastTest: record.lastTest?.at ? record.lastTest : null,
    updatedAt: record.updatedAt || null,
    updatedBy: `${record.updatedBy || ""}`
  }
}

// Nạp cấu hình từ database vào bộ nhớ
export const loadIntegrations = async () => {
  try {
    const records = await ApiIntegration.find({}).lean()
    const next: { [key: string]: CachedIntegration } = {}
    for (const record of records) {
      if(record.key) next[record.key] = toCached(record)
    }
    cache = next

    for (const [key, item] of Object.entries(cache)) {
      if(item.brokenSecrets.length > 0){
        console.log(`[Kết nối API] Không giải mã được khoá đã lưu của "${key}" (${item.brokenSecrets.join(", ")}): `
          + "INTEGRATION_SECRET_KEY / JWT_SECRET trong file .env đã bị đổi? Vào Admin => Kết nối API để nhập lại.")
      }
    }
  } catch (error) {
    console.log("Nạp cấu hình kết nối API thất bại (tạm dùng cấu hình trong file .env):", (error as Error).message)
  }
}

// Nạp khi khởi động server, sau đó mỗi phút nạp lại 1 lần
export const scheduleIntegrationReload = async () => {
  await loadIntegrations()
  setInterval(loadIntegrations, 60 * 1000)
}

// ===== Đọc cấu hình =====
const isEmptyValue = (value: any): boolean => {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

// Đổi chuỗi trong .env sang kiểu của ô
const parseEnvValue = (field: IntegrationField, text: string): any => {
  switch (field.type) {
    case "number": {
      const number = Number(text)
      return Number.isFinite(number) ? number : undefined
    }
    case "switch":
      return text.trim().toLowerCase() === "true"
    case "checkbox-list":
      return text.split(",").map(item => item.trim()).filter(Boolean)
    default:
      return text.trim()
  }
}

const getEnvValue = (field: IntegrationField): any => {
  if(!field.env) return undefined
  const text = process.env[field.env]
  if(isEmptyValue(text)) return undefined
  return parseEnvValue(field, `${text}`)
}

// Nguồn của giá trị đang dùng: "admin" (nhập ở trang admin), "env" (file .env), "default" (mặc định), "" (chưa có)
export type SettingSource = "admin" | "env" | "default" | ""

export const getIntegrationSettingInfo = (key: string, fieldKey: string): { value: any, source: SettingSource } => {
  const definition = getIntegrationDefinition(key)
  const field = definition?.fields.find(item => item.key === fieldKey)
  if(!definition || !field){
    return { value: undefined, source: "" }
  }

  const record = cache[key]
  if(field.type === "secret"){
    if(record?.secrets[fieldKey]) return { value: record.secrets[fieldKey], source: "admin" }
  }
  else if(record && !isEmptyValue(record.values[fieldKey])){
    return { value: record.values[fieldKey], source: "admin" }
  }

  const envValue = getEnvValue(field)
  if(envValue !== undefined) return { value: envValue, source: "env" }

  if(field.default !== undefined && !isEmptyValue(field.default)){
    return { value: field.default, source: "default" }
  }

  return { value: field.type === "checkbox-list" ? [] : field.type === "switch" ? false : "", source: "" }
}

// Giá trị đang dùng của 1 ô, ví dụ getIntegrationSetting("tbank", "terminalKey")
export const getIntegrationSetting = (key: string, fieldKey: string): any => {
  return getIntegrationSettingInfo(key, fieldKey).value
}

// Chuỗi (đã bỏ khoảng trắng 2 đầu)
export const getIntegrationString = (key: string, fieldKey: string): string => {
  const value = getIntegrationSetting(key, fieldKey)
  return isEmptyValue(value) ? "" : `${value}`.trim()
}

// Dịch vụ có đang bật không (chưa từng lưu ở trang admin thì coi như bật)
export const isIntegrationEnabled = (key: string): boolean => {
  return cache[key] ? cache[key].enabled : true
}

// Chế độ theo file .env (chưa chọn chế độ ở trang admin)
const getEnvMode = (key: string): string => {
  if(key === "tbank"){
    const hasTbank = !!(process.env.TBANK_TERMINAL_KEY && process.env.TBANK_PASSWORD)
    if(!hasTbank && process.env.PAYMENT_TEST_MODE === "true") return "fake"
    return "tbank"
  }
  if(key === "apiship"){
    return process.env.APISHIP_TEST === "false" ? "live" : "test"
  }
  return ""
}

// Chế độ đang dùng (id trong modes của dịch vụ), dịch vụ không có chế độ thì trả về ""
export const getIntegrationMode = (key: string): string => {
  const definition = getIntegrationDefinition(key)
  if(!definition || definition.modes.length === 0) return ""

  const savedMode = cache[key]?.mode
  if(savedMode && definition.modes.some(mode => mode.id === savedMode)) return savedMode

  const envMode = getEnvMode(key)
  if(definition.modes.some(mode => mode.id === envMode)) return envMode

  return definition.modes[0].id
}

// Ô có dùng ở chế độ đang chọn không
export const isFieldActive = (field: IntegrationField, mode: string): boolean => {
  return !field.modes || field.modes.length === 0 || field.modes.includes(mode)
}

// Các ô bắt buộc còn thiếu ở chế độ đang dùng
export const getMissingRequiredFields = (key: string): IntegrationField[] => {
  const definition = getIntegrationDefinition(key)
  if(!definition) return []
  const mode = getIntegrationMode(key)
  return definition.fields.filter(field => {
    if(!field.required || !isFieldActive(field, mode)) return false
    const value = getIntegrationSetting(key, field.key)
    return Array.isArray(value) ? value.length === 0 : isEmptyValue(value)
  })
}

// Đang ở chế độ thử không (không mất tiền thật / không tạo vận đơn thật)
// Т-Банк: terminal DEMO cũng là chế độ thử
export const isIntegrationTestMode = (key: string): boolean => {
  const definition = getIntegrationDefinition(key)
  if(!definition) return false
  const mode = definition.modes.find(item => item.id === getIntegrationMode(key))
  if(mode?.isTest) return true
  if(key === "tbank") return getIntegrationString("tbank", "terminalKey").toUpperCase().endsWith("DEMO")
  return false
}

// ===== Trạng thái hiển thị ở trang admin =====
export const integrationStatusList = [
  { id: "live", name: "Đang hoạt động", color: "bg-success" },
  { id: "test", name: "Chế độ thử", color: "bg-info" },
  { id: "not-configured", name: "Chưa cấu hình", color: "bg-warning" },
  { id: "disabled", name: "Đã tắt", color: "bg-secondary" }
]

export const getIntegrationStatus = (key: string) => {
  let id = "live"
  if(!isIntegrationEnabled(key)) id = "disabled"
  else if(getMissingRequiredFields(key).length > 0) id = "not-configured"
  else if(isIntegrationTestMode(key)) id = "test"
  return integrationStatusList.find(item => item.id === id)!
}

// Thông tin đầy đủ của 1 dịch vụ cho trang admin
// Không bao giờ trả về giá trị của ô bí mật, chỉ cho biết đã có hay chưa và lấy từ đâu
export const getIntegrationView = (definition: IntegrationDefinition) => {
  const record = cache[definition.key]
  const mode = getIntegrationMode(definition.key)

  const fields = definition.fields.map(field => {
    const info = getIntegrationSettingInfo(definition.key, field.key)
    const adminValue = field.type === "secret"
      ? ""
      : record && !isEmptyValue(record.values[field.key]) ? record.values[field.key] : undefined

    // Giá trị dùng khi để trống ô ở trang admin (file .env, không có thì mặc định)
    const envValue = getEnvValue(field)
    const fallbackValue = field.type === "secret" ? undefined : envValue !== undefined ? envValue : field.default

    return {
      ...field,
      source: info.source,
      fallbackValue: fallbackValue,
      fallbackSource: envValue !== undefined ? "env" : field.default !== undefined && !isEmptyValue(field.default) ? "default" : "",
      // Ô bí mật: không gửi giá trị
      value: field.type === "secret" ? "" : info.value,
      adminValue: adminValue, // giá trị đã nhập ở admin (undefined: chưa nhập, đang dùng .env / mặc định)
      hasValue: Array.isArray(info.value) ? info.value.length > 0 : !isEmptyValue(info.value),
      broken: !!record?.brokenSecrets.includes(field.key),
      active: isFieldActive(field, mode)
    }
  })

  return {
    definition: definition,
    enabled: isIntegrationEnabled(definition.key),
    mode: mode,
    modeInfo: definition.modes.find(item => item.id === mode),
    modeSource: record?.mode ? "admin" : "env",
    isTestMode: isIntegrationTestMode(definition.key),
    status: getIntegrationStatus(definition.key),
    missingFields: getMissingRequiredFields(definition.key).map(field => field.label),
    hasBrokenSecrets: !!record && record.brokenSecrets.length > 0,
    savedInAdmin: !!record,
    lastTest: record?.lastTest || null,
    updatedAt: record?.updatedAt || null,
    updatedBy: record?.updatedBy || "",
    fields: fields
  }
}

export const getAllIntegrationViews = () => {
  return integrationList.map(definition => getIntegrationView(definition))
}

// ===== Lưu cấu hình từ trang admin =====
export class IntegrationSaveError extends Error {}

const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

// Kiểm tra, chuẩn hoá giá trị 1 ô gửi lên, sai thì báo IntegrationSaveError
const sanitizeValue = (field: IntegrationField, raw: any): any => {
  switch (field.type) {
    case "switch":
      if(raw === "" || raw === null || raw === undefined) return ""
      return raw === true || raw === "true"
    case "checkbox-list": {
      const list = Array.isArray(raw) ? raw.map(item => `${item}`) : []
      const optionIds = (field.options || []).map(option => option.id)
      return [...new Set(list.filter(item => optionIds.includes(item)))]
    }
    case "select": {
      const value = `${raw ?? ""}`.trim()
      if(value === "") return ""
      if(!(field.options || []).some(option => option.id === value)){
        throw new IntegrationSaveError(`${field.label}: giá trị không hợp lệ`)
      }
      return value
    }
    case "number": {
      const text = `${raw ?? ""}`.trim()
      if(text === "") return ""
      const number = Number(text)
      if(!Number.isFinite(number) || number < 0 || number > 65535){
        throw new IntegrationSaveError(`${field.label}: phải là số`)
      }
      return number
    }
    default: {
      const value = `${raw ?? ""}`.trim()
      if(value.length > 500){
        throw new IntegrationSaveError(`${field.label}: quá dài (tối đa 500 ký tự)`)
      }
      if(value && field.type === "email" && !emailRegex.test(value)){
        throw new IntegrationSaveError(`${field.label}: email không hợp lệ`)
      }
      if(value && field.type === "url" && !/^https?:\/\/[^\s]+$/i.test(value)){
        throw new IntegrationSaveError(`${field.label}: phải bắt đầu bằng http:// hoặc https://`)
      }
      return value
    }
  }
}

const sameValue = (a: any, b: any): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Lưu cấu hình 1 dịch vụ
// body: {
//   enabled: true/false,
//   mode: "tbank",
//   values: { terminalKey: "..." }, ô để trống = dùng .env / mặc định
//   secrets: { password: "..." }, ô bí mật để trống = giữ nguyên
//   clearSecrets: ["password"] xoá khoá đã lưu ở admin (dùng lại .env nếu có)
// }
// Trả về danh sách tên ô đã thay đổi (ghi nhật ký hoạt động, không ghi giá trị)
export const saveIntegration = async (key: string, body: any, accountName: string): Promise<string[]> => {
  const definition = getIntegrationDefinition(key)
  if(!definition){
    throw new IntegrationSaveError("Kết nối không tồn tại!")
  }

  const record: any = await ApiIntegration.findOne({ key: key }).lean()
  const oldValues: { [field: string]: any } = { ...(record?.values || {}) }
  const oldSecrets: { [field: string]: string } = { ...(record?.secrets || {}) }

  const values: { [field: string]: any } = {}
  const secrets: { [field: string]: string } = { ...oldSecrets }
  const changed: string[] = []

  const inputValues = body?.values && typeof body.values === "object" ? body.values : {}
  const inputSecrets = body?.secrets && typeof body.secrets === "object" ? body.secrets : {}
  const clearSecrets: string[] = Array.isArray(body?.clearSecrets) ? body.clearSecrets.map((item: any) => `${item}`) : []

  for (const field of definition.fields) {
    if(field.type === "secret"){
      const newSecret = `${inputSecrets[field.key] ?? ""}`.trim()
      if(newSecret){
        if(newSecret.length > 1000){
          throw new IntegrationSaveError(`${field.label}: quá dài`)
        }
        secrets[field.key] = encryptSecret(newSecret)
        changed.push(field.label)
      }
      else if(clearSecrets.includes(field.key) && secrets[field.key]){
        delete secrets[field.key]
        changed.push(`${field.label} (xoá)`)
      }
      continue
    }

    // Ô không gửi lên thì giữ nguyên giá trị cũ
    if(!(field.key in inputValues)){
      if(field.key in oldValues) values[field.key] = oldValues[field.key]
      continue
    }

    const value = sanitizeValue(field, inputValues[field.key])
    if(!isEmptyValue(value)) values[field.key] = value
    if(!sameValue(isEmptyValue(oldValues[field.key]) ? undefined : oldValues[field.key], isEmptyValue(value) ? undefined : value)){
      changed.push(field.label)
    }
  }

  let mode = `${body?.mode ?? record?.mode ?? ""}`
  if(definition.modes.length === 0) mode = ""
  else if(mode && !definition.modes.some(item => item.id === mode)){
    throw new IntegrationSaveError("Chế độ không hợp lệ!")
  }
  if(mode !== `${record?.mode || ""}`) changed.push("Chế độ")

  const enabled = body?.enabled === undefined ? record?.enabled !== false : body.enabled === true || body.enabled === "true"
  if(enabled !== (record ? record.enabled !== false : true)) changed.push(enabled ? "Bật" : "Tắt")

  await ApiIntegration.updateOne(
    { key: key },
    {
      $set: {
        key: key,
        enabled: enabled,
        mode: mode,
        values: values,
        secrets: secrets,
        updatedBy: accountName
      }
    },
    { upsert: true }
  )

  await loadIntegrations()
  return changed
}

// Bật / tắt 1 dịch vụ
export const setIntegrationEnabled = async (key: string, enabled: boolean, accountName: string) => {
  await ApiIntegration.updateOne(
    { key: key },
    { $set: { key: key, enabled: enabled, updatedBy: accountName } },
    { upsert: true }
  )
  await loadIntegrations()
}

// Lưu kết quả lần kiểm tra kết nối gần nhất
export const saveIntegrationTestResult = async (key: string, result: { ok: boolean, message: string, details: string[] }, accountName: string) => {
  await ApiIntegration.updateOne(
    { key: key },
    {
      $set: {
        key: key,
        lastTest: {
          at: new Date(),
          ok: result.ok,
          message: result.message.slice(0, 500),
          details: result.details.slice(0, 30).map(item => item.slice(0, 300)),
          accountName: accountName
        }
      }
    },
    { upsert: true }
  )
  await loadIntegrations()
}
