import { ArticleListView } from "@/components/client/views/ArticleListView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"

// Danh sách bài viết: /blog

export async function generateMetadata({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/blog", await searchParams)
  return clientMetadata(data)
}

export default async function BlogPage({ searchParams }: PageProps) {
  const { data } = await loadClientPage("/blog", await searchParams)
  return <ArticleListView data={data} />
}
