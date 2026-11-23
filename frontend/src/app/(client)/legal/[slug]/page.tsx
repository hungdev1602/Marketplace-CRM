import { ClientShell } from "@/components/client/Shell"
import { LegalView } from "@/components/client/views/LegalView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"
import { makeCtx } from "@/lib/view-ctx"

// Trang 1 văn bản pháp lý: /legal/privacy, /legal/consent, /legal/offer, /legal/delivery, /legal/returns
// Dữ liệu: hàm detail ở server/controller/client/legal.controller.ts (slug sai thì server trả trang 404)

type Props = PageProps<{ slug: string }>

const load = async ({ params, searchParams }: Props) => {
  const { slug } = await params
  return loadClientPage(`/legal/${encodeURIComponent(slug)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function LegalDocumentPage(props: Props) {
  const { data } = await load(props)
  const ctx = makeCtx(data)

  return (
    <ClientShell data={data} ctx={ctx}>
      <LegalView ctx={ctx} data={data} />
    </ClientShell>
  )
}
