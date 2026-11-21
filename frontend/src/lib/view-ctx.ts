// Thông tin dùng chung của 1 trang khách hàng, lấy từ dữ liệu server Express trả về
// (các biến res.locals ở server/middlewares/client: ngôn ngữ, tài khoản, giỏ hàng, danh mục,...)
// Là dữ liệu thuần (không có hàm), nên truyền được từ server component xuống client component
import { createTranslator } from "./i18n"
import { sizedSrcSet, sizedUrl } from "./media"

export type ViewCtx = {
  lang: string // ngôn ngữ khách đang chọn: "ru" | "vi"
  fileUrl: string // địa chỉ server quản lý file, ví dụ "http://localhost:4000"
  currentPath: string // đường dẫn trang đang xem, để tô đậm mục menu
  query: { [key: string]: any } // tham số trên đường dẫn (?keyword=...)
  clientAccount: any | null // tài khoản khách đang đăng nhập
  shopInfo: any // thông tin cửa hàng (Admin => Cài đặt cửa hàng)
  categoryTree: any[] // cây danh mục sản phẩm
  productOptions: any // các danh sách lựa chọn của sản phẩm (xuất xứ, đơn vị,...)
  cartMaxQuantity: number // số lượng tối đa của 1 sản phẩm trong giỏ
  defaultTheme: string // giao diện mặc định: system | light | dark
  currentYear: number
}

export const makeCtx = (data: any): ViewCtx => ({
  lang: data.lang || "ru",
  fileUrl: data.domainFileManager || "",
  currentPath: data.currentPath || "/",
  query: data.query || {},
  clientAccount: data.clientAccount || null,
  shopInfo: data.shopInfo || {},
  categoryTree: data.categoryTree || [],
  productOptions: data.productOptions || {},
  cartMaxQuantity: data.cartMaxQuantity || 0,
  defaultTheme: data.defaultTheme || "system",
  currentYear: data.currentYear || new Date().getFullYear()
})

// Link ảnh lưu ở server quản lý file, chưa có ảnh thì dùng ảnh mặc định
// - width: chiều rộng ảnh trên trang (px) => server trả ảnh đã thu nhỏ (lib/media.ts). Bỏ trống = file gốc (video, ảnh xem lớn)
export const mediaUrl = (ctx: { fileUrl: string }, path: string | null | undefined, width?: number): string => {
  return path ? sizedUrl(`${ctx.fileUrl}${path}`, width) : "/client/assets/images/no-image.svg"
}

// srcSet của ảnh: màn hình nét (điện thoại, Retina) lấy ảnh gấp đôi width. Chưa có ảnh thì không cần
export const mediaSrcSet = (ctx: { fileUrl: string }, path: string | null | undefined, width: number): string | undefined => {
  return path ? sizedSrcSet(`${ctx.fileUrl}${path}`, width) : undefined
}

// Bộ hàm dịch theo ngôn ngữ của trang
export const translator = (ctx: { lang: string }) => createTranslator(ctx.lang)

// Số điện thoại chỉ còn số và dấu + để dùng trong link tel:
export const telHref = (phone: string): string => `tel:${`${phone}`.replace(/[^\d+]/g, "")}`
