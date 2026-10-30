import { NextFunction, Request, Response } from "express"
import { clientLanguageList } from "../../config/variable.config"
import { localizedName, translate, translateCount, translateWord } from "../../helpers/language.helper"

// Ngôn ngữ khách đang chọn (cookie "lang"), chưa chọn thì dùng ngôn ngữ mặc định
// Tạo sẵn các hàm dịch để dùng trong file PUG:
// - t("key"): từ ngữ, ví dụ t("home") => "Главная"
// - tCount(5, "productCount"): số đếm, ví dụ "5 товаров"
// - tWord(5, "productCount"): chỉ lấy danh từ theo số đếm, ví dụ "товаров"
// - tName(product): tên theo ngôn ngữ (name / nameRu)
// - tOption(productOriginList, "VN"): tên lựa chọn theo id, ví dụ "Вьетнам"
export const setLanguage = (req: Request, res: Response, next: NextFunction) => {
  const language = clientLanguageList.find(item => item.id === req.cookies.lang) || clientLanguageList[0]
  const lang = language.id

  res.locals.lang = lang
  res.locals.currentLanguage = language
  res.locals.languageList = clientLanguageList
  res.locals.t = (key: string) => translate(lang, key)
  res.locals.tCount = (count: number, key: string) => translateCount(lang, count, key)
  res.locals.tWord = (count: number, key: string) => translateWord(lang, count, key)
  res.locals.tName = (item: any) => localizedName(item, lang)
  res.locals.tOption = (list: any[], id: string) => localizedName(list.find(item => item.id === id), lang)

  next()
}
