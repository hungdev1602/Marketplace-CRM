// Từ ngữ theo ngôn ngữ của trang khách hàng
// Dùng chung file từ ngữ với server (server/locales/ru.ts, vi.ts): thêm / sửa từ ở đó là cả 2 nơi cùng đổi
import ru from "../../../server/locales/ru"
import vi from "../../../server/locales/vi"
import { formatNumber } from "./format"

type Dictionary = { [key: string]: string | string[] }

const dictionaryList: { [lang: string]: Dictionary } = {
  ru: ru,
  vi: vi
}

// Danh sách ngôn ngữ (giống clientLanguageList ở server/config/variable.config.ts), ngôn ngữ đầu tiên là mặc định
export const languageList = [
  { id: "ru", name: "Русский", shortName: "RU" },
  { id: "vi", name: "Tiếng Việt", shortName: "VI" }
]

export const defaultLang = languageList[0].id

// Chọn dạng số nhiều tiếng Nga theo số đếm, forms: [1 товар, 2 товара, 5 товаров]
export const pluralRu = (count: number, forms: string[]): string => {
  const mod10 = count % 10
  const mod100 = count % 100

  if(mod10 === 1 && mod100 !== 11) return forms[0]
  if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

// Lấy từ ngữ theo ngôn ngữ, không có key thì trả về chính key (dễ phát hiện còn thiếu)
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

// Số đếm kèm danh từ, ví dụ: "5 товаров"
export const translateCount = (lang: string, count: number, key: string): string => {
  return `${formatNumber(count)} ${translateWord(lang, count, key)}`
}

// Tên của sản phẩm, danh mục, lựa chọn (xuất xứ, đơn vị,...) theo ngôn ngữ
export const localizedName = (item: any, lang: string): string => {
  if(!item) return ""
  if(lang === "ru") return item.nameRu || item.name || ""
  return item.name || item.nameRu || ""
}

// Bộ hàm dịch theo 1 ngôn ngữ (giống các hàm t, tCount, tWord, tName, tOption trong file PUG)
export type Translator = ReturnType<typeof createTranslator>

export const createTranslator = (lang: string) => ({
  lang: lang,
  t: (key: string) => translate(lang, key),
  tCount: (count: number, key: string) => translateCount(lang, count, key),
  tWord: (count: number, key: string) => translateWord(lang, count, key),
  tName: (item: any) => localizedName(item, lang),
  tOption: (list: any[] | undefined, id: string) => localizedName((list || []).find(item => item.id === id), lang)
})
