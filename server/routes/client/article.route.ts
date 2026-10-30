import { Router } from "express"
import * as controller from "../../controller/client/article.controller"

const router = Router()

router.get("/", controller.list)

router.get("/category/:slug", controller.list)

router.get("/:slug", controller.detail)

export const articleRoute = router
