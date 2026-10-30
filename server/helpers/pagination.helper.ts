import { Request } from "express"

// Phân trang ở trang khách hàng
// Link các trang giữ nguyên bộ lọc đang chọn, ví dụ: /products?origin=VN&page=2
// - items: các nút trang, ví dụ 1 … 4 5 [6] 7 8 … 20 (dots: dấu "…")
export const buildClientPagination = (req: Request, totalRecord: number, limitItem: number) => {
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Math.floor(Number(req.query.page))
  }
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pageUrl = (pageNumber: number): string => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(req.query)) {
      if(key === "page") continue
      for (const item of ([] as any[]).concat(value)) {
        if(item !== "" && item !== undefined) params.append(key, `${item}`)
      }
    }
    if(pageNumber > 1){
      params.set("page", `${pageNumber}`)
    }
    const query = params.toString()
    return `${req.baseUrl}${req.path}` + (query ? `?${query}` : "")
  }

  const items: { page?: number, url?: string, active?: boolean, dots?: boolean }[] = []
  for (let i = 1; i <= totalPage; i++) {
    // Luôn hiện trang đầu, trang cuối và 1 trang mỗi bên trang hiện tại
    if(i === 1 || i === totalPage || Math.abs(i - page) <= 1){
      items.push({ page: i, url: pageUrl(i), active: i === page })
    }
    else if(!items[items.length - 1].dots){
      items.push({ dots: true })
    }
  }

  return {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page,
    items: items,
    prevUrl: page > 1 ? pageUrl(page - 1) : "",
    nextUrl: page < totalPage ? pageUrl(page + 1) : ""
  }
}
