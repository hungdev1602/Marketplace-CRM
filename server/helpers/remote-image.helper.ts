import axios from "axios"
import dns from "dns"
import net from "net"
import path from "path"
import FormData from "form-data"
import slugify from "slugify"
import { Media } from "../models/media.model"
import { domainFileManager, productImportImageFolder, productImportImageMaxSize } from "../config/variable.config"

// ===== Tải ảnh từ link ngoài về server Quản lý file (dùng khi nhập sản phẩm từ Excel) =====

// Chỉ cho tải ảnh từ địa chỉ công khai trên Internet, chặn localhost và mạng nội bộ
// (tránh bị lợi dụng để truy cập vào máy chủ nội bộ - lỗi bảo mật SSRF)
const blockedIpList = new net.BlockList()
blockedIpList.addSubnet("0.0.0.0", 8, "ipv4")
blockedIpList.addSubnet("10.0.0.0", 8, "ipv4")
blockedIpList.addSubnet("100.64.0.0", 10, "ipv4")
blockedIpList.addSubnet("127.0.0.0", 8, "ipv4")
blockedIpList.addSubnet("169.254.0.0", 16, "ipv4")
blockedIpList.addSubnet("172.16.0.0", 12, "ipv4")
blockedIpList.addSubnet("192.168.0.0", 16, "ipv4")
blockedIpList.addSubnet("224.0.0.0", 3, "ipv4")
blockedIpList.addAddress("::", "ipv6")
blockedIpList.addAddress("::1", "ipv6")
blockedIpList.addSubnet("fc00::", 7, "ipv6")
blockedIpList.addSubnet("fe80::", 10, "ipv6")

const isBlockedIp = (address: string) => {
  return blockedIpList.check(address, net.isIPv6(address) ? "ipv6" : "ipv4")
}

const blockedMessage = "Không được tải ảnh từ địa chỉ nội bộ"

// Tên miền: kiểm tra địa chỉ IP sau khi phân giải (kể cả khi link chuyển hướng sang tên miền khác)
const safeLookup = (hostname: string, options: any, callback: any) => {
  dns.lookup(hostname, { ...options, all: true } as dns.LookupAllOptions, (error, addressList) => {
    if(error){
      callback(error)
      return
    }
    if(addressList.some(item => isBlockedIp(item.address))){
      callback(new Error(blockedMessage))
      return
    }
    callback(null, addressList)
  })
}

// Địa chỉ IP viết thẳng trong link (không qua phân giải tên miền) thì kiểm tra trực tiếp
const checkIpHost = (hostname: string) => {
  const host = hostname.replace(/^\[|\]$/g, "") // IPv6 trong link có dạng [::1]
  if(net.isIP(host) && isBlockedIp(host)){
    throw new Error(blockedMessage)
  }
}

// Nhận dạng ảnh theo nội dung file (không tin header Content-Type của web khác)
const detectImageType = (buffer: Buffer) => {
  if(buffer.length < 12){
    return undefined
  }
  if(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff){
    return { mimetype: "image/jpeg", extension: "jpg" }
  }
  if(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))){
    return { mimetype: "image/png", extension: "png" }
  }
  if(buffer.subarray(0, 4).toString("ascii") === "GIF8"){
    return { mimetype: "image/gif", extension: "gif" }
  }
  if(buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"){
    return { mimetype: "image/webp", extension: "webp" }
  }
  return undefined
}

// Lý do lỗi dễ hiểu cho người dùng
const getDownloadErrorMessage = (error: any) => {
  if(error.message === blockedMessage || error.cause?.message === blockedMessage){
    return blockedMessage
  }
  if(error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"){
    return "Quá thời gian tải"
  }
  if(error.code === "ENOTFOUND" || error.code === "EAI_AGAIN"){
    return "Không tìm thấy tên miền"
  }
  if(error.code === "ERR_BAD_RESPONSE" && `${error.message}`.includes("maxContentLength")){
    return `Ảnh lớn hơn ${productImportImageMaxSize}MB`
  }
  if(error.response?.status){
    return `Web trả về lỗi ${error.response.status}`
  }
  return error.message || "Lỗi không xác định"
}

// Tải 1 ảnh từ link ngoài, trả về nội dung file và tên file
const downloadImage = async (link: string) => {
  const url = new URL(link)
  checkIpHost(url.hostname)

  const response = await axios.get(link, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxContentLength: productImportImageMaxSize * 1024 * 1024,
    maxRedirects: 3,
    lookup: safeLookup,
    beforeRedirect: (options: any) => {
      checkIpHost(options.hostname)
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SFoodie product import)",
      "Accept": "image/*"
    }
  })

  const buffer = Buffer.from(response.data)
  const imageType = detectImageType(buffer)
  if(!imageType){
    throw new Error("Link không phải là ảnh JPG, PNG, WEBP, GIF")
  }

  // Tên file lấy theo link (bỏ dấu, ký tự đặc biệt), ví dụ https://abc.com/img/Mì Hảo Hảo.png => mi-hao-hao.png
  let baseName = path.basename(url.pathname)
  try {
    baseName = decodeURIComponent(baseName)
  } catch (error) {}
  baseName = slugify(baseName.replace(/\.[a-z0-9]+$/i, ""), { lower: true, strict: true }).slice(0, 60) || "anh"

  return {
    buffer: buffer,
    filename: `${baseName}.${imageType.extension}`,
    mimetype: imageType.mimetype
  }
}

// Tạo bộ tải ảnh dùng cho 1 lần nhập file
// - Mỗi link chỉ tải 1 lần (nhiều sản phẩm dùng chung 1 ảnh thì chỉ lưu 1 file)
// - Ảnh được lưu vào thư mục productImportImageFolder trong Quản lý file
export const createImageDownloader = () => {
  const cache = new Map<string, Promise<string>>()
  let folderReady: Promise<any> | undefined

  // Tạo thư mục lưu ảnh (đã có thì server Quản lý file báo lỗi "đã tồn tại", bỏ qua)
  const ensureFolder = () => {
    if(!folderReady){
      const formData = new FormData()
      formData.append("folderName", productImportImageFolder)
      folderReady = axios.post(`${domainFileManager}/file-manager/folder/create`, formData, {
        headers: formData.getHeaders()
      }).catch(() => {})
    }
    return folderReady
  }

  const saveImage = async (link: string) => {
    let image
    try {
      image = await downloadImage(link)
    } catch (error) {
      throw new Error(`Không tải được ảnh ${link} (${getDownloadErrorMessage(error)})`)
    }

    try {
      await ensureFolder()

      const formData = new FormData()
      formData.append("files", image.buffer, {
        filename: image.filename,
        contentType: image.mimetype
      })
      formData.append("folderPath", productImportImageFolder)

      const response = await axios.post(`${domainFileManager}/file-manager/upload`, formData, {
        headers: formData.getHeaders()
      })

      if(response.data.code !== "success"){
        throw new Error(response.data.message)
      }

      // Lưu vào database để ảnh hiện ở trang Quản lý file
      await Media.insertMany(response.data.saveLinks)

      const saveLink = response.data.saveLinks[0]
      return `${saveLink.folder}/${saveLink.filename}`
    } catch (error) {
      throw new Error(`Không lưu được ảnh ${link} vào Quản lý file, vui lòng kiểm tra server Quản lý file đã chạy chưa`)
    }
  }

  // Trả về đường dẫn ảnh trong Quản lý file (/media/nhap-excel/...)
  // Link tải lỗi cũng được lưu lại, các dòng khác dùng link đó báo lỗi luôn, không phải chờ tải lại
  return (link: string) => {
    if(!cache.has(link)){
      const promise = saveImage(link)
      promise.catch(() => {}) // lỗi được xử lý ở nơi gọi, tránh cảnh báo "unhandled rejection"
      cache.set(link, promise)
    }
    return cache.get(link) as Promise<string>
  }
}
