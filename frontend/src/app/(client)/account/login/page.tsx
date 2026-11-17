import Link from "next/link"
import { AccountForm, FormField } from "@/components/client/AccountForm"
import { ClientShell } from "@/components/client/Shell"
import { AccountBenefits } from "@/components/client/common"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx, translator } from "@/lib/view-ctx"

// Trang đăng nhập: /account/login?next=/cart (đăng nhập xong quay lại trang next)
// Dữ liệu: server/controller/client/account.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/login", await searchParams)
  return clientMetadata(data)
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/account/login", await searchParams)
  const ctx = makeCtx(data)
  const { t } = translator(ctx)
  const next: string = data.next || ""

  return (
    <ClientShell data={data} ctx={ctx}>
      <section className="sf-section sf-section-first sf-auth-page">
        <div className="container">
          <div className="sf-auth">
            <div className="sf-auth-card">
              <h1>{t("login")}</h1>
              <p className="sf-auth-sub">{t("loginSub")}</p>
              <AccountForm lang={ctx.lang} action="/account/login" submitLabel={t("loginAction")}>
                <input type="hidden" name="next" value={next} />
                <FormField lang={ctx.lang} name="login" label={t("loginId")} type="text" autoComplete="username" maxLength={100} />
                <FormField lang={ctx.lang} name="password" label={t("password")} type="password" autoComplete="current-password" maxLength={200} />
                <div className="sf-auth-row">
                  <div className="form-check sf-check">
                    <input className="form-check-input" type="checkbox" id="field-remember" name="remember" defaultChecked />
                    <label className="form-check-label" htmlFor="field-remember">{t("rememberMe")}</label>
                  </div>
                  <Link href="/account/forgot-password" className="sf-auth-forgot">{t("forgotPassword")}</Link>
                </div>
              </AccountForm>
              <p className="sf-auth-switch">
                {t("noAccount")}
                <Link href={"/account/register" + (next ? `?next=${encodeURIComponent(next)}` : "")}>{t("registerAction")}</Link>
              </p>
            </div>
            <AccountBenefits lang={ctx.lang} />
          </div>
        </div>
      </section>
    </ClientShell>
  )
}
