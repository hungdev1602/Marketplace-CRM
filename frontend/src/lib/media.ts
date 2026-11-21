// ===== Link ảnh thu nhỏ ở server quản lý file (repo file-manager-microservice) =====
// Thêm ?w=<chiều rộng> vào link ảnh: server thu nhỏ ảnh và đổi sang WebP (ảnh gốc 1-2 MB còn vài chục KB),
// lưu lại để lần sau trả ngay. Server chỉ có các cỡ 160, 320, 480, 640, 960, 1280, 1920 (số khác được làm tròn lên).
// Video, ảnh GIF / SVG: server bỏ qua ?w= và trả file gốc, nên thêm ?w= vào link nào cũng an toàn.

// sizedUrl("http://localhost:4000/media/a.png", 320) => "http://localhost:4000/media/a.png?w=320"
export const sizedUrl = (url: string, width?: number): string => {
  if(!url || !width) return url
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`
}

// Thuộc tính srcSet cho màn hình nét (điện thoại, Retina): màn hình thường lấy ảnh rộng width, màn hình nét lấy ảnh gấp đôi
export const sizedSrcSet = (url: string, width: number): string => `${sizedUrl(url, width)} 1x, ${sizedUrl(url, width * 2)} 2x`
