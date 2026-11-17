import { ProductListView } from "@/components/client/views/ProductListView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"

// Sản phẩm của 1 danh mục: /category/:slug

type Props = PageProps<{ slug: string }>

const load = async ({ params, searchParams }: Props) => {
  const { slug } = await params
  return loadClientPage(`/category/${encodeURIComponent(slug)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function CategoryPage(props: Props) {
  const { data } = await load(props)
  return <ProductListView data={data} />
}
