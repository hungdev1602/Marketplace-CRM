import Link from "@/components/client/ShopLink"
import { AccountForm, FormField } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { AccountBenefits } from "@/components/client/common"
import { LinkedText, consentLinks } from "@/components/client/LinkedText"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang đăng ký: /account/register

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/register", await searchParams)
  return clientMetadata(data)
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/register", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const next: string = data.next || ""
  const lang = ctx.lang

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first sf-auth-page">
        <div className="container">
          <div className="sf-auth">
            <div className="sf-auth-card">
              <h1>{t("register")}</h1>
              <p className="sf-auth-sub">{t("registerSub")}</p>
              <AccountForm lang={lang} action="/account/register" submitLabel={t("registerAction")}>
                <input type="hidden" name="next" value={next} />
                <FormField lang={lang} name="fullName" label={t("fullName")} type="text" autoComplete="name" maxLength={60} />
                <FormField lang={lang} name="email" label={t("email")} type="email" autoComplete="email" inputMode="email" maxLength={100} />
                <FormField lang={lang} name="phone" label={t("phone")} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} optional hint={t("phoneLoginHint")} />
                <FormField lang={lang} name="password" label={t("password")} type="password" autoComplete="new-password" maxLength={72} hint={t("passwordHint")} />
                <FormField lang={lang} name="confirmPassword" label={t("confirmPassword")} type="password" autoComplete="new-password" maxLength={72} />
                {/* Đồng ý xử lý dữ liệu cá nhân (luật 152-ФЗ của Nga), link tới văn bản /legal/consent, /legal/privacy */}
                <div className="form-check sf-check">
                  <input className="form-check-input" type="checkbox" id="field-agree" name="agree" />
                  <label className="form-check-label" htmlFor="field-agree"><LinkedText text={t("agreeText")} links={consentLinks(t)} /></label>
                </div>
              </AccountForm>
              <p className="sf-auth-switch">
                {t("haveAccount")}
                <Link href={"/account/login" + (next ? `?next=${encodeURIComponent(next)}` : "")}>{t("loginAction")}</Link>
              </p>
            </div>
            <AccountBenefits lang={lang} />
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
