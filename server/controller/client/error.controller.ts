import { Request, Response } from "express"

// Trang 404: đường dẫn không tồn tại, sản phẩm / bài viết đã ngừng bán hoặc bị xoá
export const notFound = (req: Request, res: Response) => {
  res.status(404).render("client/pages/error-404", {
    pageTitle: `${res.locals.t("notFoundTitle")} — SFoodie`
  })
}
