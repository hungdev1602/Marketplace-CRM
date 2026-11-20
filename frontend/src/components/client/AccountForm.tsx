"use client"

import { useId, useState } from "react"
import { sendJson } from "@/lib/api-client"
import { cx } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { goTo } from "@/lib/top-loader"

// ===== Form tài khoản khách: đăng nhập, đăng ký, quên mật khẩu, sửa thông tin, đổi mật khẩu =====
// Gửi bằng fetch (JSON) tới server Express
// Server trả về { code, message, field, redirect }: field là ô bị lỗi (tô đỏ, đưa con trỏ vào ô đó),
// redirect là trang chuyển tới sau khi thành công (ví dụ quay lại giỏ hàng sau khi đăng nhập)
// Không dùng thông báo lỗi của trình duyệt (noValidate), server trả lời báo lỗi theo ngôn ngữ khách chọn

type FormProps = {
  lang: string
  action: string // đường dẫn của server Express, ví dụ "/account/login"
  method?: string // PATCH,... (mặc định POST)
  resetOnSuccess?: boolean // gửi thành công thì xoá trắng form (form đổi mật khẩu)
  submitLabel: React.ReactNode
  submitClassName?: string
  messageAfterButton?: boolean // dòng báo lỗi / thành công nằm dưới nút gửi (mặc định nằm trên)
  children?: React.ReactNode
}

export function AccountForm({ lang, action, method = "POST", resetOnSuccess, submitLabel, submitClassName, messageAfterButton, children }: FormProps) {
  const { t } = createTranslator(lang)
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null)
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget

    // Bỏ tô đỏ của lần gửi trước
    form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"))
    setMessage(null)

    // Ô tick không được tick thì FormData không có ô đó (server hiểu là chưa đồng ý)
    const data = Object.fromEntries(new FormData(form))

    setIsSending(true)
    const result = await sendJson(action, method, data, t("errorGeneral"))

    if(result.code === "success") {
      if(result.redirect) {
        // Giữ nút bị khoá trong lúc chuyển trang để khách không bấm 2 lần
        // Tải lại toàn bộ trang để đầu trang, giỏ hàng hiện theo tài khoản vừa đăng nhập
        goTo(result.redirect)
        return
      }
      setMessage({ text: result.message || "", type: "success" })
      if(resetOnSuccess) form.reset()
    }
    else {
      setMessage({ text: result.message || "", type: "error" })
      const input = result.field ? form.querySelector<HTMLInputElement>(`[name="${result.field}"]`) : null
      if(input) {
        input.setAttribute("aria-invalid", "true")
        input.focus()
      }
      // Phiên đăng nhập đã hết (trang tài khoản): chuyển về trang đăng nhập
      if(result.redirect) {
        goTo(result.redirect)
        return
      }
    }

    setIsSending(false)
  }

  const messageElement = (
    <p className={cx("sf-form-message", message && `is-${message.type}`)} role="alert" hidden={!message?.text}>
      {message?.text}
    </p>
  )

  return (
    <form
      action={action}
      method="POST"
      noValidate
      onSubmit={handleSubmit}
      // Khách sửa ô bị lỗi thì bỏ tô đỏ
      onInput={event => (event.target as HTMLElement).removeAttribute("aria-invalid")}
    >
      {children}
      {!messageAfterButton && messageElement}
      <button type="submit" className={submitClassName || "sf-btn sf-btn-primary sf-auth-submit"} disabled={isSending}>
        {submitLabel}
      </button>
      {messageAfterButton && messageElement}
    </form>
  )
}

// 1 ô nhập trong form tài khoản
// - optional: hiện chữ "необязательно", hint: dòng gợi ý dưới ô
// - Ô mật khẩu có nút 👁 hiện / ẩn mật khẩu
type FieldProps = {
  lang: string
  name: string
  label: string
  type: string
  id?: string
  defaultValue?: string
  autoComplete?: string
  inputMode?: "email" | "tel" | "text" | "numeric"
  maxLength?: number
  readOnly?: boolean
  optional?: boolean
  hint?: string
}

export function FormField({ lang, name, label, type, id, defaultValue, autoComplete, inputMode, maxLength, readOnly, optional, hint }: FieldProps) {
  const { t } = createTranslator(lang)
  const autoId = useId()
  const inputId = id || `field-${name}-${autoId}`
  const [isShown, setIsShown] = useState(false)
  const isPassword = type == "password"

  return (
    <div className="sf-field">
      <label htmlFor={inputId}>
        {label}
        {optional && <span className="sf-field-optional">{t("optional")}</span>}
      </label>
      <div className={cx("sf-field-input", isPassword && "has-toggle")}>
        <input
          id={inputId}
          type={isPassword && isShown ? "text" : type}
          name={name}
          defaultValue={defaultValue}
          autoComplete={autoComplete || "off"}
          inputMode={inputMode}
          maxLength={maxLength}
          readOnly={readOnly}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="sf-password-toggle"
            aria-label={t("showPassword")}
            title={t("showPassword")}
            aria-pressed={isShown}
            onClick={() => setIsShown(!isShown)}
          >
            <i className={isShown ? "far fa-eye-slash" : "far fa-eye"}></i>
          </button>
        )}
      </div>
      {hint && <p className="sf-field-hint" id={`${inputId}-hint`}>{hint}</p>}
    </div>
  )
}
