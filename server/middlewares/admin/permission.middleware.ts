import { NextFunction, Request, Response } from "express"

// Kiểm tra tài khoản đang đăng nhập có quyền hay không (danh sách quyền ở config/variable.config.ts)
// Dùng trong route, đặt sau middleware đăng nhập (auth.middleware.ts), ví dụ:
// router.get("/create", permissionMiddleware.checkPermission("article-create"), controller.create)
export const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions: string[] = res.locals.permissions

    if(permissions.includes(permission)){
      next()
      return
    }

    // Gọi API bằng fetch (POST, PATCH, DELETE) thì trả về JSON để hiện thông báo lỗi
    if(req.method !== "GET"){
      res.status(403).json({
        code: "error",
        message: "Bạn không có quyền thực hiện thao tác này!"
      })
      return
    }

    // Trang mở trong iframe (cửa sổ chọn file) thì dùng giao diện trống, không có menu
    if(req.headers["sec-fetch-dest"] === "iframe"){
      res.status(403).render("admin/pages/error-403-iframe", {
        pageTitle: "Không có quyền truy cập"
      })
      return
    }

    res.status(403).render("admin/pages/error-403", {
      pageTitle: "Không có quyền truy cập"
    })
  }
}
