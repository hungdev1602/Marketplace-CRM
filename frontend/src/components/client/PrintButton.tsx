"use client"

// Nút in văn bản (trang /legal/...): mở hộp thoại in của trình duyệt, khách có thể chọn «Lưu thành PDF»
// Khi in chỉ còn nội dung văn bản (đầu trang, menu, chân trang bị ẩn: @media print trong sfoodie.css)
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="sf-legal-print" onClick={() => window.print()}>
      <i className="fas fa-print"></i>
      <span>{label}</span>
    </button>
  )
}
