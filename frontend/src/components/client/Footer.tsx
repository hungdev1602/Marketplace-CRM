import Link from "@/components/client/ShopLink"
import { languageList } from "@/lib/i18n"
import { telHref, translator, type ViewCtx } from "@/lib/view-ctx"

// Chân trang: giới thiệu, danh mục, link cho khách, liên hệ, thông tin người bán
export function Footer({ ctx }: { ctx: ViewCtx }) {
  const { t, tName } = translator(ctx)
  const { shopInfo, clientAccount } = ctx

  // Thông tin người bán (Admin => Cài đặt cửa hàng => Thông tin cửa hàng), mục nào trống thì không hiện
  const ogrnLabel = `${shopInfo.ogrn || ""}`.replace(/\D/g, "").length == 15 ? "ОГРНИП" : "ОГРН"
  const legalParts = [
    shopInfo.legalName,
    shopInfo.inn ? `ИНН ${shopInfo.inn}` : "",
    shopInfo.ogrn ? `${ogrnLabel} ${shopInfo.ogrn}` : "",
    shopInfo.legalAddress
  ].filter(Boolean)

  return (
    <footer className="sf-footer">
      <div className="container">
        <div className="row gy-4">
          <div className="col-xl-4 col-lg-4 col-md-12">
            <Link href="/" className="sf-footer-logo">
              <img className="img-fluid" alt="SFoodie Asian Store" src="/client/assets/images/sfoodie-logo.png" width={480} height={118} loading="lazy" />
            </Link>
            <p className="sf-footer-about">{t("footerAbout")}</p>
            {(shopInfo.telegram || shopInfo.whatsapp || shopInfo.vk) && (
              <ul className="sf-footer-social">
                {shopInfo.telegram && (
                  <li>
                    <a href={shopInfo.telegram} target="_blank" rel="noopener" aria-label="Telegram"><i className="fab fa-telegram-plane"></i></a>
                  </li>
                )}
                {shopInfo.whatsapp && (
                  <li>
                    <a href={shopInfo.whatsapp} target="_blank" rel="noopener" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
                  </li>
                )}
                {shopInfo.vk && (
                  <li>
                    <a href={shopInfo.vk} target="_blank" rel="noopener" aria-label="VK"><i className="fab fa-vk"></i></a>
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6">
            <h3>{t("footerCatalog")}</h3>
            <ul className="sf-footer-links">
              {ctx.categoryTree.slice(0, 6).map(item => (
                <li key={item.id}>
                  <Link href={`/category/${item.slug}`}>{tName(item)}</Link>
                </li>
              ))}
              <li>
                <Link href="/categories">{t("allCategories")}</Link>
              </li>
            </ul>
          </div>
          <div className="col-xl-2 col-lg-2 col-md-4 col-sm-6">
            <h3>{t("footerCustomers")}</h3>
            <ul className="sf-footer-links">
              <li><Link href="/products">{t("products")}</Link></li>
              <li><Link href="/products?onSale=1">{t("sale")}</Link></li>
              <li><Link href="/products?sort=newest">{t("newArrivals")}</Link></li>
              <li><Link href="/blog">{t("blog")}</Link></li>
              <li>
                <Link href={clientAccount ? "/account" : "/account/login"}>{clientAccount ? t("myAccount") : t("loginOrRegister")}</Link>
              </li>
              <li><Link href="/wishlist">{t("wishlist")}</Link></li>
              <li><Link href="/cart">{t("cart")}</Link></li>
              <li><Link href="/legal/delivery">{t("legalDelivery")}</Link></li>
              <li><Link href="/legal/returns">{t("legalReturns")}</Link></li>
            </ul>
          </div>
          <div className="col-xl-3 col-lg-3 col-md-4">
            <h3>{t("footerContact")}</h3>
            <ul className="sf-footer-contact">
              {shopInfo.phone && (
                <li>
                  <i className="fas fa-phone-alt"></i>
                  <a href={telHref(shopInfo.phone)}>{shopInfo.phone}</a>
                </li>
              )}
              {shopInfo.email && (
                <li>
                  <i className="fas fa-envelope"></i>
                  <a href={`mailto:${shopInfo.email}`}>{shopInfo.email}</a>
                </li>
              )}
              {shopInfo.address && (
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{shopInfo.address}</span>
                </li>
              )}
              {shopInfo.workingHours && (
                <li>
                  <i className="fas fa-clock"></i>
                  <span>{t("workingHours")}: {shopInfo.workingHours}</span>
                </li>
              )}
              <li>
                <i className="fas fa-globe"></i>
                <span>
                  {languageList.map((item, index) => (
                    <span key={item.id}>
                      {index > 0 && " · "}
                      <a href={`/language/${item.id}`} className={item.id == ctx.lang ? "active" : ""} hrefLang={item.id}>{item.name}</a>
                    </span>
                  ))}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="sf-footer-bottom">
          <p>© {ctx.currentYear} SFoodie Asian Store. {t("copyright")}</p>
          {legalParts.length > 0 && <p className="sf-footer-legal">{legalParts.join(" · ")}</p>}
          {/* Văn bản pháp lý (trang /legal) */}
          <p className="sf-footer-docs">
            <Link href="/legal">{t("legalInfo")}</Link>
            {" · "}
            <Link href="/legal/privacy">{t("legalPrivacy")}</Link>
            {" · "}
            <Link href="/legal/offer">{t("legalOffer")}</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
