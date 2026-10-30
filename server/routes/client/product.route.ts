import { Router } from "express"
import * as controller from "../../controller/client/product.controller"

const router = Router()

router.get("/products", controller.list)

router.get("/categories", controller.categories)

router.get("/category/:slug", controller.list)

router.get("/product/:slug", controller.detail)

export const productRoute = router
