import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { AccountClient } from "../../models/account-client.model"
import { PasswordReset } from "../../models/password-reset.model"
import { Order } from "../../models/order.model"
import { clientLoginRememberDays, clientResetPasswordExpireMinutes, clientResetPasswordResendSeconds } from "../../config/variable.config"
import { accountCookieName } from "../../middlewares/client/auth.middleware"
import { mergeGuestCart } from "../../helpers/cart.helper"
import { mergeGuestWishlist } from "../../helpers/wishlist.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"
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
  "/account/reset-password"
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

// Chuẩn hoá số điện thoại để lưu và tìm kiếm: chỉ giữ chữ số và dấu + ở đầu
// Số Nga viết kiểu nào cũng đưa về +7..., để khách đăng nhập bằng cách viết nào cũng được:
// "+7 (999) 123-45-67", "8 999 123-45-67", "79991234567", "9991234567" => "+79991234567"
// Số nước khác phải có mã nước, ví dụ số Việt Nam: +84 912 345 678 => "+84912345678"
export const normalizePhone = (phone: string): string => {
  const digits = (phone || "").replace(/[^\d]/g, "")
  if(!digits) return ""

  if(phone.trim().startsWith("+")) return "+" + digits

  if(digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) return "+7" + digits.slice(1)
  if(digits.length === 10 && digits[0] === "9") return "+7" + digits
  return digits
}

// Các cách số điện thoại có thể đang lưu trong database (tài khoản đăng ký trước khi có chuẩn hoá +7 ở trên)
// Ví dụ "+79991234567" => ["+79991234567", "89991234567", "79991234567", "9991234567"]
const getPhoneVariants = (phone: string): string[] => {
  if(/^\+7\d{10}$/.test(phone)){
    const number = phone.slice(2)
    return [phone, "8" + number, "7" + number, number]
  }
  return [phone]
}

// Ô "Email или телефон" ở trang đăng nhập, quên mật khẩu: có @ là email, không có thì là số điện thoại
// Trả về điều kiện tìm tài khoản, null nếu không phải email cũng không phải số điện thoại (ít hơn 10 chữ số)
const getLoginFind = (login: string): any => {
  if(login.includes("@")){
    return { email: login.toLowerCase() }
  }

  const phone = normalizePhone(login)
  if(phone.replace("+", "").length < 10) return null

  return { phone: { $in: getPhoneVariants(phone) } }
}

// Số điện thoại đã có tài khoản khác dùng chưa (mỗi số chỉ dùng cho 1 tài khoản, vì dùng để đăng nhập)
// - exceptAccountId: bỏ qua tài khoản đang sửa thông tin
const isPhoneTaken = async (phone: string, exceptAccountId: string = ""): Promise<boolean> => {
  if(!phone) return false

  const find: any = {
    phone: { $in: getPhoneVariants(phone) },
    deleted: false
  }
  if(exceptAccountId) find._id = { $ne: exceptAccountId }

  return !!(await AccountClient.exists(find))
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

// Trang đăng nhập: /account/login
export const login = (req: Request, res: Response) => {
  // Đã đăng nhập thì không cần đăng nhập lại: về trang chủ (hoặc trang ?next=...)
  if(res.locals.clientAccount){
    res.redirect(getSafeRedirect(req.query.next))
    return
  }

  res.render("client/pages/account-login", {
    pageTitle: `${res.locals.t("login")} — SFoodie`,
    next: getSafeRedirect(req.query.next, "")
  })
}

// Đăng nhập: POST /account/login { login, password, remember, next }
// login: email hoặc số điện thoại (số điện thoại đã nhập lúc đăng ký / ở trang tài khoản)
export const loginPost = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body

    const find = getLoginFind(login)
    const accountList: any[] = find
      ? await AccountClient.find({ ...find, deleted: false })
      : []

    // Tìm tài khoản đúng mật khẩu (tài khoản cũ có thể trùng số điện thoại, nên kiểm tra từng tài khoản)
    // Không có tài khoản nào thì vẫn so sánh với mật khẩu "giả" cho mất thời gian như nhau
    let existAccount: any = null
    for(const account of accountList){
      if(await bcrypt.compare(password, `${account.password}`)){
        existAccount = account
        break
      }
    }
    if(accountList.length === 0){
      await bcrypt.compare(password, fakePasswordHash)
    }

    // Không nói rõ sai email / số điện thoại hay sai mật khẩu, để người lạ không dò được tài khoản nào đã đăng ký
    if(!existAccount){
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
    next: getSafeRedirect(req.query.next, "")
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

    // Số điện thoại dùng để đăng nhập nên không cho 2 tài khoản dùng chung 1 số
    const phone = normalizePhone(req.body.phone)
    if(await isPhoneTaken(phone)){
      sendError(res, "phoneExists", "phone")
      return
    }

    const newAccount = await AccountClient.create({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: phone,
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

// ===== Quên mật khẩu =====
// 1. Khách nhập email hoặc số điện thoại ở /account/forgot-password => gửi link /account/reset-password?token=...
//    vào email của tài khoản
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

// Gửi email có link đặt lại mật khẩu cho 1 tài khoản
// Chống gửi liên tục: link trước đó gửi chưa quá clientResetPasswordResendSeconds giây thì không gửi nữa
const sendResetPasswordEmail = async (res: Response, account: any) => {
  const lastReset: any = await PasswordReset.findOne({ accountId: account.id }).sort({ createdAt: -1 })
  if(lastReset && Date.now() - new Date(lastReset.createdAt).getTime() < clientResetPasswordResendSeconds * 1000) return

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

  // Gửi ngầm (không chờ gửi xong mới trả lời khách), gửi lỗi thì xem lỗi ở terminal
  sendMail({
    to: account.email,
    subject: t("resetEmailSubject"),
    html: html,
    text: text
  }).catch((error) => {
    console.log("Gửi email quên mật khẩu thất bại:", error)
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

// Gửi link đặt lại mật khẩu: POST /account/forgot-password { login }
// login: email hoặc số điện thoại của tài khoản, link luôn gửi vào email của tài khoản
// Luôn trả lời giống nhau dù có tài khoản hay không, để người lạ không dò được email / số điện thoại nào đã đăng ký
export const forgotPasswordPost = async (req: Request, res: Response) => {
  try {
    const find = getLoginFind(req.body.login)
    const accountList: any[] = find
      ? await AccountClient.find({ ...find, deleted: false, status: "active" })
      : []

    for(const account of accountList){
      await sendResetPasswordEmail(res, account)
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
export const profile = async (req: Request, res: Response) => {
  res.render("client/pages/account-profile", {
    pageTitle: `${res.locals.t("myAccount")} — SFoodie`,
    memberSince: formatShopDateTime(res.locals.clientAccount.createdAt, "DD.MM.YYYY"),
    orderCount: await Order.countDocuments({ userId: res.locals.clientAccount.id })
  })
}

// Sửa thông tin: PATCH /account/profile { fullName, phone }
// Email là tên đăng nhập nên không cho sửa ở đây
export const profilePatch = async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body.phone)
    if(await isPhoneTaken(phone, res.locals.clientAccount.id)){
      sendError(res, "phoneTaken", "phone")
      return
    }

    await AccountClient.updateOne({
      _id: res.locals.clientAccount.id
    }, {
      fullName: req.body.fullName,
      phone: phone
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
export const passwordPatch = async (req: Request, res: Response) => {
  try {
    const account: any = await AccountClient.findOne({ _id: res.locals.clientAccount.id })

    const isPasswordValid = account && await bcrypt.compare(req.body.currentPassword, `${account.password}`)
    if(!isPasswordValid){
      sendError(res, "currentPasswordWrong", "currentPassword")
      return
    }

    await AccountClient.updateOne({
      _id: account.id
    }, {
      password: await bcrypt.hash(req.body.password, 10)
    })

    res.json({
      code: "success",
      message: res.locals.t("passwordChanged")
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}
