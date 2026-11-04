import axios from "axios"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { getSiteUrl } from "./site-url.helper"

// ===== Đăng nhập bằng Google (OAuth 2.0 / OpenID Connect, kiểu chuyển trang) =====
// 1. Khách bấm "Войти через Google" => server chuyển khách sang trang chọn tài khoản của Google
// 2. Khách chọn tài khoản => Google chuyển khách về /account/google/callback kèm mã "code"
// 3. Server dùng code + GOOGLE_CLIENT_SECRET đổi lấy thông tin tài khoản Google (email, họ tên)
// Không cần tải thư viện JS của Google trên trang, nên trang vẫn nhanh khi mạng tới Google chậm
// Cấu hình trong file .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SITE_URL (xem .env.example)

const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth"
const googleTokenUrl = "https://oauth2.googleapis.com/token"

// Đã điền đủ cấu hình Google trong file .env thì mới hiện nút "Войти через Google"
export const isGoogleLoginEnabled = (): boolean => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

// Link Google chuyển khách quay về, phải khai báo y hệt trong Google Cloud Console (Authorized redirect URIs)
export const getGoogleRedirectUri = (): string => {
  return `${getSiteUrl()}/account/google/callback`
}

// Cặp mã PKCE: codeVerifier giữ ở server (cookie đã ký), gửi Google bản băm codeChallenge
// Người lạ lấy được "code" trên đường đi cũng không đổi được thông tin tài khoản, vì không có codeVerifier
export const createPkcePair = () => {
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")
  return { codeVerifier, codeChallenge }
}

// Link trang chọn tài khoản của Google
// - state: mã ngẫu nhiên, Google trả lại y nguyên, dùng để chắc chắn khách quay về là do chính khách bấm nút trên website
// - lang: ngôn ngữ trang Google (ru, vi)
export const getGoogleAuthUrl = (options: { state: string, codeChallenge: string, lang: string }): string => {
  const params = new URLSearchParams({
    client_id: `${process.env.GOOGLE_CLIENT_ID}`,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile", // chỉ xin email, họ tên (không cần Google duyệt ứng dụng)
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account", // luôn cho khách chọn tài khoản Google (máy có nhiều tài khoản Google)
    hl: options.lang
  })
  return `${googleAuthUrl}?${params.toString()}`
}

export type GoogleProfile = {
  googleId: string, // mã tài khoản Google, không đổi kể cả khi khách đổi email Google
  email: string, // chữ thường
  emailVerified: boolean, // Google đã xác nhận email thuộc về khách
  fullName: string
}

// Đổi code lấy thông tin tài khoản Google
// id_token nhận trực tiếp từ máy chủ Google (kết nối HTTPS, có GOOGLE_CLIENT_SECRET) nên không cần kiểm tra chữ ký
// (chuẩn OpenID Connect cho phép), chỉ kiểm tra token đúng là cấp cho website này và còn hạn
export const getGoogleProfile = async (code: string, codeVerifier: string): Promise<GoogleProfile> => {
  const response = await axios.post(googleTokenUrl, new URLSearchParams({
    code: code,
    client_id: `${process.env.GOOGLE_CLIENT_ID}`,
    client_secret: `${process.env.GOOGLE_CLIENT_SECRET}`,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: "authorization_code",
    code_verifier: codeVerifier
  }).toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 15000
  })

  const payload = jwt.decode(response.data?.id_token)
  if(!payload || typeof payload === "string") {
    throw new Error("Google không trả về id_token")
  }

  if(payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("id_token không phải do Google cấp")
  }

  if(payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error("id_token không cấp cho website này (sai GOOGLE_CLIENT_ID)")
  }

  if(!payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error("id_token đã hết hạn")
  }

  if(typeof payload.sub !== "string" || !payload.sub || typeof payload.email !== "string" || !payload.email) {
    throw new Error("id_token thiếu mã tài khoản hoặc email")
  }

  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    fullName: typeof payload.name === "string" ? payload.name.trim() : ""
  }
}
