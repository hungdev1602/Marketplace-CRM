"use client"

import { useState } from "react"
import Swal from "sweetalert2"
import { adminRequest } from "./api"
import { drawNotify, notifyError, notifySuccess } from "./notify"

// ===== Nút thao tác gọi API rồi tải lại trang (trang chi tiết đơn hàng, đánh giá sản phẩm, kết nối API) =====
// - confirm: hỏi lại trước khi làm
// - reason: hỏi thêm lý do (huỷ đơn, từ chối đánh giá), reasonPlaceholder: chữ gợi ý trong ô lý do
// - pickupDateSelector: gửi kèm ngày giao hàng cho hãng vận chuyển (lấy giá trị ở ô này)
// - openUrl: server trả về { url } thì mở link trong tab mới (phiếu gửi hàng)
type Props = {
  api: string // đường dẫn sau /admin
  method?: string
  confirm?: string
  reason?: boolean
  reasonPlaceholder?: string
  pickupDateSelector?: string
  openUrl?: boolean
  className?: string
  children: React.ReactNode
}

export function ActionButton({ api, method = "PATCH", confirm, reason, reasonPlaceholder, pickupDateSelector, openUrl, className, children }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    const body: { [key: string]: string } = {}
    if(pickupDateSelector) {
      body.pickupDate = document.querySelector<HTMLInputElement>(pickupDateSelector)?.value || ""
    }

    if(reason) {
      const result = await Swal.fire({
        title: confirm,
        input: "text",
        inputPlaceholder: reasonPlaceholder || "Lý do huỷ (không bắt buộc), ví dụ: hết hàng, khách yêu cầu huỷ",
        showCancelButton: true,
        confirmButtonText: "Đồng ý",
        cancelButtonText: "Không"
      })
      if(!result.isConfirmed) return
      body.reason = result.value || ""
    }
    else if(confirm) {
      const result = await Swal.fire({
        title: confirm,
        showCancelButton: true,
        confirmButtonText: "Đồng ý",
        cancelButtonText: "Không"
      })
      if(!result.isConfirmed) return
    }

    // Mở sẵn tab mới ngay khi bấm (trình duyệt chặn mở tab sau khi chờ server trả lời)
    const newTab = openUrl ? window.open("", "_blank") : null
    setIsLoading(true)
    const data = await adminRequest(api, method, body)

    if(data.code === "success") {
      if(data.url) {
        if(newTab) newTab.location.href = data.url
        else window.open(data.url, "_blank")
        setIsLoading(false)
        return
      }
      drawNotify("success", data.message || "")
      return
    }

    newTab?.close()
    notifyError(data.message || "Có lỗi xảy ra, vui lòng thử lại!")
    setIsLoading(false)
  }

  return (
    <button type="button" className={className} disabled={isLoading} onClick={handleClick}>
      {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span> Đang xử lý...</> : children}
    </button>
  )
}

// Form 1 ô chữ gửi bằng PATCH (ghi chú nội bộ của đơn hàng, trả lời đánh giá)
// - field: tên ô gửi lên server
// - reloadOnSuccess: thành công thì tải lại trang (không thì chỉ hiện thông báo)
export function TextPatchForm({ api, field, defaultValue, rows, maxLength, placeholder, disabled, submitLabel, reloadOnSuccess, submitClassName = "btn btn-primary btn-sm" }: {
  api: string
  field: string
  defaultValue?: string
  rows: number
  maxLength: number
  placeholder?: string
  disabled?: boolean
  submitLabel?: string // không có thì không hiện nút gửi
  reloadOnSuccess?: boolean
  submitClassName?: string
}) {
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = `${new FormData(event.currentTarget).get(field) || ""}`
    setIsSending(true)
    const data = await adminRequest(api, "PATCH", { [field]: value })
    if(data.code === "success") {
      if(reloadOnSuccess) {
        drawNotify("success", data.message || "")
        return
      }
      notifySuccess(data.message || "")
    }
    else {
      notifyError(data.message || "Có lỗi xảy ra, vui lòng thử lại!")
    }
    setIsSending(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea className="form-control mb-2" name={field} rows={rows} maxLength={maxLength} placeholder={placeholder} disabled={disabled} defaultValue={defaultValue}></textarea>
      {submitLabel && <button className={submitClassName} type="submit" disabled={isSending}>{submitLabel}</button>}
    </form>
  )
}
