"use client"

import { useEffect, useState } from "react"
import { adminUrl } from "@/lib/admin"
import { adminCall } from "../api"
import { PasswordInput, formValues, isEmail, required, validate, type Errors, FieldError } from "../form"
import { saveNotify, showSavedNotify } from "../notify"

// Form đăng nhập trang quản trị (server: POST /admin/account/login)
export function LoginForm() {
  const [errors, setErrors] = useState<Errors>({})
  const [isSending, setIsSending] = useState(false)

  // Thông báo trang trước để lại (ví dụ "Đã đăng xuất")
  useEffect(() => {
    showSavedNotify()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = formValues(form)

    const newErrors = validate(values, {
      email: [required("Vui lòng nhập email!"), isEmail("Email không đúng định dạng!")],
      password: [required("Vui lòng nhập mật khẩu!")]
    })
    setErrors(newErrors)
    if(Object.keys(newErrors).length > 0) return

    const formData = new FormData()
    formData.append("email", values.email)
    formData.append("password", values.password)
    formData.append("rememberPassword", `${values.rememberPassword === "on"}`)

    setIsSending(true)
    const data = await adminCall("/account/login", "POST", formData)
    if(data) {
      // Lưu thông báo, sang trang tổng quan sẽ hiện thông báo
      saveNotify(data.code, data.message || "")
      window.location.href = adminUrl("/dashboard")
      return
    }
    setIsSending(false)
  }

  return (
    // method="post": nếu JS chưa tải xong mà bấm đăng nhập, mật khẩu không bị hiện lên thanh địa chỉ
    <form className="my-4" method="post" noValidate onSubmit={handleSubmit}>
      <div className="form-group mb-2">
        <label className="form-label" htmlFor="email">Email</label>
        <input className="form-control" id="email" type="email" name="email" placeholder="Nhập email" autoComplete="email" />
        <FieldError message={errors.email} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="password">Mật khẩu</label>
        <PasswordInput name="password" placeholder="Nhập mật khẩu" autoComplete="current-password" error={errors.password} />
      </div>
      <div className="form-group mt-3">
        <div className="form-check form-switch form-switch-success">
          <input className="form-check-input" id="rememberPassword" type="checkbox" name="rememberPassword" />
          <label className="form-check-label" htmlFor="rememberPassword">Ghi nhớ đăng nhập (30 ngày)</label>
        </div>
      </div>
      <div className="d-grid mt-3">
        <button className="btn btn-primary" type="submit" disabled={isSending}>
          Đăng nhập
          <i className="fas fa-sign-in-alt ms-1"></i>
        </button>
      </div>
    </form>
  )
}
