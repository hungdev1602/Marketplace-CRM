import Link from "next/link"

// Link giữa các trang admin: chuyển trang không tải lại cả trang (Next.js chỉ lấy nội dung trang mới từ server),
// nhanh hơn thẻ <a> thường vì không phải tải lại CSS, JS, font và dựng lại menu.
// prefetch={false}: không tải trước trang khi link hiện trên màn hình (trang admin luôn lấy dữ liệu mới từ server,
// tải trước chỉ làm server phải trả lời thêm cho mọi link trên trang)
// Vẫn dùng thẻ <a> thường cho: đăng xuất, tải file (/api/...), link sang trang khách hàng, link mở tab mới
export function AdminLink(props: React.ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />
}
