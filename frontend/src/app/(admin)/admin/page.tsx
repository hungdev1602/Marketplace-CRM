import { redirect } from "next/navigation"
import { adminUrl } from "@/lib/admin"

// /admin => trang tổng quan
export default function AdminIndexPage() {
  redirect(adminUrl("/dashboard"))
}
