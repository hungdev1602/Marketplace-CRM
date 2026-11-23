import { Fragment } from "react"

// Chữ có chỗ đặt link, ví dụ t("agreeText") = "Даю {consent} в соответствии с {policy}"
// => "Даю <a>согласие на обработку...</a> в соответствии с <a>Политикой...</a>"
// newTab (mặc định bật): link mở ở tab mới để khách đang điền form (đăng ký, đặt hàng) không bị mất dữ liệu đã nhập
// (giao diện PUG dùng hàm legalLinkText ở server/helpers/legal.helper.ts)
export function LinkedText({ text, links, newTab = true }: {
  text: string
  links: { [name: string]: { href: string, text: string } }
  newTab?: boolean
}) {
  const parts = text.split(/(\{\w+\})/g)

  return (
    <>
      {parts.map((part, index) => {
        const link = links[part.replace(/^\{(\w+)\}$/, "$1")]
        if(!/^\{\w+\}$/.test(part) || !link) return <Fragment key={index}>{part}</Fragment>
        return newTab
          ? <a key={index} href={link.href} target="_blank" rel="noopener">{link.text}</a>
          : <a key={index} href={link.href}>{link.text}</a>
      })}
    </>
  )
}

// Link của các ô tick đồng ý (dùng chung ở trang đăng ký và đặt hàng)
export const consentLinks = (t: (key: string) => string) => ({
  consent: { href: "/legal/consent", text: t("linkConsent") },
  policy: { href: "/legal/privacy", text: t("linkPolicy") }
})

export const offerLinks = (t: (key: string) => string) => ({
  offer: { href: "/legal/offer", text: t("linkOffer") },
  delivery: { href: "/legal/delivery", text: t("linkDelivery") },
  returns: { href: "/legal/returns", text: t("linkReturns") }
})
