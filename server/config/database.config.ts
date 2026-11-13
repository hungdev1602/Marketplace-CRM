import mongoose from "mongoose"
import dns from "dns"
import net from "net"

// ===== Kết nối MongoDB =====
// MONGO_URL dạng "mongodb+srv://..." (MongoDB Atlas): trước khi kết nối, Node phải hỏi DNS danh sách máy chủ của cluster
// (bản ghi SRV). DNS của một số mạng (router, nhà mạng, wifi công cộng, VPN) trả lời sai kiểu câu hỏi này,
// server báo lỗi "querySrv EBADRESP / ECONNREFUSED / ETIMEOUT" dù mạng vẫn vào web bình thường.
// Gặp lỗi đó thì thử lại 1 lần bằng DNS công cộng bên dưới (chỉ dùng cho việc tra địa chỉ cluster, không đổi DNS của máy)

// DNS công cộng: Google, Cloudflare, Yandex. Đổi bằng DNS_SERVERS trong file .env (cách nhau bằng dấu phẩy)
const defaultDnsServers = ["8.8.8.8", "1.1.1.1", "77.88.8.8"]

const getFallbackDnsServers = (): string[] => {
  const servers = `${process.env.DNS_SERVERS || ""}`
    .split(",")
    .map(item => item.trim())
    .filter(item => net.isIP(item) !== 0) // bỏ giá trị không phải địa chỉ IP
  return servers.length > 0 ? servers : defaultDnsServers
}

// Lỗi lúc hỏi DNS địa chỉ cluster (chưa hề kết nối tới MongoDB)
const isSrvLookupError = (error: any): boolean => {
  return ["querySrv", "queryTxt"].includes(error?.syscall)
}

export const connectDB = async () => {
  const mongoUrl = `${process.env.MONGO_URL}`

  try {
    await mongoose.connect(mongoUrl)
    console.log("Kết nối database thành công <3")
    return
  } catch (error: any) {
    if(!isSrvLookupError(error)){
      console.log("Kết nối database thất bại :((")
      console.log(error)
      return
    }

    console.log(`DNS của mạng đang dùng không tra được địa chỉ MongoDB Atlas (${error.syscall} ${error.code}), thử lại bằng DNS công cộng...`)
  }

  const dnsServers = getFallbackDnsServers()
  try {
    dns.setServers(dnsServers)
    await mongoose.connect(mongoUrl)
    console.log(`Kết nối database thành công <3 (tra địa chỉ MongoDB Atlas bằng DNS ${dnsServers.join(", ")})`)
  } catch (error: any) {
    console.log("Kết nối database thất bại :((")
    console.log(error)

    if(isSrvLookupError(error)){
      console.log("=====================================================================================")
      if(error.code === "ENOTFOUND"){
        console.log("Không tìm thấy địa chỉ cluster trong MONGO_URL (file .env): kiểm tra lại MONGO_URL có gõ đúng không,")
        console.log("và cluster còn tồn tại trong MongoDB Atlas không (https://cloud.mongodb.com).")
      }
      else {
        console.log("Mạng đang dùng chặn việc tra địa chỉ MongoDB Atlas (đã thử cả DNS công cộng). Cách xử lý:")
        console.log("1. Đổi sang mạng khác (ví dụ phát wifi từ điện thoại) hoặc bật / tắt VPN rồi chạy lại.")
        console.log("2. Hoặc đổi MONGO_URL trong file .env sang dạng \"mongodb://...\" (không cần tra SRV): xem hướng dẫn trong file .env.example.")
      }
      console.log("=====================================================================================")
    }
  }
}
