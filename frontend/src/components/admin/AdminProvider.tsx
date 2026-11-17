"use client"

import { createContext, useContext, useEffect } from "react"
import { showSavedNotify } from "./notify"

// Thông tin dùng chung của trang admin: tài khoản đang đăng nhập, danh sách quyền, địa chỉ server quản lý file
export type AdminCtx = {
  account: any | null
  permissions: string[]
  fileUrl: string // ví dụ "http://localhost:4000"
}

const AdminContext = createContext<AdminCtx>({ account: null, permissions: [], fileUrl: "" })

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  return {
    ...ctx,
    // Tài khoản có quyền hay không (danh sách quyền ở server/config/variable.config.ts)
    can: (permission: string) => ctx.permissions.includes(permission),
    canAny: (list: string[]) => list.some(permission => ctx.permissions.includes(permission)),
    // Link file lưu ở server quản lý file
    fileSrc: (path: string) => `${ctx.fileUrl}${path}`
  }
}

export function AdminProvider({ value, children }: { value: AdminCtx, children: React.ReactNode }) {
  // Hiện thông báo trang trước để lại (ví dụ "Tạo bài viết thành công" sau khi tải lại trang)
  useEffect(() => {
    showSavedNotify()
  }, [])

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
