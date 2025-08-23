import { Express } from "express"
import { dashboardRoute } from "./dashboard.route"
import { pathAdmin } from "../../config/variable.config"
import { articleRoute } from "./article.route"
export const adminRoute = (app: Express) => {
  const path: string = pathAdmin // "admin"

  app.use(`/${path}/dashboard`, dashboardRoute)

  app.use(`/${path}/article`, articleRoute)
}