import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { AccountAdmin } from "../../models/account-admin.model"
import { pathAdmin } from "../../config/variable.config"

// Chưa đăng nhập / hết phiên đăng nhập
const requireLogin = (req: Request, res: Response) => {
  res.clearCookie("token")

  // Mở trang (GET) thì chuyển về trang đăng nhập
  if(req.method === "GET"){
    res.redirect(`/${pathAdmin}/account/login`)
    return
  }

  // Gọi API bằng fetch (POST, PATCH, DELETE) thì trả về JSON để hiện thông báo lỗi
  res.json({
    code: "error",
    message: "Phiên đăng nhập đã hết hạn, vui lòng tải lại trang và đăng nhập lại!"
  })
}

// Kiểm tra đăng nhập, dùng cho tất cả trang admin (trừ trang đăng nhập)
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token

    if(!token){
      requireLogin(req, res)
      return
    }

    // Giải mã token, nếu token sai hoặc hết hạn thì nhảy xuống catch
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload

    // Tài khoản phải còn tồn tại và đang hoạt động
    // (bị xoá hoặc bị tạm dừng thì đăng xuất luôn, không chờ token hết hạn)
    const existAccount = await AccountAdmin.findOne({
      _id: decoded.id,
      deleted: false,
      status: "active"
    }).select("-password")

    if(!existAccount){
      requireLogin(req, res)
      return
    }

    // Lưu thông tin tài khoản đang đăng nhập
    // - controller dùng: res.locals.account
    // - file PUG dùng: account
    res.locals.account = existAccount

    next()
  } catch (error) {
    requireLogin(req, res)
  }
}
