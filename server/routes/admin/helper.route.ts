import { Router } from "express"
import * as controller from "../../controller/admin/helper.controller"

const router = Router()

router.post("/generate-slug", controller.generateSlug)

export const helperRoute = router