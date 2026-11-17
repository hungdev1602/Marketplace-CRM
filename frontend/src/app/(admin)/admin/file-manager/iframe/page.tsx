import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Quản lý file trong khung admin (có menu): /admin/file-manager/iframe
// Mở trang /admin/file-manager trong iframe (giống giao diện cũ)

const path = "/file-manager/iframe"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

export default async function FileManagerIframePage(props: AdminPageProps) {
  return adminPage(path, props, () => (
    <iframe src={adminUrl("/file-manager")} style={{ width: "100%", height: "76vh", border: 0 }}></iframe>
  ))
}
