import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { AccountClient } from "../../models/account-client.model"
import { PasswordReset } from "../../models/password-reset.model"
import { clientLoginRememberDays, clientResetPasswordExpireMinutes, clientResetPasswordResendSeconds } from "../../config/variable.config"
import { accountCookieName } from "../../middlewares/client/auth.middleware"
import { mergeGuestCart } from "../../helpers/cart.helper"
import { mergeGuestWishlist } from "../../helpers/wishlist.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
import { createPkcePair, getGoogleAuthUrl, getGoogleProfile, isGoogleLoginEnabled } from "../../helpers/google-auth.helper"
import { sendMail } from "../../helpers/mail.helper"
import { getSiteUrl } from "../../helpers/site-url.helper"

// Trả lỗi dạng JSON cho JS ở trang khách hàng (main.js hiện thông báo, tô đỏ ô bị lỗi)
const sendError = (res: Response, key: string, field: string = "") => {
  res.json({
    code: "error",
    message: res.locals.t(key),
    field: field
  })
}

// Các trang đăng nhập / đăng ký / quên mật khẩu: không quay lại các trang này sau khi đăng nhập
const authPagePaths = [
  "/account/login",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
  "/account/google"
]

// Trang chuyển tới sau khi đăng nhập / đăng ký
// - Mặc định: trang chủ
// - Có ?next=...: quay lại trang khách đang xem trước đó, ví dụ bấm "Войти" ở trang giỏ hàng (?next=/cart) thì quay lại giỏ hàng
// Chỉ nhận đường dẫn trong website (bắt đầu bằng 1 dấu /), không cho chuyển sang trang web khác
// (ví dụ //trang-lua-dao.com hoặc /\trang-lua-dao.com trình duyệt hiểu là trang web khác)
const getSafeRedirect = (value: any, defaultUrl: string = "/"): string => {
  if(typeof value === "string" && /^\/(?![\/\\])[^\s\\]*$/.test(value) && !authPagePaths.some(path => value.startsWith(path))){
    return value
  }
  return defaultUrl
}

// Số điện thoại chỉ giữ chữ số và dấu + ở đầu, ví dụ "+7 (999) 123-45-67" => "+79991234567"
const normalizePhone = (phone: string): string => {
  const digits = (phone || "").replace(/[^\d]/g, "")
  if(!digits) return ""
  return (phone.trim().startsWith("+") ? "+" : "") + digits
}

// Mã hoá mật khẩu "giả" để so sánh khi email không tồn tại: đăng nhập sai email hay sai mật khẩu đều mất thời gian như nhau,
// người lạ không đo thời gian phản hồi để dò được email nào đã có tài khoản
const fakePasswordHash = bcrypt.hashSync("fake-password-for-timing", 10)

// Đăng nhập: tạo JWT, lưu vào cookie, gộp giỏ hàng / yêu thích lúc chưa đăng nhập vào tài khoản
// - remember: giữ đăng nhập clientLoginRememberDays ngày
// - không remember: cookie phiên (tắt trình duyệt là đăng xuất), token hết hạn sau 1 ngày
const loginAccount = async (req: Request, res: Response, account: any, remember: boolean) => {
  const token = jwt.sign(
    {
      id: account.id,
      type: "client"
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: remember ? `${clientLoginRememberDays}d` : "1d"
    }
  )

  res.cookie(accountCookieName, token, {
    maxAge: remember ? clientLoginRememberDays * 24 * 60 * 60 * 1000 : undefined,
    httpOnly: true,
    sameSite: "lax"
  })

  await AccountClient.updateOne({ _id: account.id }, { lastLoginAt: new Date() })

  await mergeGuestCart(req, res, account.id)
  await mergeGuestWishlist(req, res, account.id)
}

// Lỗi đăng nhập bằng Google: Google chuyển khách về, server chuyển tiếp sang trang đăng nhập kèm ?error=...
// - id: giá trị ?error=... trên link
// - key: lời báo lỗi trong locales (ru.ts, vi.ts)
const loginErrorList = [
  { id: "google-failed", key: "googleLoginFailed" },
  { id: "google-cancelled", key: "googleLoginCancelled" },
  { id: "google-email", key: "googleEmailNotVerified" },
  { id: "account-locked", key: "accountLocked" }
]

// Link trang đăng nhập, giữ lại trang "next" (quay lại sau khi đăng nhập) và lỗi cần báo (nếu có)
const getLoginUrl = (next: string, error: string = ""): string => {
  const params = new URLSearchParams()
  if(next) params.set("next", next)
  if(error) params.set("error", error)
  const query = params.toString()
  return `/account/login${query ? `?${query}` : ""}`
}

// Trang đăng nhập: /account/login
export const login = (req: Request, res: Response) => {
  // Đã đăng nhập thì không cần đăng nhập lại: về trang chủ (hoặc trang ?next=...)
  if(res.locals.clientAccount){
    res.redirect(getSafeRedirect(req.query.next))
    return
  }

  const loginError = loginErrorList.find(item => item.id === req.query.error)

  res.render("client/pages/account-login", {
    pageTitle: `${res.locals.t("login")} — SFoodie`,
    next: getSafeRedirect(req.query.next, ""),
    googleEnabled: isGoogleLoginEnabled(),
    errorMessage: loginError ? res.locals.t(loginError.key) : ""
  })
}

// Đăng nhập: POST /account/login { email, password, remember, next }
export const loginPost = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const existAccount: any = await AccountClient.findOne({
      email: email,
      deleted: false
    })

    // Không nói rõ sai email hay sai mật khẩu, để người lạ không dò được email nào đã có tài khoản
    // Tài khoản tạo bằng Google chưa đặt mật khẩu cũng báo như vậy (khách đăng nhập bằng Google hoặc dùng "Забыли пароль?")
    const isPasswordValid = await bcrypt.compare(password, existAccount?.password ? `${existAccount.password}` : fakePasswordHash)
    if(!existAccount || !existAccount.password || !isPasswordValid){
      sendError(res, "loginFailed", "password")
      return
    }

    if(existAccount.status !== "active"){
      sendError(res, "accountLocked")
      return
    }

    await loginAccount(req, res, existAccount, req.body.remember === "on")

    res.json({
      code: "success",
      message: res.locals.t("loginSuccess"),
      redirect: getSafeRedirect(req.body.next)
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Trang đăng ký: /account/register
export const register = (req: Request, res: Response) => {
  if(res.locals.clientAccount){
    res.redirect(getSafeRedirect(req.query.next))
    return
  }

  res.render("client/pages/account-register", {
    pageTitle: `${res.locals.t("register")} — SFoodie`,
    next: getSafeRedirect(req.query.next, ""),
    googleEnabled: isGoogleLoginEnabled()
  })
}

// Đăng ký: POST /account/register { fullName, email, phone, password, confirmPassword, agree, next }
// Đăng ký xong thì đăng nhập luôn (giữ đăng nhập), gộp giỏ hàng / yêu thích lúc chưa đăng nhập vào tài khoản mới
export const registerPost = async (req: Request, res: Response) => {
  try {
    const existEmail = await AccountClient.findOne({
      email: req.body.email,
      deleted: false
    })

    if(existEmail){
      sendError(res, "emailExists", "email")
      return
    }

    const newAccount = await AccountClient.create({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: normalizePhone(req.body.phone),
      password: await bcrypt.hash(req.body.password, 10),
      status: "active",
      agreedAt: new Date()
    })

    await loginAccount(req, res, newAccount, true)

    res.json({
      code: "success",
      message: res.locals.t("registerSuccess"),
      redirect: getSafeRedirect(req.body.next)
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// ===== Đăng nhập bằng Google =====
// Cookie tạm giữ mã state, codeVerifier và trang "next" trong lúc khách ở trang Google (10 phút)
// Giá trị là JWT ký bằng JWT_SECRET: khách không sửa được; chỉ gửi kèm các đường dẫn /account/google...
const googleCookieName = "googleLogin"
const googleCookiePath = "/account/google"

// Bấm nút "Войти через Google": GET /account/google?next=...
export const googleLogin = (req: Request, res: Response) => {
  const next = getSafeRedirect(req.query.next, "")

  if(res.locals.clientAccount){
    res.redirect(getSafeRedirect(next))
    return
  }

  if(!isGoogleLoginEnabled()){
    res.redirect(getLoginUrl(next, "google-failed"))
    return
  }

  const state = crypto.randomBytes(24).toString("hex")
  const { codeVerifier, codeChallenge } = createPkcePair()

  const cookieValue = jwt.sign(
    {
      type: "google-login",
      state: state,
      codeVerifier: codeVerifier,
      next: next
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "10m"
    }
  )

  res.cookie(googleCookieName, cookieValue, {
    maxAge: 10 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax", // Google chuyển khách về bằng link thường (GET) nên cookie lax vẫn được gửi kèm
    path: googleCookiePath
  })

  res.redirect(getGoogleAuthUrl({
    state: state,
    codeChallenge: codeChallenge,
    lang: res.locals.lang
  }))
}

// Google chuyển khách về: GET /account/google/callback?code=...&state=... (hoặc ?error=... khi khách bấm huỷ)
// - Đã có tài khoản liên kết Google này: đăng nhập
// - Chưa liên kết nhưng có tài khoản cùng email: liên kết Google vào tài khoản đó rồi đăng nhập
//   (Google đã xác nhận email thuộc về khách nên an toàn)
// - Chưa có tài khoản: tạo tài khoản mới (chưa có mật khẩu, khách đặt sau ở trang tài khoản nếu muốn)
export const googleCallback = async (req: Request, res: Response) => {
  // Đọc xong thì xoá cookie ngay: mỗi lần bấm nút chỉ dùng được 1 lần
  const cookieValue = req.cookies?.[googleCookieName]
  res.clearCookie(googleCookieName, { path: googleCookiePath })

  let saved: any = null
  try {
    saved = typeof cookieValue === "string" ? jwt.verify(cookieValue, process.env.JWT_SECRET as string) : null
  } catch (error) {
    saved = null
  }

  const next = getSafeRedirect(saved?.next, "")

  // Khách bấm "Huỷ" / không cho phép ở trang Google
  if(req.query.error){
    res.redirect(getLoginUrl(next, "google-cancelled"))
    return
  }

  // Cookie hết hạn (khách để trang Google quá 10 phút), mở link callback từ chỗ khác, mã state không khớp
  const { code, state } = req.query
  if(!saved || saved.type !== "google-login" || typeof state !== "string" || state !== saved.state || typeof code !== "string" || !code){
    res.redirect(getLoginUrl(next, "google-failed"))
    return
  }

  try {
    const profile = await getGoogleProfile(code, saved.codeVerifier)

    if(!profile.emailVerified){
      res.redirect(getLoginUrl(next, "google-email"))
      return
    }

    let account: any = await AccountClient.findOne({
      googleId: profile.googleId,
      deleted: false
    })

    if(!account){
      account = await AccountClient.findOne({
        email: profile.email,
        deleted: false
      })

      if(account && account.status === "active"){
        await AccountClient.updateOne({ _id: account.id }, { googleId: profile.googleId })
      }
    }

    if(!account){
      // Họ tên lấy theo Google, không có thì lấy phần trước @ của email (2 - 60 ký tự như form đăng ký)
      let fullName = (profile.fullName || profile.email.split("@")[0]).slice(0, 60).trim()
      if(fullName.length < 2) fullName = profile.email.slice(0, 60)

      // agreedAt: dưới nút Google có dòng "Нажимая «Войти через Google», вы соглашаетесь на обработку персональных данных"
      account = await AccountClient.create({
        fullName: fullName,
        email: profile.email,
        phone: "",
        googleId: profile.googleId,
        status: "active",
        agreedAt: new Date()
      })
    }

    if(account.status !== "active"){
      res.redirect(getLoginUrl(next, "account-locked"))
      return
    }

    await loginAccount(req, res, account, true)

    res.redirect(getSafeRedirect(next))
  } catch (error) {
    // Lỗi kết nối tới Google, sai GOOGLE_CLIENT_SECRET, sai link quay về,...: xem lỗi chi tiết ở terminal
    console.log("Đăng nhập Google thất bại:", (error as any)?.response?.data || error)
    res.redirect(getLoginUrl(next, "google-failed"))
  }
}

// ===== Quên mật khẩu =====
// 1. Khách nhập email ở /account/forgot-password => gửi email có link /account/reset-password?token=...
// 2. Khách mở link, nhập mật khẩu mới => đổi mật khẩu, đăng nhập luôn
// Link chỉ dùng được 1 lần, hết hạn sau clientResetPasswordExpireMinutes phút

// Mã trong link chỉ lưu bản băm sha256 trong database
const hashResetToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// Tìm link đặt lại mật khẩu còn dùng được và tài khoản của link đó, không có thì trả về null
const findValidPasswordReset = async (token: any) => {
  if(typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null

  const passwordReset = await PasswordReset.findOne({
    tokenHash: hashResetToken(token),
    expireAt: { $gt: new Date() }
  })
  if(!passwordReset) return null

  const account: any = await AccountClient.findOne({
    _id: passwordReset.accountId,
    deleted: false,
    status: "active"
  })
  if(!account) return null

  return { passwordReset, account }
}

// Tạo HTML từ file PUG (không gửi cho trình duyệt), dùng cho nội dung email
const renderToString = (res: Response, view: string, data: object): Promise<string> => {
  return new Promise((resolve, reject) => {
    res.render(view, data, (error: Error | null, html: string) => {
      if(error) reject(error)
      else resolve(html)
    })
  })
}

// Trang quên mật khẩu: /account/forgot-password
export const forgotPassword = (req: Request, res: Response) => {
  // Đã đăng nhập thì đổi mật khẩu ở trang tài khoản
  if(res.locals.clientAccount){
    res.redirect("/account")
    return
  }

  res.render("client/pages/account-forgot-password", {
    pageTitle: `${res.locals.t("forgotPasswordTitle")} — SFoodie`
  })
}

// Gửi link đặt lại mật khẩu: POST /account/forgot-password { email }
// Luôn trả lời giống nhau dù email có tài khoản hay không, để người lạ không dò được email nào đã đăng ký
// Email được gửi ngầm (không chờ gửi xong mới trả lời) vì lý do trên; gửi lỗi thì xem lỗi ở terminal
export const forgotPasswordPost = async (req: Request, res: Response) => {
  try {
    const account: any = await AccountClient.findOne({
      email: req.body.email,
      deleted: false,
      status: "active"
    })

    if(account){
      // Chống gửi liên tục: link trước đó gửi chưa quá clientResetPasswordResendSeconds giây thì không gửi nữa
      const lastReset: any = await PasswordReset.findOne({ accountId: account.id }).sort({ createdAt: -1 })
      const canSend = !lastReset || Date.now() - new Date(lastReset.createdAt).getTime() >= clientResetPasswordResendSeconds * 1000

      if(canSend){
        const token = crypto.randomBytes(32).toString("hex")

        // Mỗi tài khoản chỉ có 1 link còn dùng được
        await PasswordReset.deleteMany({ accountId: account.id })
        await PasswordReset.create({
          accountId: account.id,
          tokenHash: hashResetToken(token),
          expireAt: new Date(Date.now() + clientResetPasswordExpireMinutes * 60 * 1000)
        })

        const resetLink = `${getSiteUrl()}/account/reset-password?token=${token}`
        const t = res.locals.t
        const expireText = `${t("resetEmailExpire")} ${res.locals.tCount(clientResetPasswordExpireMinutes, "minuteCount")}.`

        const html = await renderToString(res, "client/emails/reset-password", {
          fullName: account.fullName,
          resetLink: resetLink,
          expireText: expireText
        })

        const text = [
          `${t("hello")}, ${account.fullName}!`,
          "",
          t("resetEmailText"),
          resetLink,
          "",
          expireText,
          t("resetEmailIgnore"),
          "",
          "SFoodie"
        ].join("\n")

        sendMail({
          to: account.email,
          subject: t("resetEmailSubject"),
          html: html,
          text: text
        }).catch((error) => {
          console.log("Gửi email quên mật khẩu thất bại:", error)
        })
      }
    }

    res.json({
      code: "success",
      message: res.locals.t("resetEmailSent")
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Trang đặt mật khẩu mới (mở từ link trong email): /account/reset-password?token=...
export const resetPassword = async (req: Request, res: Response) => {
  // Link có mã bí mật: không gửi địa chỉ trang này cho trang web khác (header Referer)
  res.set("Referrer-Policy", "no-referrer")

  try {
    const found = await findValidPasswordReset(req.query.token)

    res.render("client/pages/account-reset-password", {
      pageTitle: `${res.locals.t("resetPasswordTitle")} — SFoodie`,
      isValid: !!found,
      token: found ? req.query.token : "",
      email: found ? found.account.email : ""
    })
  } catch (error) {
    console.log(error)
    res.render("client/pages/account-reset-password", {
      pageTitle: `${res.locals.t("resetPasswordTitle")} — SFoodie`,
      isValid: false
    })
  }
}

// Đặt mật khẩu mới: POST /account/reset-password { token, password, confirmPassword }
// Đặt xong thì xoá link (không dùng lại được) và đăng nhập luôn
export const resetPasswordPost = async (req: Request, res: Response) => {
  try {
    const found = await findValidPasswordReset(req.body.token)
    if(!found){
      sendError(res, "resetLinkInvalid")
      return
    }

    await AccountClient.updateOne({
      _id: found.account.id
    }, {
      password: await bcrypt.hash(req.body.password, 10)
    })

    await PasswordReset.deleteMany({ accountId: found.account.id })

    await loginAccount(req, res, found.account, true)

    res.json({
      code: "success",
      message: res.locals.t("passwordResetSuccess"),
      redirect: "/"
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Đăng xuất: POST /account/logout (form ở trang tài khoản)
// Giỏ hàng, yêu thích vẫn lưu trong tài khoản, đăng nhập lại là thấy
export const logoutPost = (req: Request, res: Response) => {
  res.clearCookie(accountCookieName)
  res.redirect("/")
}

// Trang tài khoản: /account (phải đăng nhập)
// hasPassword: tài khoản tạo bằng Google chưa có mật khẩu => hiện form "Установить пароль" (không cần mật khẩu hiện tại)
export const profile = async (req: Request, res: Response) => {
  const account: any = await AccountClient.findOne({ _id: res.locals.clientAccount.id }).select("password")

  res.render("client/pages/account-profile", {
    pageTitle: `${res.locals.t("myAccount")} — SFoodie`,
    memberSince: formatShopDateTime(res.locals.clientAccount.createdAt, "DD.MM.YYYY"),
    hasPassword: !!account?.password
  })
}

// Sửa thông tin: PATCH /account/profile { fullName, phone }
// Email là tên đăng nhập nên không cho sửa ở đây
export const profilePatch = async (req: Request, res: Response) => {
  try {
    await AccountClient.updateOne({
      _id: res.locals.clientAccount.id
    }, {
      fullName: req.body.fullName,
      phone: normalizePhone(req.body.phone)
    })

    res.json({
      code: "success",
      message: res.locals.t("profileSaved")
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Đổi mật khẩu: PATCH /account/password { currentPassword, password, confirmPassword }
// Tài khoản tạo bằng Google chưa có mật khẩu: đặt mật khẩu luôn, không cần currentPassword,
// đặt xong thì tải lại trang tài khoản (hiện form đổi mật khẩu bình thường)
export const passwordPatch = async (req: Request, res: Response) => {
  try {
    const account: any = await AccountClient.findOne({ _id: res.locals.clientAccount.id })
    const hasPassword = !!account?.password

    if(hasPassword){
      if(!req.body.currentPassword){
        sendError(res, "currentPasswordRequired", "currentPassword")
        return
      }

      const isPasswordValid = await bcrypt.compare(req.body.currentPassword, `${account.password}`)
      if(!isPasswordValid){
        sendError(res, "currentPasswordWrong", "currentPassword")
        return
      }
    }

    await AccountClient.updateOne({
      _id: account.id
    }, {
      password: await bcrypt.hash(req.body.password, 10)
    })

    res.json({
      code: "success",
      message: res.locals.t(hasPassword ? "passwordChanged" : "passwordSet"),
      redirect: hasPassword ? undefined : "/account"
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}
