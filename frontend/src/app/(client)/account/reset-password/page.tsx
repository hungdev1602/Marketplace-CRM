import Link from "@/components/client/ShopLink"
import { AccountForm, FormField } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang đặt lại mật khẩu: /account/reset-password?token=... (link trong email quên mật khẩu)

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/reset-password", await searchParams)
  return clientMetadata(data)
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/reset-password", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const lang = ctx.lang

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first sf-auth-page">
        <div className="container">
          <div className="sf-auth sf-auth-single">
            <div className="sf-auth-card">
              {data.isValid ? (
                <>
                  <span className="sf-auth-icon"><i className="fas fa-key"></i></span>
                  <h1>{t("resetPasswordTitle")}</h1>
                  <p className="sf-auth-sub">{t("resetPasswordSub")} <b>{data.email}</b></p>
                  <AccountForm lang={lang} action="/account/reset-password" submitLabel={t("saveNewPassword")}>
                    <input type="hidden" name="token" value={data.token || ""} />
                    {/* Ô email ẩn để trình quản lý mật khẩu của trình duyệt lưu mật khẩu mới đúng tài khoản */}
                    <input type="email" defaultValue={data.email} autoComplete="username" hidden readOnly />
                    <FormField lang={lang} name="password" label={t("newPassword")} type="password" autoComplete="new-password" maxLength={72} hint={t("passwordHint")} />
                    <FormField lang={lang} name="confirmPassword" label={t("confirmPassword")} type="password" autoComplete="new-password" maxLength={72} />
                  </AccountForm>
                </>
              ) : (
                <>
                  <span className="sf-auth-icon is-warning"><i className="fas fa-unlink"></i></span>
                  <h1>{t("resetLinkInvalidTitle")}</h1>
                  <p className="sf-auth-sub">{t("resetLinkInvalidText")}</p>
                  <Link href="/account/forgot-password" className="sf-btn sf-btn-primary sf-auth-submit">{t("requestNewLink")}</Link>
                  <p className="sf-auth-switch">
                    {t("rememberedPassword")}
                    <Link href="/account/login">{t("loginAction")}</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
