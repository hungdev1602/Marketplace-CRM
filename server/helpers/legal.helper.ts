import { apishipProviderList } from "../config/variable.config"
import { getApishipColdProviderKeys, getApishipProviderKeys } from "./apiship.helper"
import { formatPrice } from "./format.helper"
import { getCheckoutSettings, getLegalInfo, getReviewSettings, getShopInfo } from "./shop-setting.helper"
import { getSiteUrl } from "./site-url.helper"
import { privacyPolicy } from "./legal-documents/privacy"
import { personalDataConsent } from "./legal-documents/consent"
import { publicOffer } from "./legal-documents/offer"
import { deliveryTerms } from "./legal-documents/delivery"
import { returnTerms } from "./legal-documents/returns"
import { legalIndex } from "./legal-documents/index"

// ===== Văn bản pháp lý ở trang khách hàng: /legal (danh sách), /legal/privacy, /legal/consent,... =====
// Nội dung văn bản (tiếng Nga — ngôn ngữ có hiệu lực pháp lý ở Nga) nằm trong thư mục helpers/legal-documents.
// Thông tin người bán (tên, ИНН, ОГРНИП, địa chỉ, email...) lấy từ trang admin: Cài đặt cửa hàng => Thông tin cửa hàng
// và Văn bản pháp lý, nên sửa ở trang admin là văn bản đổi theo, không cần sửa code.
// Ô nào còn trống thì văn bản hiện chữ đỏ [не указано: ...] để dễ thấy còn thiếu gì.

// Danh sách văn bản: slug (đường dẫn /legal/slug), titleKey (key từ ngữ trong locales, dùng cho tiêu đề, menu, chân trang)
export const legalDocumentList = [
  { slug: "privacy", titleKey: "legalPrivacy", icon: "fas fa-user-shield", build: (ctx: LegalContext) => privacyPolicy(ctx) },
  { slug: "consent", titleKey: "legalConsent", icon: "fas fa-file-signature", build: (ctx: LegalContext) => personalDataConsent(ctx) },
  { slug: "offer", titleKey: "legalOffer", icon: "fas fa-file-contract", build: (ctx: LegalContext) => publicOffer(ctx) },
  { slug: "delivery", titleKey: "legalDelivery", icon: "fas fa-truck", build: (ctx: LegalContext) => deliveryTerms(ctx) },
  { slug: "returns", titleKey: "legalReturns", icon: "fas fa-undo-alt", build: (ctx: LegalContext) => returnTerms(ctx) }
]

// Đổi ký tự đặc biệt để chữ admin nhập (tên, địa chỉ...) không thành thẻ HTML
export const escapeHtml = (text: string): string => {
  return `${text ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Ô chưa điền ở trang admin: hiện chữ đỏ trong văn bản
const missing = (label: string): string => `<mark class="sf-legal-missing">[не указано: ${label}]</mark>`

const valueOrMissing = (text: string, label: string): string => text ? escapeHtml(text) : missing(label)

const emailLink = (email: string, label: string): string => {
  return email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : missing(label)
}

// Liệt kê: "А, Б и В"
const joinRu = (list: string[]): string => {
  if(list.length <= 1) return list.join("")
  return `${list.slice(0, -1).join(", ")} и ${list[list.length - 1]}`
}

const providerNames = (keys: string[]): string[] => {
  return keys
    .map(key => apishipProviderList.find(item => item.id === key)?.name || "")
    .filter(Boolean)
}

// Dữ liệu dùng trong văn bản (đã đổi sang HTML an toàn)
export const buildLegalContext = () => {
  const shopInfo = getShopInfo()
  const legalInfo = getLegalInfo()
  const checkout = getCheckoutSettings()
  const siteUrl = getSiteUrl()
  const siteHost = siteUrl.replace(/^https?:\/\//i, "")

  const ogrnDigits = `${shopInfo.ogrn || ""}`.replace(/\D/g, "")
  const isIndividual = ogrnDigits.length === 15 || /^ИП\s/i.test(shopInfo.legalName) || /индивидуальн/i.test(shopInfo.legalName)
  const ogrnLabel = isIndividual ? "ОГРНИП" : "ОГРН"

  const docUrl = (slug: string) => `${siteUrl}/legal/${slug}`

  const ctx = {
    siteUrl: siteUrl,
    siteLink: `<a href="${escapeHtml(siteUrl)}">${escapeHtml(siteHost)}</a>`,
    shopName: "SFoodie Asian Store",
    isIndividual: isIndividual,
    seller: valueOrMissing(shopInfo.legalName, "наименование продавца"),
    inn: valueOrMissing(shopInfo.inn, "ИНН"),
    ogrnLabel: ogrnLabel,
    ogrn: valueOrMissing(shopInfo.ogrn, ogrnLabel),
    legalAddress: valueOrMissing(shopInfo.legalAddress, "адрес регистрации"),
    email: emailLink(shopInfo.email, "email магазина"),
    phone: shopInfo.phone ? escapeHtml(shopInfo.phone) : "",
    address: shopInfo.address ? escapeHtml(shopInfo.address) : "",
    workingHours: shopInfo.workingHours ? escapeHtml(shopInfo.workingHours) : "",
    effectiveDate: valueOrMissing(legalInfo.effectiveDate, "дата редакции"),
    pdEmail: emailLink(legalInfo.pdEmail || shopInfo.email, "email для обращений"),
    pdResponsible: valueOrMissing(legalInfo.pdResponsible || shopInfo.legalName, "ответственный"),
    rknNumber: legalInfo.rknNumber ? escapeHtml(legalInfo.rknNumber) : "",
    hosting: legalInfo.hosting ? escapeHtml(legalInfo.hosting) : "",
    minOrderValue: checkout.minOrderValue > 0 ? formatPrice(checkout.minOrderValue) : "",
    freeDeliveryFrom: checkout.freeDeliveryFrom > 0 ? formatPrice(checkout.freeDeliveryFrom) : "",
    paymentTimeoutMinutes: checkout.paymentTimeoutMinutes,
    reviewEditDays: getReviewSettings().editDays,
    // Hãng vận chuyển cho khách chọn (trang admin: Kết nối API => ApiShip), [] = tất cả hãng đã kết nối
    providers: joinRu(providerNames(getApishipProviderKeys()).map(escapeHtml)),
    coldProviders: joinRu(providerNames(getApishipColdProviderKeys()).map(escapeHtml)),
    // Link tới văn bản khác: <a href="/legal/privacy">https://site/legal/privacy</a>
    docLink: (slug: string, text?: string) => `<a href="/legal/${slug}">${escapeHtml(text || docUrl(slug))}</a>`,
    sellerDetails: ""
  }

  // Thông tin người bán (dùng ở cuối оферта, trang /legal, chính sách dữ liệu cá nhân)
  ctx.sellerDetails = `
<ul class="sf-legal-details">
  <li><span>Продавец</span><b>${ctx.seller}</b></li>
  <li><span>ИНН</span><b>${ctx.inn}</b></li>
  <li><span>${ctx.ogrnLabel}</span><b>${ctx.ogrn}</b></li>
  <li><span>Адрес регистрации</span><b>${ctx.legalAddress}</b></li>
  ${ctx.address ? `<li><span>Адрес магазина / склада</span><b>${ctx.address}</b></li>` : ""}
  <li><span>Email</span><b>${ctx.email}</b></li>
  ${ctx.phone ? `<li><span>Телефон</span><b>${ctx.phone}</b></li>` : ""}
  ${ctx.workingHours ? `<li><span>Часы работы</span><b>${ctx.workingHours}</b></li>` : ""}
</ul>`

  return ctx
}

export type LegalContext = ReturnType<typeof buildLegalContext>

// Phiên bản văn bản khách đồng ý (lưu kèm tài khoản / đơn hàng khi khách tick «đồng ý»), = ngày có hiệu lực
export const getLegalVersion = (): string => {
  return getLegalInfo().effectiveDate
}

// Tạo nội dung HTML của 1 văn bản, slug "" là trang danh sách /legal
export const buildLegalDocument = (slug: string): string => {
  const ctx = buildLegalContext()
  if(!slug) return legalIndex(ctx)
  const document = legalDocumentList.find(item => item.slug === slug)
  return document ? document.build(ctx) : ""
}

// Chữ có chỗ đặt link, ví dụ t("agreeText") = "Даю {consent} в соответствии с {policy}"
// => HTML có link tới văn bản (dùng ở form đăng ký, đặt hàng của giao diện PUG; giao diện Next.js có hàm giống vậy)
export const legalLinkText = (text: string, linkList: { [name: string]: { href: string, text: string } }): string => {
  return escapeHtml(text).replace(/\{(\w+)\}/g, (match, name) => {
    const link = linkList[name]
    if(!link) return match
    return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.text)}</a>`
  })
}
