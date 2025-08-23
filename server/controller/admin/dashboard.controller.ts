import { Request, Response } from "express"

export const index = (req: Request, res: Response) => {
  res.render("admin/pages/dashboard", {
    pageTitle: "Admin Dashboard"
  })
}