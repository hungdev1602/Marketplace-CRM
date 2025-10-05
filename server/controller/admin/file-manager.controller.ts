import { Request, Response } from "express"

export const index = (req: Request, res: Response) => {
  res.render("admin/pages/file-manager", {
    pageTitle: "Quản lý file"
  })
}

export const uploadPost = async (req: Request, res: Response) => {
  console.log(req.files)

  res.json({
    success: true
  })
}