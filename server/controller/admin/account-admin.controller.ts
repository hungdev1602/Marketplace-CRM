import { Request, Response } from "express"
import { Role } from "../../models/role.models"
import slugify from "slugify"
import bcrypt from "bcryptjs"
import { AccountAdmin } from "../../models/account-admin.model"
import { pathAdmin } from "../../config/variable.config"
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

export const list = async (req: Request, res: Response) => {
  const find: {
    deleted: boolean,
    search?: RegExp
  } = {
    deleted: false
  }

  if(req.query.keyword){
    const keyword = slugify(`${req.query.keyword}`, {
      replacement: " ", // replace spaces with replacement character, defaults to `-`
      lower: true
    })

    const keywordRegex = new RegExp(keyword, "i")
    find.search = keywordRegex
  }

  // Pagination
  const limitItem: number = 5
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await AccountAdmin.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const allAccount: any = await AccountAdmin
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  for (const item of allAccount) {
    const roleList = await Role.find({
      _id: {
        $in: item.roles
      }
    })

    item.roleName = roleList.map(item => item.name)
  }

  res.render("admin/pages/account-admin-list", {
    pageTitle: "Danh sách tài khoản admin",
    allAccount: allAccount,
    pagination: pagination,
    page: page
  })
}

export const edit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const accountDetail = await AccountAdmin.findOne({
      _id: id,
      deleted: false
    })
    
    if(!accountDetail){
      res.redirect(`/${pathAdmin}/account-admin/list`)
      return
    }

    const roleList = await Role.find({
      deleted: false,
      status: "active"
    })

    res.render("admin/pages/account-admin-edit", {
      pageTitle: "Chình sửa tài khoản admin",
      roleList: roleList,
      accountDetail: accountDetail
    })
  } catch (error) {
    res.redirect(`/${pathAdmin}/account-admin/list`)
  }
}

export const editPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const accountDetail = await AccountAdmin.findOne({
      _id: id,
      deleted: false
    })

    if(!accountDetail){
      res.json({
        code: "error",
        message: "Tài khoản admin không tồn tại"
      })
      return
    }

    const existEmail = await AccountAdmin.findOne({
      _id: { $ne: id }, // not equal
      email: req.body.email
    })

    if(existEmail){
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

    await AccountAdmin.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    res.json({
      code: "success",
      message: "Cập nhật thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Dữ liệu không hợp lệ"
    })
  }
}