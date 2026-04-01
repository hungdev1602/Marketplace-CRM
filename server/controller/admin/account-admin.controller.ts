import { Request, Response } from "express"
import { Role } from "../../models/role.models"
import slugify from "slugify"
import bcrypt from "bcryptjs"
import { AccountAdmin } from "../../models/account-admin.model"
export const create = async (req: Request, res: Response) => {
  const roleList = await Role.find({
    deleted: false,
    status: "active"
  })

  res.render("admin/pages/account-admin-create", {
    pageTitle: "Tạo tài khoản admin",
    roleList: roleList
  })
}

export const createPost = async (req: Request, res: Response) => {
  try {
    const existAccount = await AccountAdmin.findOne({
      email: req.body.email
    })

    if(existAccount){
      res.json({
        code: "error",
        message: "Email đã tồn tại"
      })
      return
    }

    req.body.roles = JSON.parse(req.body.roles)

    req.body.search = slugify(`${req.body.fullName} ${req.body.email}`, {
      replacement: " ",
      lower: true
    })

    // Mã hoá mật khẩu
    req.body.password = await bcrypt.hash(req.body.password, 10)
    
    const newRecord = new AccountAdmin(req.body)
    await newRecord.save()

    res.json({
      code: "success",
      message: "Tạo tài khoản admin thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Dữ liệu không hợp lệ"
    })
  }
}