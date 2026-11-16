import moment from "moment"
import { ApiCallLog } from "../models/api-call-log.model"
import { apiCallLogRetentionDays } from "../config/variable.config"

// ===== Nhật ký gọi API bên thứ 3 =====
// Gọi sau mỗi lần gọi dịch vụ bên ngoài, ví dụ:
// logApiCall({ provider: "apiship", action: "POST /calculator", ok: true, statusCode: 200, durationMs: 850 })
// Không chờ ghi xong (không làm chậm thao tác chính), ghi lỗi thì chỉ in ra terminal
// Không truyền dữ liệu bí mật (khoá API, mật khẩu, dữ liệu khách) vào message
export const logApiCall = (data: {
  provider: string,
  action: string,
  ok: boolean,
  statusCode?: number,
  durationMs?: number,
  message?: string
}) => {
  ApiCallLog.create({
    provider: data.provider,
    action: `${data.action || ""}`.slice(0, 100),
    ok: data.ok,
    statusCode: data.statusCode || 0,
    durationMs: Math.max(0, Math.round(data.durationMs || 0)),
    message: `${data.message || ""}`.slice(0, 500)
  }).catch(error => {
    console.log("Ghi nhật ký gọi API thất bại:", (error as Error).message)
  })
}

// Xoá nhật ký cũ hơn apiCallLogRetentionDays ngày
export const deleteOldApiCallLogs = async () => {
  try {
    const result = await ApiCallLog.deleteMany({
      createdAt: { $lt: moment().subtract(apiCallLogRetentionDays, "days").toDate() }
    })
    if(result.deletedCount > 0){
      console.log(`Đã xoá ${result.deletedCount} dòng nhật ký gọi API cũ hơn ${apiCallLogRetentionDays} ngày`)
    }
  } catch (error) {
    console.log("Xoá nhật ký gọi API cũ thất bại")
    console.log(error)
  }
}

// Chạy ngay khi khởi động server, sau đó mỗi tiếng 1 lần
export const scheduleDeleteOldApiCallLogs = () => {
  deleteOldApiCallLogs()
  setInterval(deleteOldApiCallLogs, 60 * 60 * 1000)
}

// Thống kê theo dịch vụ trong `hours` giờ gần đây: { tbank: { total, errors, avgMs, lastError: { at, action, message } } }
export const getApiCallStats = async (hours: number = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  const stats: { [provider: string]: { total: number, errors: number, avgMs: number, lastError: any } } = {}

  const rows = await ApiCallLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$provider",
        total: { $sum: 1 },
        errors: { $sum: { $cond: ["$ok", 0, 1] } },
        avgMs: { $avg: "$durationMs" }
      }
    }
  ])
  for (const row of rows) {
    stats[row._id] = { total: row.total, errors: row.errors, avgMs: Math.round(row.avgMs || 0), lastError: null }
  }

  // Lỗi gần nhất của từng dịch vụ (trong thời gian lưu nhật ký)
  const lastErrors = await ApiCallLog.aggregate([
    { $match: { ok: false } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$provider", at: { $first: "$createdAt" }, action: { $first: "$action" }, message: { $first: "$message" } } }
  ])
  for (const row of lastErrors) {
    if(!stats[row._id]) stats[row._id] = { total: 0, errors: 0, avgMs: 0, lastError: null }
    stats[row._id].lastError = { at: row.at, action: row.action, message: row.message }
  }

  return stats
}
