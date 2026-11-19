import { FileManager } from "@/components/admin/views/FileManager"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Quản lý file: /admin/file-manager?folderPath=... (trang không có menu, mở trong iframe)
// Dữ liệu: hàm index ở server/controller/admin/file-manager.controller.ts

const path = "/file-manager"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function FileManagerPage(props: AdminPageProps) {
  return adminPage(path, props, (data, query) => (
    <div className="container-fluid py-3">
      <FileManager
        listFile={data.listFile || []}
        listFolder={data.listFolder || []}
        pagination={data.pagination}
        page={data.page || 1}
        folderPath={query.folderPath || ""}
      />
    </div>
  ), { blank: true })
}
