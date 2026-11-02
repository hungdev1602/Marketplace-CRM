import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { AccountClient } from "../../models/account-client.model"

// Tên cookie giữ token đăng nhập của tài khoản khách (khác cookie "token" của admin)
export const accountCookieName = "accountToken"

// Đọc tài khoản khách đang đăng nhập (chạy ở mọi trang khách hàng, trước layout.middleware)
// - Đã đăng nhập: res.locals.clientAccount = tài khoản (file PUG dùng: clientAccount)
// - Chưa đăng nhập / token sai / hết hạn / tài khoản bị khoá, bị xoá: res.locals.clientAccount = null
// Không bắt buộc đăng nhập: khách chưa đăng nhập vẫn xem trang, thêm giỏ hàng, yêu thích bình thường
export const loadAccount = async (req: Request, res: Response, next: NextFunction) => {
  res.locals.clientAccount = null

  const token = req.cookies?.[accountCookieName]
  if(typeof token !== "string" || !token){
    next()
    return
  }

  try {
    // Token sai hoặc hết hạn thì nhảy xuống catch
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload

    // type "client": token của tài khoản khách (không dùng nhầm token của admin)
    const existAccount = decoded.type === "client" && typeof decoded.id === "string"
      ? await AccountClient.findOne({
        _id: decoded.id,
        deleted: false,
        status: "active"
      }).select("-password")
      : null

    if(existAccount){
      res.locals.clientAccount = existAccount
    }
    else {
      res.clearCookie(accountCookieName)
    }
  } catch (error) {
    res.clearCookie(accountCookieName)
  }

  next()
}

// Trang chỉ dành cho khách đã đăng nhập (trang tài khoản)
// - Mở trang (GET): chuyển về trang đăng nhập, đăng nhập xong quay lại trang đang mở
// - Gọi bằng fetch (PATCH, POST): trả về JSON để main.js hiện thông báo
export const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  if(res.locals.clientAccount){
    next()
    return
  }

  if(req.method === "GET"){
    res.redirect(`/account/login?next=${encodeURIComponent(req.originalUrl)}`)
    return
  }

  res.json({
    code: "error",
    message: res.locals.t("loginRequired"),
    redirect: "/account/login"
  })
}
