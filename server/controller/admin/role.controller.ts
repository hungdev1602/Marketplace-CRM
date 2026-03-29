import { Request, Response } from "express"
import { pathAdmin, permissionList } from "../../config/variable.config"
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
  const totalRecord = await Role.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const roleList = await Role
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  res.render("admin/pages/role-list", {
    pageTitle: "Danh sách nhóm quyền",
    roleList: roleList,
    pagination: pagination
  })
}

export const edit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const roleDetail = await Role.findOne({
      _id: id,
      deleted: false
    })

    if(!roleDetail){
      res.redirect(`/${pathAdmin}/role/list`)
      return
    }

    res.render("admin/pages/role-edit", {
      pageTitle: "Chỉnh sửa nhóm quyền",
      roleDetail: roleDetail,
      permissionList: permissionList
    })

  } catch (error) {
    res.redirect(`/${pathAdmin}/role/list`)
  }
}

export const editPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id

    const roleDetail = await Role.findOne({
      _id: id,
      deleted: false
    })

    if(!roleDetail){
      res.json({
        code: "error",
        message: "Nhóm quyền không tồn tại"
      })
      return
    }

    req.body.permissions = JSON.parse(req.body.permissions)

    req.body.search = slugify(`${req.body.name}`, {
      replacement: " ",
      lower: true
    })

    await Role.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    res.json({
      code: "success",
      message: "Cập nhật nhóm quyền thành công"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: "error",
      message: "Lỗi data"
    })
  }
}