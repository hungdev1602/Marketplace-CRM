import { Router } from "express"
import * as controller from "../../controller/admin/dashboard.controller"

const router = Router()

router.get("/dashboard", controller.index)

export const dashboardRoute = router