import { Request, Response } from "express"
import { buildLegalDocument, legalDocumentList } from "../../helpers/legal.helper"
import { getLegalInfo } from "../../helpers/shop-setting.helper"
import { notFound } from "./error.controller"

// ===== Văn bản pháp lý: /legal (Правовая информация), /legal/privacy, /legal/consent, /legal/offer,... =====
// Nội dung văn bản: helpers/legal.helper.ts và thư mục helpers/legal-documents (tiếng Nga)
// Chạy được cả 2 giao diện: Next.js (frontend/src/app/(client)/legal) và PUG (views/client/pages/legal.pug)

// Danh sách văn bản (menu bên trái, chân trang) theo ngôn ngữ khách đang chọn
const documentMenu = (res: Response) => legalDocumentList.map(item => ({
  slug: item.slug,
  title: res.locals.t(item.titleKey),
  icon: item.icon
}))

// Trang Правовая информация: /legal
export const index = (req: Request, res: Response) => {
  const title = res.locals.t("legalInfo")
  res.render("client/pages/legal", {
    pageTitle: `${title} — SFoodie`,
    metaDescription: res.locals.t("legalInfoDescription"),
    legalDocList: documentMenu(res),
    legalDoc: {
      slug: "",
      title: title,
      html: buildLegalDocument("")
    }
  })
}

// Trang 1 văn bản: /legal/:slug
export const detail = (req: Request, res: Response) => {
  const document = legalDocumentList.find(item => item.slug === req.params.slug)
  if(!document){
    notFound(req, res)
    return
  }

  const title = res.locals.t(document.titleKey)
  res.render("client/pages/legal", {
    pageTitle: `${title} — SFoodie`,
    metaDescription: `${title} интернет-магазина SFoodie Asian Store.`,
    legalDocList: documentMenu(res),
    legalDoc: {
      slug: document.slug,
      title: title,
      html: buildLegalDocument(document.slug),
      effectiveDate: getLegalInfo().effectiveDate
    }
  })
}
