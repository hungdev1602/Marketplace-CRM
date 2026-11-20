"use client"

import { createContext, Fragment, useContext, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { sizedUrl } from "@/lib/media"
import { doneTopLoader, startTopLoader } from "@/lib/top-loader"
import { getAdminNavigator, setAdminNavigator, type AdminNavigator } from "./navigation"
import { showSavedNotify } from "./notify"

// Thông tin dùng chung của trang admin: tài khoản đang đăng nhập, danh sách quyền, địa chỉ server quản lý file
export type AdminCtx = {
  account: any | null
  permissions: string[]
  fileUrl: string // ví dụ "http://localhost:4000"
}

const AdminContext = createContext<AdminCtx>({ account: null, permissions: [], fileUrl: "" })

// Số lần đã lấy lại dữ liệu trang (adminReload), đổi số này thì nội dung trang được dựng lại từ đầu
const ContentVersionContext = createContext(0)

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  return {
    ...ctx,
    // Tài khoản có quyền hay không (danh sách quyền ở server/config/variable.config.ts)
    can: (permission: string) => ctx.permissions.includes(permission),
    canAny: (list: string[]) => list.some(permission => ctx.permissions.includes(permission)),
    // Link file lưu ở server quản lý file. width: ảnh thu nhỏ (lib/media.ts), bỏ trống = file gốc
    fileSrc: (path: string, width?: number) => sizedUrl(`${ctx.fileUrl}${path}`, width)
  }
}

// Trang trước đang mở cửa sổ modal của Bootstrap thì chuyển trang xong vẫn còn lớp nền mờ, trang bị khoá cuộn => dọn đi
const cleanupBootstrapModal = () => {
  if(document.querySelector(".modal.show")) return
  document.querySelectorAll(".modal-backdrop").forEach(element => element.remove())
  document.body.classList.remove("modal-open")
  document.body.style.removeProperty("overflow")
  document.body.style.removeProperty("padding-right")
}

export function AdminProvider({ value, children }: { value: AdminCtx, children: React.ReactNode }) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [contentVersion, setContentVersion] = useState(0)
  const isWaitingRefresh = useRef(false)

  // Mở trang admin (lần đầu hoặc chuyển từ trang khác sang):
  // - hiện thông báo trang trước để lại (ví dụ "Đăng nhập thành công" sau khi tải lại trang)
  // - dọn modal của trang trước
  useEffect(() => {
    showSavedNotify()
    cleanupBootstrapModal()
  }, [])

  // Đăng ký bộ điều khiển chuyển trang cho các hàm adminGo / adminReload (navigation.ts)
  useEffect(() => {
    const navigator: AdminNavigator = {
      push: url => {
        startTopLoader(url)
        router.push(url)
      },
      refresh: () => {
        isWaitingRefresh.current = true
        startTopLoader()
        startTransition(() => router.refresh())
      }
    }
    setAdminNavigator(navigator)
    return () => {
      if(getAdminNavigator() === navigator) setAdminNavigator(null)
    }
  }, [router])

  // Đã lấy xong dữ liệu mới: dựng lại nội dung trang (như tải lại trang), cho thanh loading chạy hết
  useEffect(() => {
    if(isRefreshing || !isWaitingRefresh.current) return
    isWaitingRefresh.current = false
    setContentVersion(version => version + 1)
    doneTopLoader()
  }, [isRefreshing])

  return (
    <AdminContext.Provider value={value}>
      <ContentVersionContext.Provider value={contentVersion}>{children}</ContentVersionContext.Provider>
    </AdminContext.Provider>
  )
}

// Phần nội dung trang (không gồm menu): được dựng lại từ đầu sau mỗi lần adminReload
export function AdminContent({ children }: { children: React.ReactNode }) {
  const version = useContext(ContentVersionContext)
  return <Fragment key={version}>{children}</Fragment>
}
