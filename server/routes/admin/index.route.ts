import { Express } from "express"
import { dashboardRoute } from "./dashboard.route"
import { pathAdmin } from "../../config/variable.config"
export const adminRoute = (app: Express) => {
  const path: string = pathAdmin // "admin"

  app.use(`/${path}`, dashboardRoute)
}