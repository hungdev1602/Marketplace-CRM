import Link from "@/components/client/ShopLink"
import { AccountForm, FormField } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang quên mật khẩu: /account/forgot-password (server gửi email có link đặt lại mật khẩu)

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/forgot-password", await searchParams)
  return clientMetadata(data)
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/forgot-password", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first sf-auth-page">
        <div className="container">
          <div className="sf-auth sf-auth-single">
            <div className="sf-auth-card">
              <span className="sf-auth-icon"><i className="fas fa-key"></i></span>
              <h1>{t("forgotPasswordTitle")}</h1>
              <p className="sf-auth-sub">{t("forgotPasswordSub")}</p>
              <AccountForm lang={ctx.lang} action="/account/forgot-password" submitLabel={t("sendResetLink")}>
                <FormField lang={ctx.lang} name="login" label={t("loginId")} type="text" autoComplete="username" maxLength={100} />
              </AccountForm>
              <p className="sf-auth-switch">
                {t("rememberedPassword")}
                <Link href="/account/login">{t("loginAction")}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
