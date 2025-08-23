import { Express } from "express"
import { dashboardRoute } from "./dashboard.route"
export const adminRoute = (app: Express) => {
  app.use("/admin", dashboardRoute)
}