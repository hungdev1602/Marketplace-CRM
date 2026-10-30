import { Request, Response } from "express"
import { clientLanguageList } from "../../config/variable.config"

// Đổi ngôn ngữ: lưu vào cookie "lang" (1 năm) rồi quay lại trang khách đang xem
export const change = (req: Request, res: Response) => {
  const language = clientLanguageList.find(item => item.id === req.params.lang)

  if(language){
    res.cookie("lang", language.id, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: "lax"
    })
  }

  // Chỉ quay lại trang trong website (lấy đường dẫn của trang trước), không chuyển sang trang web khác
  let backUrl = "/"
  try {
    const referer = new URL(`${req.get("Referer")}`)
    if(referer.host === req.get("host")){
      backUrl = referer.pathname + referer.search
    }
  } catch (error) {
    // không có trang trước (gõ thẳng đường dẫn) thì về trang chủ
  }

  res.redirect(backUrl)
}
