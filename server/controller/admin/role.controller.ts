import { Request, Response } from "express"
import { permissionList } from "../../config/variable.config"
import slugify from "slugify"
import { Role } from "../../models/role.models"

export const create = async (req: Request, res: Response) => {
  res.render("admin/pages/role-create", {
    pageTitle: "Tạo nhóm quyền",
    permissionList: permissionList
  })
}

export const createPost = async (req: Request, res: Response) => {
  try {
    req.body.permissions = JSON.parse(req.body.permissions)

    req.body.search = slugify(`${req.body.name}`, {
      replacement: " ",
      lower: true
    })

    const newRecord = new Role(req.body)
    await newRecord.save()

    res.json({
      code: "success",
      message: "Tạo nhóm quyền thành công"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: "error",
      message: "Dữ liệu không hợp lệ"
    })
  }

  
}