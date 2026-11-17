import { ArticleListView } from "@/components/client/views/ArticleListView"
import { clientMetadata, loadClientPage, type PageProps } from "@/lib/client-page"

// Bài viết của 1 danh mục: /blog/category/:slug

type Props = PageProps<{ slug: string }>

const load = async ({ params, searchParams }: Props) => {
  const { slug } = await params
  return loadClientPage(`/blog/category/${encodeURIComponent(slug)}`, await searchParams)
}

export async function generateMetadata(props: Props) {
  const { data } = await load(props)
  return clientMetadata(data)
}

export default async function BlogCategoryPage(props: Props) {
  const { data } = await load(props)
  return <ArticleListView data={data} />
}
