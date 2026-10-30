// Đuôi file video (album sản phẩm có thể có cả ảnh và video)
// MP4 (H.264) và WEBM phát được trên mọi trình duyệt; MOV chỉ phát được trên một số máy (iPhone, Safari)
// Nhớ sửa cả danh sách giống vậy trong public/admin/assets/js/main.js (xem trước video ở trang admin)
export const videoExtensionList = ["mp4", "webm", "mov", "m4v", "ogv"]

// Đường dẫn file là video hay không (xét theo đuôi file), ví dụ "/media/gao-den.mp4" => true
export const isVideoPath = (path: string | null | undefined): boolean => {
  const extension = `${path || ""}`.split(/[?#]/)[0].split(".").pop() || ""
  return videoExtensionList.includes(extension.toLowerCase())
}
