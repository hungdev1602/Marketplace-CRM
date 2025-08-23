import { Express } from "express"
import { homePageRoute } from "./homePage.route"

export const clientRoute = (app: Express) => {
  app.use("/", homePageRoute)
}