import { NextFunction, Request, Response } from "express"

// Trả về thông báo "Không có quyền truy cập"
const denyAccess = (req: Request, res: Response) => {
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

// Kiểm tra tài khoản đang đăng nhập có quyền hay không (danh sách quyền ở config/variable.config.ts)
// Dùng trong route, đặt sau middleware đăng nhập (auth.middleware.ts), ví dụ:
// router.get("/create", permissionMiddleware.checkPermission("article-create"), controller.create)
// Truyền vào mảng thì chỉ cần có 1 trong các quyền, ví dụ:
// router.get("/product-search", permissionMiddleware.checkPermission(["coupon-create", "coupon-edit"]), controller.productSearch)
export const checkPermission = (permission: string | string[]) => {
  const permissionRequired = Array.isArray(permission) ? permission : [permission]

  return (req: Request, res: Response, next: NextFunction) => {
    const permissions: string[] = res.locals.permissions

    if(permissionRequired.some(item => permissions.includes(item))){
      next()
      return
    }

    denyAccess(req, res)
  }
}

// Chỉ cho tài khoản Super Admin truy cập (không cấp được qua nhóm quyền), ví dụ:
// router.use(permissionMiddleware.checkSuperAdmin)
export const checkSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if(res.locals.account.isSuperAdmin){
    next()
    return
  }

  denyAccess(req, res)
}
