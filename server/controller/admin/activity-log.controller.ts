import { Request, Response } from "express"
import slugify from "slugify"
import moment from "moment"
import { ActivityLog } from "../../models/activity-log.model"
import { AccountAdmin } from "../../models/account-admin.model"
import { activityLogActionList, activityLogModuleList } from "../../config/variable.config"

export const list = async (req: Request, res: Response) => {
  const find: {
    accountId?: string,
    module?: string,
    action?: string,
    createdAt?: {
      $gte?: Date,
      $lte?: Date
    },
    search?: RegExp
  } = {}

  // Lọc theo tài khoản, chức năng, hành động
  if(req.query.accountId){
    find.accountId = `${req.query.accountId}`
  }

  if(req.query.module){
    find.module = `${req.query.module}`
  }

  if(req.query.action){
    find.action = `${req.query.action}`
  }

  // Lọc theo khoảng ngày (ô chọn ngày gửi lên dạng YYYY-MM-DD)
  const startDate = moment(`${req.query.startDate}`, "YYYY-MM-DD", true)
  const endDate = moment(`${req.query.endDate}`, "YYYY-MM-DD", true)
  if(startDate.isValid() || endDate.isValid()){
    find.createdAt = {}
    if(startDate.isValid()){
      find.createdAt.$gte = startDate.startOf("day").toDate() // từ 00:00:00 ngày bắt đầu
    }
    if(endDate.isValid()){
      find.createdAt.$lte = endDate.endOf("day").toDate() // đến 23:59:59 ngày kết thúc
    }
  }

  // Tìm theo từ khoá (họ tên, email, nội dung)
  if(req.query.keyword){
    const keyword = slugify(`${req.query.keyword}`, {
      replacement: " ", // replace spaces with replacement character, defaults to `-`
      lower: true
    })

    // Thêm "\" trước các ký tự đặc biệt của RegExp (. * + ? ( ) ...) để tìm đúng chuỗi đã nhập, ví dụ email có dấu "."
    const keywordRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    find.search = keywordRegex
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await ActivityLog.countDocuments(find)
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  const logList: any = await ActivityLog
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  for (const item of logList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm:ss - DD/MM/YYYY")
    item.moduleName = activityLogModuleList.find(module => module.id === item.module)?.name || item.module

    const action = activityLogActionList.find(action => action.id === item.action)
    item.actionName = action?.name || item.action
    item.actionColor = action?.color || "bg-secondary"
  }

  // Danh sách tài khoản để lọc (gồm cả tài khoản đã xoá vào thùng rác)
  const accountList = await AccountAdmin
    .find({})
    .select("fullName email deleted")
    .sort({
      fullName: "asc"
    })

  res.render("admin/pages/activity-log-list", {
    pageTitle: "Nhật ký hoạt động",
    logList: logList,
    accountList: accountList,
    moduleList: activityLogModuleList,
    actionList: activityLogActionList,
    filter: {
      accountId: req.query.accountId || "",
      module: req.query.module || "",
      action: req.query.action || "",
      startDate: startDate.isValid() ? req.query.startDate : "",
      endDate: endDate.isValid() ? req.query.endDate : "",
      keyword: req.query.keyword || ""
    },
    pagination: pagination,
    page: page
  })
}
