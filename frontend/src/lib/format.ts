// Các hàm định dạng dùng ở cả server component và client component
// (giống server/helpers/format.helper.ts)

// Giá tiền rúp kiểu Nga, ví dụ: 1250.5 => "1 250,5 ₽"
export const formatPrice = (price: number | null | undefined): string => {
  if(price === null || price === undefined) return ""
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price) + " ₽"
}

// Số kiểu Nga, ví dụ: 1250 => "1 250"
export const formatNumber = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value || 0)
}

// Dung lượng file, ví dụ: 1536 => "1.5 KB"
export const formatFileSize = (bytes: number): string => {
  if(bytes < 1024) return bytes + " B"
  if(bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / 1048576).toFixed(2) + " MB"
}

// Bỏ thẻ HTML để lấy chữ thuần, dài quá maxLength ký tự thì cắt bớt và thêm "…"
export const htmlToText = (html: string | null | undefined, maxLength: number = 160): string => {
  const text = (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if(text.length <= maxLength) return text
  return text.slice(0, maxLength - 1).trim() + "…"
}

// Số hiện trên biểu tượng giỏ hàng / yêu thích
export const countText = (count: number): string => count > 99 ? "99+" : `${count}`

// Ghép các class, bỏ giá trị trống: cx("a", active && "active") => "a active"
export const cx = (...list: (string | false | null | undefined)[]): string => list.filter(Boolean).join(" ")
