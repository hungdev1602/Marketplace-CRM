import { Router } from "express"
import * as controller from "../../controller/client/language.controller"

const router = Router()

router.get("/:lang", controller.change)

export const languageRoute = router
