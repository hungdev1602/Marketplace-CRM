import { ClientShell } from "@/components/client/Shell"
import { LegalView } from "@/components/client/views/LegalView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx } from "@/lib/view-ctx"

// Trang Правовая информация: /legal (thông tin người bán + danh sách văn bản pháp lý)
// Dữ liệu: hàm index ở server/controller/client/legal.controller.ts

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/legal", await searchParams)
  return clientMetadata(data)
}

export default async function LegalIndexPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/legal", await searchParams)
  const ctx = makeCtx(data)

  return (
    <ClientShell data={data} ctx={ctx}>
      <LegalView ctx={ctx} data={data} />
    </ClientShell>
  )
}
