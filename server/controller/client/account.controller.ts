import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { AccountClient } from "../../models/account-client.model"
import { clientLoginRememberDays } from "../../config/variable.config"
import { accountCookieName } from "../../middlewares/client/auth.middleware"
import { mergeGuestCart } from "../../helpers/cart.helper"
import { mergeGuestWishlist } from "../../helpers/wishlist.helper"
import { formatShopDateTime } from "../../helpers/coupon.helper"

// Trả lỗi dạng JSON cho JS ở trang khách hàng (main.js hiện thông báo, tô đỏ ô bị lỗi)
const sendError = (res: Response, key: string, field: string = "") => {
  res.json({
    code: "error",
    message: res.locals.t(key),
    field: field
  })
}

// Trang chuyển tới sau khi đăng nhập / đăng ký
// - Mặc định: trang chủ
// - Có ?next=...: quay lại trang khách đang xem trước đó, ví dụ bấm "Войти" ở trang giỏ hàng (?next=/cart) thì quay lại giỏ hàng
// Chỉ nhận đường dẫn trong website (bắt đầu bằng 1 dấu /), không cho chuyển sang trang web khác
// (ví dụ //trang-lua-dao.com hoặc /\trang-lua-dao.com trình duyệt hiểu là trang web khác)
const getSafeRedirect = (value: any, defaultUrl: string = "/"): string => {
  if(typeof value === "string" && /^\/(?![\/\\])[^\s\\]*$/.test(value) && !value.startsWith("/account/login") && !value.startsWith("/account/register")){
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

// Đăng nhập: POST /account/login { email, password, remember, next }
export const loginPost = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const existAccount: any = await AccountClient.findOne({
      email: email,
      deleted: false
    })

    // Không nói rõ sai email hay sai mật khẩu, để người lạ không dò được email nào đã có tài khoản
    const isPasswordValid = await bcrypt.compare(password, existAccount ? `${existAccount.password}` : fakePasswordHash)
    if(!existAccount || !isPasswordValid){
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

// Đăng xuất: POST /account/logout (form ở trang tài khoản)
// Giỏ hàng, yêu thích vẫn lưu trong tài khoản, đăng nhập lại là thấy
export const logoutPost = (req: Request, res: Response) => {
  res.clearCookie(accountCookieName)
  res.redirect("/")
}

// Trang tài khoản: /account (phải đăng nhập)
export const profile = (req: Request, res: Response) => {
  res.render("client/pages/account-profile", {
    pageTitle: `${res.locals.t("myAccount")} — SFoodie`,
    memberSince: formatShopDateTime(res.locals.clientAccount.createdAt, "DD.MM.YYYY")
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
