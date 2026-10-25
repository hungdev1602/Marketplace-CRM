import { Express } from "express"
import { dashboardRoute } from "./dashboard.route"
import { pathAdmin } from "../../config/variable.config"
import { articleRoute } from "./article.route"
import { helperRoute } from "./helper.route"
import { fileManagerRoute } from "./file-manager.route"
import { roleRoute } from "./role.route"
import { accountAdminRoute } from "./account-admin.route"
import { accountRoute } from "./account.route"
import * as authMiddleware from "../../middlewares/admin/auth.middleware"

export const adminRoute = (app: Express) => {
  const path: string = pathAdmin // "admin"

  // Đăng nhập, đăng xuất (không cần đăng nhập)
  app.use(`/${path}/account`, accountRoute)

  // Tất cả route admin khai báo bên dưới dòng này đều bắt buộc phải đăng nhập
  app.use(`/${path}`, authMiddleware.verifyToken)

  app.use(`/${path}/dashboard`, dashboardRoute)

  app.use(`/${path}/article`, articleRoute)

  app.use(`/${path}/helper`, helperRoute)

  app.use(`/${path}/file-manager`, fileManagerRoute)

  app.use(`/${path}/role`, roleRoute)

  app.use(`/${path}/account-admin`, accountAdminRoute)
}