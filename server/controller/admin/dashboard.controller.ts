import { Request, Response } from "express"

export const dashboard = (req: Request, res: Response) => {
  res.render("admin/pages/dashboard", {
    pageTitle: "Admin Dashboard"
  })
}