"use client"

import { useState } from "react"
import Swal from "sweetalert2"
import { adminUrl } from "@/lib/admin"
import { cx } from "@/lib/format"
import { adminRequest } from "../api"
import { drawNotify, notifyError, notifySuccess } from "../notify"

// ===== Kết nối API bên thứ 3 (Т-Банк, ApiShip, email) và Cài đặt cửa hàng =====

// Hiện kết quả "Kiểm tra kết nối": { ok, message, details: [dòng chi tiết] }
const showTestResult = async (data: any) => {
  const list = document.createElement("ul")
  list.className = "text-start small mb-0 ps-3"
  for (const line of data.details || []) {
    const item = document.createElement("li")
    item.textContent = line // textContent: không chèn HTML lạ vào trang
    list.append(item)
  }
  await Swal.fire({
    icon: data.ok ? "success" : "error",
    titleText: data.message,
    html: (data.details || []).length > 0 ? list : undefined,
    width: 640,
    confirmButtonText: "Đóng"
  })
}

// Gọi API kiểm tra kết nối, trả về true nếu gọi được (kết quả đã hiện cho người dùng)
const runTest = async (key: string): Promise<boolean> => {
  const data = await adminRequest(`/integration/test/${key}`, "POST")
  if(data.code !== "success") {
    notifyError(data.message || "Có lỗi xảy ra, vui lòng thử lại!")
    return false
  }
  await showTestResult(data)
  return true
}

const spinner = (text: string) => <><span className="spinner-border spinner-border-sm me-1"></span> {text}</>

// Nút "Kiểm tra" ở trang danh sách: xong thì tải lại trang để cập nhật kết quả
export function IntegrationTestButton({ integrationKey }: { integrationKey: string }) {
  const [isTesting, setIsTesting] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      disabled={isTesting}
      onClick={async () => {
        setIsTesting(true)
        if(await runTest(integrationKey)) {
          window.location.reload()
          return
        }
        setIsTesting(false)
      }}
    >
      {isTesting ? spinner("Đang kiểm tra...") : <><i className="fa-solid fa-plug-circle-check me-1"></i>Kiểm tra</>}
    </button>
  )
}

// Công tắc bật / tắt kết nối ở trang danh sách
export function IntegrationToggle({ integrationKey, name, enabled }: { integrationKey: string, name: string, enabled: boolean }) {
  const [checked, setChecked] = useState(enabled)
  const [isSending, setIsSending] = useState(false)

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabled = event.target.checked
    if(!newEnabled) {
      const result = await Swal.fire({
        title: `Tắt kết nối ${name}?`,
        text: "Website sẽ coi như chưa kết nối dịch vụ này (ví dụ tắt Т-Банк / ApiShip thì khách không đặt hàng được).",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Tắt",
        cancelButtonText: "Không"
      })
      if(!result.isConfirmed) return
    }

    setChecked(newEnabled)
    setIsSending(true)
    const data = await adminRequest(`/integration/toggle/${integrationKey}`, "PATCH", { enabled: newEnabled })
    if(data.code === "success") {
      drawNotify("success", data.message || "")
      return
    }
    notifyError(data.message || "Có lỗi xảy ra, vui lòng thử lại!")
    setChecked(!newEnabled)
    setIsSending(false)
  }

  return (
    <div className="form-check form-switch mb-0 me-auto">
      <input className="form-check-input" type="checkbox" role="switch" id={`toggle-${integrationKey}`} checked={checked} disabled={isSending} onChange={handleChange} />
      <label className="form-check-label" htmlFor={`toggle-${integrationKey}`}>{checked ? "Đang bật" : "Đang tắt"}</label>
    </div>
  )
}

// Nút copy (địa chỉ nhận thông báo Т-Банк)
export function CopyInput({ value }: { value: string }) {
  return (
    <div className="input-group input-group-sm">
      <input className="form-control font-monospace" type="text" value={value} readOnly />
      <button
        className="btn btn-outline-secondary"
        type="button"
        title="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            notifySuccess("Đã copy!")
          } catch {
            notifyError("Không copy được, vui lòng chọn và copy bằng tay")
          }
        }}
      >
        <i className="fa-solid fa-copy"></i>
      </button>
    </div>
  )
}

// Nhãn nguồn của giá trị: đã lưu ở admin / từ .env / mặc định
function SourceBadge({ field }: { field: any }) {
  if(field.source == "admin") return <span className="badge bg-success-subtle text-success ms-1">Đã lưu ở admin</span>
  if(field.source == "env") return <span className="badge bg-info-subtle text-info ms-1" title="Chưa nhập ở trang admin, đang dùng giá trị trong file .env">Từ .env</span>
  if(field.source == "default") return <span className="badge bg-secondary-subtle text-secondary ms-1" title="Giá trị mặc định trong config/variable.config.ts">Mặc định</span>
  return null
}

// Ô bí mật (khoá API, mật khẩu): không bao giờ được điền sẵn, để trống là giữ nguyên giá trị đang lưu
function SecretInput({ field, inputId }: { field: any, inputId: string }) {
  const [isShown, setIsShown] = useState(false)
  let placeholder = "Chưa có — nhập để lưu"
  if(field.source == "admin") placeholder = "•••••••• đã lưu — để trống nếu không đổi"
  else if(field.source == "env") placeholder = "•••••••• đang dùng từ .env — nhập để thay"

  return (
    <>
      <div className="input-group">
        <input
          className="form-control"
          id={inputId}
          type={isShown ? "text" : "password"}
          data-secret={field.key}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={placeholder}
        />
        <button className="btn btn-outline-secondary" type="button" title="Hiện / ẩn" onClick={() => setIsShown(!isShown)}>
          <i className={isShown ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
        </button>
      </div>
      {field.broken && (
        <div className="small text-danger mt-1">Không giải mã được khoá đã lưu (INTEGRATION_SECRET_KEY / JWT_SECRET đã bị đổi) — vui lòng nhập lại.</div>
      )}
      {field.source == "admin" && (
        <div className="form-check mt-1">
          <input className="form-check-input" type="checkbox" id={`${inputId}-clear`} data-clear-secret={field.key} />
          <label className="form-check-label small" htmlFor={`${inputId}-clear`}>Xoá giá trị đã lưu ở admin (dùng lại file .env nếu có)</label>
        </div>
      )}
    </>
  )
}

// 1 ô cấu hình (danh sách ô khai báo ở server/config/integration.config.ts, shop-setting.config.ts)
// Để trống ô thì dùng giá trị trong .env / mặc định (hiện ở chữ mờ trong ô)
function IntegrationField({ field, hidden }: { field: any, hidden: boolean }) {
  const inputId = `field-${field.key}`
  const fallbackText = Array.isArray(field.fallbackValue)
    ? field.fallbackValue.join(", ")
    : `${field.fallbackValue === undefined || field.fallbackValue === null ? "" : field.fallbackValue}`
  const fallbackLabel = field.fallbackSource == "env" ? "Từ .env" : "Mặc định"
  const isWide = ["checkbox-list", "textarea"].includes(field.type)

  let input: React.ReactNode
  if(field.type == "secret") {
    input = <SecretInput field={field} inputId={inputId} />
  }
  else if(field.type == "select") {
    const fallbackOption = (field.options || []).find((option: any) => option.id == field.fallbackValue)
    input = (
      <select className="form-select" id={inputId} data-field={field.key} defaultValue={field.adminValue ?? ""}>
        <option value="">— {fallbackOption ? `${fallbackLabel}: ${fallbackOption.name}` : "Chưa chọn"} —</option>
        {(field.options || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    )
  }
  else if(field.type == "switch") {
    input = (
      <select className="form-select" id={inputId} data-field={field.key} defaultValue={field.adminValue === true ? "true" : field.adminValue === false ? "false" : ""}>
        <option value="">— {fallbackLabel}: {field.fallbackValue === true ? "Bật" : "Tắt"} —</option>
        <option value="true">Bật</option>
        <option value="false">Tắt</option>
      </select>
    )
  }
  else if(field.type == "textarea") {
    let placeholder = field.placeholder ? `Ví dụ: ${field.placeholder}` : ""
    if(field.fallbackText) placeholder = `${fallbackLabel}:\n${field.fallbackText}`
    input = (
      <textarea
        className="form-control font-monospace"
        id={inputId}
        data-field={field.key}
        rows={field.rows || 4}
        placeholder={placeholder}
        spellCheck={false}
        defaultValue={field.adminText || ""}
      ></textarea>
    )
  }
  else if(field.type != "checkbox-list") {
    let placeholder = field.placeholder ? `Ví dụ: ${field.placeholder}` : ""
    if(fallbackText) placeholder = `${fallbackLabel}: ${fallbackText}`
    const isNumber = field.type == "number"
    input = (
      <div className={field.unit ? "input-group" : ""}>
        <input
          className="form-control"
          id={inputId}
          type={isNumber ? "number" : field.type == "email" ? "email" : field.type == "url" ? "url" : "text"}
          data-field={field.key}
          defaultValue={field.adminValue === undefined || field.adminValue === null ? "" : field.adminValue}
          placeholder={placeholder}
          min={isNumber ? (field.min === undefined ? 0 : field.min) : undefined}
          max={isNumber && field.max !== undefined ? field.max : undefined}
          step={isNumber ? (field.integer ? 1 : "any") : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {field.unit && <span className="input-group-text">{field.unit}</span>}
      </div>
    )
  }

  return (
    <div className={cx(isWide ? "col-12 mb-3" : "col-md-6 mb-3", hidden && "d-none")}>
      {field.type == "checkbox-list" ? (
        <>
          <label className="form-label d-block">
            {field.label}
            <SourceBadge field={field} />
          </label>
          <div className="integration-checkbox-grid">
            {(field.options || []).map((option: any) => (
              <div className="form-check" key={option.id}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`${inputId}-${option.id}`}
                  value={option.id}
                  data-field-list={field.key}
                  defaultChecked={(field.value || []).includes(option.id)}
                />
                <label className="form-check-label" htmlFor={`${inputId}-${option.id}`}>
                  {option.name}
                  <span className="text-muted small"> ({option.id})</span>
                </label>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <label className="form-label" htmlFor={inputId}>
            {field.label}
            {field.required && <span className="text-danger"> *</span>}
            <SourceBadge field={field} />
          </label>
          {input}
        </>
      )}
      {/* Dòng giải thích (khai báo trong config ở server, có thể chứa link) */}
      {field.help && <div className="form-text" dangerouslySetInnerHTML={{ __html: field.help }}></div>}
    </div>
  )
}

// Form cấu hình 1 kết nối (/admin/integration/edit/:key) hoặc 1 mục cài đặt cửa hàng (/admin/setting/edit/:key)
// - isSetting: trang Cài đặt cửa hàng, không có bật / tắt, chế độ, kiểm tra kết nối
// Gửi JSON: { enabled, mode, values: { ô: giá trị }, secrets: { ô: khoá mới }, clearSecrets: [ô] }
export function IntegrationForm({ view, groups, isSetting, siteUrl, siteUrlHttps }: {
  view: any
  groups: { name: string, fields: any[] }[]
  isSetting: boolean
  siteUrl?: string
  siteUrlHttps?: boolean
}) {
  const definition = view.definition
  const modes: any[] = definition.modes || []
  const [mode, setMode] = useState<string>(view.mode || "")
  const [submitting, setSubmitting] = useState<"" | "save" | "test">("")
  const listUrl = adminUrl(isSetting ? "/setting/list" : "/integration/list")

  // Ô có modes chỉ hiện ở các chế độ đó
  const isHidden = (fieldModes?: string[]) => Boolean(mode) && Array.isArray(fieldModes) && fieldModes.length > 0 && !fieldModes.includes(mode)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const thenTest = Boolean(submitter && submitter.hasAttribute("data-then-test"))

    // Gom dữ liệu form
    const body: any = { values: {}, secrets: {}, clearSecrets: [] }
    const enabledInput = form.querySelector<HTMLInputElement>("#integrationEnabled")
    if(enabledInput) body.enabled = enabledInput.checked
    if(mode) body.mode = mode
    form.querySelectorAll<HTMLInputElement>("[data-field]").forEach(input => {
      body.values[input.getAttribute("data-field") as string] = input.value.trim()
    })
    form.querySelectorAll<HTMLInputElement>("[data-field-list]").forEach(input => {
      const key = input.getAttribute("data-field-list") as string
      if(!body.values[key]) body.values[key] = []
      if(input.checked) body.values[key].push(input.value)
    })
    // Ô bí mật: chỉ gửi ô có nhập (để trống là giữ nguyên)
    form.querySelectorAll<HTMLInputElement>("[data-secret]").forEach(input => {
      if(input.value.trim()) body.secrets[input.getAttribute("data-secret") as string] = input.value.trim()
    })
    form.querySelectorAll<HTMLInputElement>("[data-clear-secret]:checked").forEach(input => {
      body.clearSecrets.push(input.getAttribute("data-clear-secret"))
    })

    setSubmitting(thenTest ? "test" : "save")
    const api = isSetting ? `/setting/edit/${definition.key}` : `/integration/edit/${definition.key}`
    const data = await adminRequest(api, "PATCH", body)

    if(data.code !== "success") {
      notifyError(data.message || "Có lỗi xảy ra, vui lòng thử lại!")
      setSubmitting("")
      return
    }
    if(!thenTest) {
      drawNotify("success", data.message || "")
      return
    }
    notifySuccess(data.message || "")
    await runTest(definition.key)
    window.location.reload()
  }

  return (
    <form autoComplete="off" onSubmit={handleSubmit}>
      {/* Bật / tắt + chế độ */}
      {!isSetting && (
        <div className="card">
          <div className="card-header"><h4 className="card-title mb-0">Trạng thái</h4></div>
          <div className="card-body">
            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" role="switch" id="integrationEnabled" name="enabled" defaultChecked={Boolean(view.enabled)} />
              <label className="form-check-label" htmlFor="integrationEnabled">
                <b>Bật kết nối</b>
                <span className="text-muted small ms-1">(tắt thì website coi như chưa kết nối dịch vụ này)</span>
              </label>
            </div>
            {modes.length > 0 && (
              <>
                <label className="form-label d-block">
                  Chế độ
                  {view.modeSource == "env" && <span className="badge bg-info-subtle text-info ms-1">Đang theo .env</span>}
                </label>
                <div className="row g-2">
                  {modes.map(item => (
                    <div className="col-md-6" key={item.id}>
                      <label className="integration-mode card mb-0 h-100" htmlFor={`mode-${item.id}`}>
                        <div className="card-body py-2">
                          <div className="form-check">
                            <input className="form-check-input" type="radio" name="mode" id={`mode-${item.id}`} value={item.id} checked={mode == item.id} onChange={() => setMode(item.id)} />
                            <span className="form-check-label fw-semibold">
                              {item.name}
                              {item.isTest && <span className="badge bg-info ms-1">Thử</span>}
                            </span>
                          </div>
                          <div className="small text-muted mt-1">{item.description}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                {definition.key == "tbank" && siteUrlHttps && !isHidden(["fake"]) && (
                  <div className="alert alert-danger py-2 mt-3 mb-0">
                    <i className="fa-solid fa-triangle-exclamation me-1"></i>
                    Website đang chạy trên tên miền thật ({siteUrl}) — KHÔNG dùng thanh toán giả khi bán thật: khách bấm «Оплатить (тест)» là đơn được coi như đã thanh toán.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Các nhóm ô cấu hình, nhóm không còn ô nào hiện thì ẩn cả nhóm */}
      {groups.map(group => {
        const isGroupHidden = group.fields.every(field => isHidden(field.modes))
        return (
          <div className={cx("card", isGroupHidden && "d-none")} key={group.name}>
            <div className="card-header"><h4 className="card-title mb-0">{group.name}</h4></div>
            <div className="card-body">
              <div className="row">
                {group.fields.map(field => <IntegrationField key={field.key} field={field} hidden={isHidden(field.modes)} />)}
              </div>
            </div>
          </div>
        )
      })}

      <div className="d-flex gap-2 mb-4">
        <button className="btn btn-primary" type="submit" disabled={Boolean(submitting)}>
          {submitting === "save" ? spinner("Đang lưu...") : <><i className="fa-solid fa-floppy-disk me-1"></i>Lưu</>}
        </button>
        {!isSetting && (
          <button className="btn btn-success" type="submit" data-then-test disabled={Boolean(submitting)}>
            {submitting === "test" ? spinner("Đang lưu và kiểm tra...") : <><i className="fa-solid fa-plug-circle-check me-1"></i>Lưu &amp; kiểm tra kết nối</>}
          </button>
        )}
        <a className="btn btn-outline-secondary" href={listUrl}>Quay lại</a>
      </div>
    </form>
  )
}
