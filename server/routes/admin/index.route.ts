import { Express } from "express"
import { dashboardRoute } from "./dashboard.route"
import { pathAdmin } from "../../config/variable.config"
import { articleRoute } from "./article.route"
import { helperRoute } from "./helper.route"
import { fileManagerRoute } from "./file-manager.route"
export const adminRoute = (app: Express) => {
  const path: string = pathAdmin // "admin"

  app.use(`/${path}/dashboard`, dashboardRoute)

  app.use(`/${path}/article`, articleRoute)

  app.use(`/${path}/helper`, helperRoute)

  app.use(`/${path}/file-manager`, fileManagerRoute)
}