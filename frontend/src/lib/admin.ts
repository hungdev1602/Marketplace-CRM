// Đường dẫn trang admin, phải giống pathAdmin ở server/config/variable.config.ts
// Lưu ý: các trang admin của Next.js nằm trong thư mục src/app/(admin)/admin,
// muốn đổi đường dẫn admin thì đổi cả tên thư mục đó và pathAdmin ở server
export const adminPath = "admin"

// Link 1 trang admin, ví dụ adminUrl("/product/list") => "/admin/product/list"
export const adminUrl = (path: string = ""): string => `/${adminPath}${path}`

// Đường dẫn gọi API admin của server Express qua Next.js (next.config.ts chuyển tiếp /api/... sang server Express)
// ví dụ adminApiUrl("/product/export") => "/api/admin/product/export"
export const adminApiUrl = (path: string): string => `/api${adminUrl(path)}`

// Đường dẫn file là video hay không (xét theo đuôi file), giống videoExtensionList ở server/helpers/media.helper.ts
export const isVideoPath = (path: string): boolean => /\.(mp4|webm|mov|m4v|ogv)$/i.test(`${path}`.split(/[?#]/)[0])
