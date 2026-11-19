import Link from "next/link"
import { AccountForm, FormField } from "@/components/client/AccountForm"
import { LogoutButton } from "@/components/client/HeaderParts"
import { ClientShell } from "@/components/client/Shell"
import { PageBanner } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang tài khoản của khách: /account (chưa đăng nhập thì server chuyển về trang đăng nhập)
// Dữ liệu: hàm profile ở server/controller/client/account.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account", await searchParams)
  return clientMetadata(data)
}

export default async function AccountPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const lang = ctx.lang
  const account = ctx.clientAccount
  const initials = `${account.fullName || account.email || "?"}`.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()

  return (
    <ClientShell data={data} ctx={ctx}>
      <PageBanner title={t("myAccount")} breadcrumbList={[{ name: t("myAccount") }]} lang={lang}>
        <p className="sf-page-banner-sub">{t("hello")}, {account.fullName}!</p>
      </PageBanner>
      <section className="sf-shop sf-account-page">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <aside className="sf-account-card">
                <div className="sf-account-head">
                  <span className="sf-account-avatar">{initials}</span>
                  <div>
                    <b>{account.fullName}</b>
                    <span>{account.email}</span>
                  </div>
                </div>
                <p className="sf-account-since">{t("memberSince")} {data.memberSince}</p>
                <ul className="sf-account-links">
                  <li>
                    <Link href="/cart">
                      <i className="fas fa-shopping-basket"></i>
                      <span>{t("cart")}</span>
                      {data.cartQuantity > 0 && <b>{data.cartQuantity}</b>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/wishlist">
                      <i className="far fa-heart"></i>
                      <span>{t("wishlist")}</span>
                      {data.wishlistCount > 0 && <b>{data.wishlistCount}</b>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/account/orders">
                      <i className="fas fa-receipt"></i>
                      <span>{t("myOrders")}</span>
                      {data.orderCount > 0 && <b>{data.orderCount}</b>}
                    </Link>
                  </li>
                  <li>
                    <Link href="/account/reviews">
                      <i className="far fa-star"></i>
                      <span>{t("myReviews")}</span>
                      {data.reviewWaitingCount > 0 && <b title={t("reviewWaitingTitle")}>{data.reviewWaitingCount}</b>}
                    </Link>
                  </li>
                </ul>
                <LogoutButton className="sf-btn sf-btn-outline sf-logout-btn">
                  <i className="fas fa-sign-out-alt"></i>
                  {t("logout")}
                </LogoutButton>
              </aside>
            </div>
            <div className="col-lg-8">
              <div className="sf-account-box">
                <h2>{t("profileInfo")}</h2>
                <AccountForm lang={lang} action="/account/profile" method="PATCH" submitLabel={t("save")} submitClassName="sf-btn sf-btn-dark">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <FormField lang={lang} name="fullName" label={t("fullName")} type="text" defaultValue={account.fullName} autoComplete="name" maxLength={60} />
                    </div>
                    <div className="col-md-6">
                      <FormField lang={lang} name="phone" label={t("phone")} type="tel" defaultValue={account.phone || ""} autoComplete="tel" inputMode="tel" maxLength={20} optional hint={t("phoneLoginHint")} />
                    </div>
                    <div className="col-12">
                      <FormField lang={lang} name="email" label={t("email")} type="email" id="field-email-readonly" defaultValue={account.email} readOnly hint={t("emailCannotChange")} />
                    </div>
                  </div>
                </AccountForm>
              </div>
              <div className="sf-account-box">
                <h2>{t("changePassword")}</h2>
                <AccountForm lang={lang} action="/account/password" method="PATCH" resetOnSuccess submitLabel={t("changePassword")} submitClassName="sf-btn sf-btn-dark">
                  <div className="row g-3">
                    <div className="col-12">
                      <FormField lang={lang} name="currentPassword" label={t("currentPassword")} type="password" autoComplete="current-password" maxLength={200} />
                    </div>
                    <div className="col-md-6">
                      <FormField lang={lang} name="password" label={t("newPassword")} type="password" autoComplete="new-password" maxLength={72} hint={t("passwordHint")} />
                    </div>
                    <div className="col-md-6">
                      <FormField lang={lang} name="confirmPassword" label={t("confirmPassword")} type="password" autoComplete="new-password" maxLength={72} />
                    </div>
                  </div>
                </AccountForm>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
