import crypto from "crypto"

// ===== Mã hoá khoá API, mật khẩu trước khi lưu vào database =====
// AES-256-GCM, khoá mã hoá tạo từ INTEGRATION_SECRET_KEY trong file .env (không có thì dùng JWT_SECRET)
// - Ai lấy được database (bản sao lưu, MongoDB Atlas...) cũng không đọc được khoá API nếu không có file .env
// - Đổi INTEGRATION_SECRET_KEY (hoặc JWT_SECRET khi chưa có INTEGRATION_SECRET_KEY) thì các khoá đã lưu không giải mã được nữa,
//   trang admin "Kết nối API" sẽ báo và cần nhập lại
// Lưu ý: đọc process.env trong hàm (không đọc lúc import file), vì file .env được nạp sau khi import (index.ts)

const prefix = "v1"

const getSecretSource = (): string => {
  return `${process.env.INTEGRATION_SECRET_KEY || process.env.JWT_SECRET || ""}`.trim()
}

// Có khoá mã hoá chưa (chưa có thì không lưu được khoá API ở trang admin)
export const canEncryptSecret = (): boolean => {
  return getSecretSource().length > 0
}

// Đang dùng INTEGRATION_SECRET_KEY riêng hay dùng chung JWT_SECRET
export const hasDedicatedSecretKey = (): boolean => {
  return `${process.env.INTEGRATION_SECRET_KEY || ""}`.trim().length > 0
}

const getKey = (): Buffer => {
  return crypto.createHash("sha256").update(`sfoodie-api-integration:${getSecretSource()}`).digest()
}

// "v1:<iv>:<tag>:<dữ liệu mã hoá>" (base64)
export const encryptSecret = (text: string): string => {
  if(!canEncryptSecret()){
    throw new Error("Chưa có INTEGRATION_SECRET_KEY (hoặc JWT_SECRET) trong file .env để mã hoá khoá API")
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [prefix, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

// Giải mã, sai khoá / dữ liệu hỏng thì trả về null
export const decryptSecret = (value: string): string | null => {
  try {
    const [version, iv, tag, encrypted] = `${value || ""}`.split(":")
    if(version !== prefix || !iv || !tag || encrypted === undefined || !canEncryptSecret()) return null

    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"))
    decipher.setAuthTag(Buffer.from(tag, "base64"))
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8")
  } catch (error) {
    return null
  }
}
