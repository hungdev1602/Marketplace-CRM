import Link from "@/components/client/ShopLink"
import { telHref, translator, type ViewCtx } from "@/lib/view-ctx"

// Chân trang gọn: cột Liên hệ (bên trái) + 3 cột link (Cửa hàng, Dành cho khách hàng, Thông tin)
// Dòng cuối: bản quyền + thông tin người bán (bên trái), chính sách xử lý dữ liệu cá nhân (bên phải)
// Chọn ngôn ngữ nằm ở đầu trang (máy tính) và menu ☰ (điện thoại), nên chân trang không cần nữa
export function Footer({ ctx }: { ctx: ViewCtx }) {
  const { t, tName } = translator(ctx)
  const { shopInfo, clientAccount } = ctx

  // Thông tin người bán (Admin => Cài đặt cửa hàng => Thông tin cửa hàng), mục nào trống thì không hiện
  // Địa chỉ đăng ký và đầy đủ thông tin khác ở trang /legal
  const ogrnLabel = `${shopInfo.ogrn || ""}`.replace(/\D/g, "").length == 15 ? "ОГРНИП" : "ОГРН"
  const sellerParts = [
    shopInfo.legalName,
    shopInfo.inn ? `ИНН ${shopInfo.inn}` : "",
    shopInfo.ogrn ? `${ogrnLabel} ${shopInfo.ogrn}` : ""
  ].filter(Boolean)

  const socialList = [
    { url: shopInfo.telegram, icon: "fab fa-telegram-plane", name: "Telegram" },
    { url: shopInfo.whatsapp, icon: "fab fa-whatsapp", name: "WhatsApp" },
    { url: shopInfo.vk, icon: "fab fa-vk", name: "VK" }
  ].filter(item => item.url)

  // 3 cột link
  const columnList: { title: string, links: { url: string, name: string }[] }[] = [
    {
      title: t("footerShop"),
      links: [
        { url: "/products?sort=newest", name: t("newArrivals") },
        { url: "/products?onSale=1", name: t("sale") },
        ...ctx.categoryTree.slice(0, 2).map(item => ({ url: `/category/${item.slug}`, name: tName(item) })),
        { url: "/categories", name: t("allCategories") }
      ]
    },
    {
      title: t("footerCustomers"),
      links: [
        { url: "/legal/delivery", name: t("legalDelivery") },
        { url: "/legal/returns", name: t("legalReturns") },
        { url: clientAccount ? "/account" : "/account/login", name: clientAccount ? t("myAccount") : t("loginOrRegister") },
        { url: "/wishlist", name: t("wishlist") }
      ]
    },
    {
      title: t("footerInfo"),
      links: [
        { url: "/blog", name: t("blog") },
        { url: "/legal", name: t("legalInfo") },
        { url: "/legal/offer", name: t("legalOffer") }
      ]
    }
  ]

  return (
    <footer className="sf-footer">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-4">
            <h2 className="sf-footer-title">{t("footerContact")}</h2>
            <ul className="sf-footer-contact">
              {shopInfo.phone && (
                <li>
                  <a href={telHref(shopInfo.phone)} className="sf-footer-phone">{shopInfo.phone}</a>
                </li>
              )}
              {shopInfo.email && (
                <li>
                  <a href={`mailto:${shopInfo.email}`}>{shopInfo.email}</a>
                </li>
              )}
              {shopInfo.address && <li>{shopInfo.address}</li>}
              {shopInfo.workingHours && <li>{t("workingHours")}: {shopInfo.workingHours}</li>}
            </ul>
            {socialList.length > 0 && (
              <ul className="sf-footer-social">
                {socialList.map(item => (
                  <li key={item.name}>
                    <a href={item.url} target="_blank" rel="noopener" aria-label={item.name}><i className={item.icon}></i></a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-lg-8">
            <div className="row gy-4">
              {columnList.map(column => (
                <div className="col-sm-4 col-6" key={column.title}>
                  <h3>{column.title}</h3>
                  <ul className="sf-footer-links">
                    {column.links.map(item => (
                      <li key={item.url}>
                        <Link href={item.url}>{item.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sf-footer-bottom">
          <p className="sf-footer-copy">
            © {ctx.currentYear} SFoodie Asian Store
            {sellerParts.length > 0 && <span className="sf-footer-legal"> · {sellerParts.join(" · ")}</span>}
          </p>
          <Link href="/legal/privacy" className="sf-footer-policy">{t("legalPrivacy")}</Link>
        </div>
      </div>
    </footer>
  )
}
