// ===== Thanh loading mỏng ở trên cùng trang (components/TopLoader.tsx) =====
// Bấm link (cả <Link> của Next.js lẫn thẻ <a> thường) thì thanh tự chạy, không cần gọi gì thêm.
// Các hàm dưới đây dùng cho những chỗ JS tự chuyển trang / tải lại trang (sau khi lưu form, đăng nhập, phân trang admin,...)
// Chỉ gọi trong trình duyệt (trong hàm xử lý sự kiện, useEffect)

export const TOP_LOADER_EVENT = "sf-top-loader"

export type TopLoaderAction = "start" | "done"

const send = (action: TopLoaderAction) => {
  if(typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<TopLoaderAction>(TOP_LOADER_EVENT, { detail: action }))
}

// Đường dẫn + tham số (bỏ phần #...), ví dụ "/products?page=2"
export const pageKey = (url: URL): string => `${url.pathname}${url.search}`

// Bắt đầu chạy thanh loading
// - url: trang sắp mở bằng router.push của Next.js. Trùng trang đang xem thì không chạy
//   (Next.js không đổi trang nên thanh sẽ không có lúc xong)
export const startTopLoader = (url?: string) => {
  if(typeof window === "undefined") return
  if(url !== undefined) {
    const target = new URL(url, window.location.href)
    if(target.origin === window.location.origin && pageKey(target) === pageKey(new URL(window.location.href))) return
  }
  send("start")
}

// Cho thanh chạy hết rồi ẩn (ví dụ khi huỷ chuyển trang)
export const doneTopLoader = () => send("done")

// Chuyển sang trang khác (tải lại cả trang) và hiện thanh loading trong lúc chờ
export const goTo = (url: string) => {
  startTopLoader()
  window.location.href = url
}

// Tải lại trang hiện tại và hiện thanh loading trong lúc chờ
export const reloadPage = () => {
  startTopLoader()
  window.location.reload()
}
