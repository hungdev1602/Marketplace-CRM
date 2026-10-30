export const formatFileSize = (bytes: number): string => {
  // Nếu < 1024 thì hiển thị đơn vị bytes
  if (bytes < 1024) return bytes + " B"

  // Nếu < 1024 * 1024 = 1048576 (1MB) thì hiển thị đơn vị KB
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"

  // Nếu >= 1MB thì hiển thị đơn bị MB
  return (bytes / 1048576).toFixed(2) + " MB"
}

// Định dạng giá tiền rúp theo kiểu Nga, ví dụ: 1250.5 => "1 250,5 ₽"
export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return ""

  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price) + " ₽"
}

// Định dạng số kiểu Nga (giống giá tiền), ví dụ: 1250 => "1 250"
export const formatNumber = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value || 0)
}

// Bỏ thẻ HTML (nội dung từ trình soạn thảo) để lấy chữ thuần, dùng cho thẻ meta description (Google/Yandex)
// Dài quá maxLength ký tự thì cắt bớt và thêm "…"
export const htmlToText = (html: string | null | undefined, maxLength: number = 160): string => {
  const text = (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if(text.length <= maxLength) return text
  return text.slice(0, maxLength - 1).trim() + "…"
}
