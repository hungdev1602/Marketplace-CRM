import NextLink from "next/link"

// Link giữa các trang khách hàng (dùng thay cho Link của Next.js: import Link from "@/components/client/ShopLink")
// prefetch={false}: KHÔNG tải trước trang khi link hiện trên màn hình.
// Mọi trang của website đều lấy dữ liệu mới từ server Express (giỏ hàng, giá, tồn kho), nên Next.js không dùng lại được
// dữ liệu tải trước: mỗi link trên màn hình chỉ làm server Express + database phải dựng thêm 1 trang vô ích
// (mở trang chủ là ~20-30 trang bị tải trước cùng lúc), làm chậm chính trang khách đang mở.
// Bấm link vẫn chuyển trang không tải lại cả trang, thanh loading trên cùng báo đang chờ.
export default function Link(props: React.ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />
}
