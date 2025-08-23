import { Router } from "express"
import * as controller from "../../controller/client/homePage.controller"

const router = Router()

router.get("/", controller.index)

export const homePageRoute = router