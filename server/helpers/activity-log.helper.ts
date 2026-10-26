import { Request, Response } from "express"
import slugify from "slugify"
import { ActivityLog } from "../models/activity-log.model"

// Ghi nhật ký hoạt động của tài khoản admin, gọi trong controller sau khi thao tác thành công, ví dụ:
// await writeLog(req, res, {
//   module: "article",
//   action: "create",
//   description: `Tạo bài viết "${req.body.name}"`,
//   targetId: newRecord.id
// })
// - module, action: id trong activityLogModuleList, activityLogActionList (config/variable.config.ts)
// - account: tài khoản thực hiện, mặc định là tài khoản đang đăng nhập (res.locals.account)
//   (trang đăng nhập/đăng xuất chưa có res.locals.account nên phải truyền vào)
export const writeLog = async (req: Request, res: Response, data: {
  module: string,
  action: string,
  description: string,
  targetId?: string,
  account?: any
}) => {
  // Ghi log lỗi thì chỉ in ra console, không làm hỏng thao tác chính của người dùng
  try {
    const account = data.account || res.locals.account
    if(!account){
      return
    }

    await ActivityLog.create({
      accountId: account.id,
      accountFullName: account.fullName,
      accountEmail: account.email,
      module: data.module,
      action: data.action,
      description: data.description,
      targetId: data.targetId,
      // Bỏ tiền tố "::ffff:" của địa chỉ IPv4 (ví dụ "::ffff:127.0.0.1" => "127.0.0.1")
      ip: `${req.ip || ""}`.replace(/^::ffff:/, ""),
      userAgent: req.headers["user-agent"],
      search: slugify(`${account.fullName} ${account.email} ${data.description}`, {
        replacement: " ",
        lower: true
      })
    })
  } catch (error) {
    console.log("Ghi nhật ký hoạt động thất bại")
    console.log(error)
  }
}
