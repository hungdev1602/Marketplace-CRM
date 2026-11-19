import { ProductListView } from "@/components/client/views/ProductListView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"

// Danh sách sản phẩm, kết quả tìm kiếm: /products?keyword=...&origin=VN&page=2

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/products", await searchParams)
  return clientMetadata(data)
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/products", await searchParams)
  return <ProductListView data={data} />
}
