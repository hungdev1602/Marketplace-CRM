import { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { AccountAdmin } from "../../models/account-admin.model"
import { Role } from "../../models/role.models"
import { pathAdmin, permissionList } from "../../config/variable.config"

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

    // Danh sách quyền của tài khoản đang đăng nhập
    // - Super Admin: có tất cả quyền
    // - Tài khoản khác: gộp quyền của các nhóm quyền (đang hoạt động, chưa bị xoá) được gán cho tài khoản
    // Lấy lại ở mỗi request, nên sửa nhóm quyền là có hiệu lực ngay, không cần đăng nhập lại
    // - controller dùng: res.locals.permissions
    // - file PUG dùng: permissions
    let permissions: string[] = []
    if(existAccount.isSuperAdmin){
      permissions = permissionList.map(item => item.id)
    }
    else{
      const roleList = await Role.find({
        _id: { $in: existAccount.roles },
        deleted: false,
        status: "active"
      })
      permissions = [...new Set(roleList.flatMap(role => role.permissions))]
    }
    res.locals.permissions = permissions

    next()
  } catch (error) {
    requireLogin(req, res)
  }
}
