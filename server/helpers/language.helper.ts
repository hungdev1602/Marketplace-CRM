import ru from "../locales/ru"
import vi from "../locales/vi"
import { formatNumber } from "./format.helper"

// Từ ngữ theo từng ngôn ngữ (id ngôn ngữ trong clientLanguageList ở config/variable.config.ts)
const dictionaryList: { [lang: string]: { [key: string]: string | string[] } } = {
  ru: ru,
  vi: vi
}

// Chọn dạng số nhiều tiếng Nga theo số đếm
// - forms: [1 товар, 2 товара, 5 товаров]
export const pluralRu = (count: number, forms: string[]): string => {
  const mod10 = count % 10
  const mod100 = count % 100

  if(mod10 === 1 && mod100 !== 11) return forms[0]
  if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

// Lấy từ ngữ theo ngôn ngữ, không có key thì trả về chính key (dễ phát hiện còn thiếu)
// Mục có nhiều dạng số nhiều thì lấy dạng đầu tiên
export const translate = (lang: string, key: string): string => {
  const value = dictionaryList[lang]?.[key]
  if(value === undefined) return key
  return Array.isArray(value) ? value[0] : value
}

// Danh từ đếm được theo số đếm, ví dụ: tiếng Nga 5 => "товаров", tiếng Việt => "sản phẩm"
export const translateWord = (lang: string, count: number, key: string): string => {
  const value = dictionaryList[lang]?.[key]
  if(value === undefined) return key
  return Array.isArray(value) ? pluralRu(count, value) : value
}

// Số đếm kèm danh từ theo ngôn ngữ, ví dụ: tiếng Nga "5 товаров", tiếng Việt "5 sản phẩm"
export const translateCount = (lang: string, count: number, key: string): string => {
  return `${formatNumber(count)} ${translateWord(lang, count, key)}`
}

// Tên của sản phẩm, danh mục, lựa chọn trong danh sách (xuất xứ, đơn vị,...) theo ngôn ngữ
// Tiếng Nga dùng nameRu, chưa nhập nameRu thì dùng name (và ngược lại)
export const localizedName = (item: any, lang: string): string => {
  if(!item) return ""
  if(lang === "ru") return item.nameRu || item.name || ""
  return item.name || item.nameRu || ""
}
