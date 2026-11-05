import axios, { AxiosError, Method } from "axios"
import {
  apishipBoxList,
  apishipDefaultItemSize,
  apishipDefaultItemWeight,
  apishipPackagingWeight,
  apishipPickupType,
  apishipPointInIds,
  apishipSender
} from "../config/variable.config"

// ===== ApiShip: kết nối các hãng vận chuyển (СДЭК, Boxberry, Почта России, 5Post, Яндекс Доставка,...) =====
// Tài liệu API: https://docs.apiship.ru (thử API trực tiếp: http://api.dev.apiship.ru/doc/)
// Cấu hình trong file .env: APISHIP_TEST, APISHIP_LOGIN, APISHIP_PASSWORD (xem .env.example)
// - APISHIP_TEST khác "false": máy chủ thử nghiệm của ApiShip (tài khoản test / test), không tạo vận đơn thật
// - APISHIP_TEST=false: máy chủ thật
// Lưu ý: đọc process.env trong hàm (không đọc lúc import file), vì file .env được nạp sau khi import (index.ts)

export const isApishipTest = (): boolean => {
  return process.env.APISHIP_TEST !== "false"
}

export const isApishipConfigured = (): boolean => {
  return !!(process.env.APISHIP_LOGIN && process.env.APISHIP_PASSWORD)
}

const getApiUrl = (): string => {
  return isApishipTest() ? "http://api.dev.apiship.ru/v1" : "https://api.apiship.ru/v1"
}

// Lỗi ApiShip trả về, message là câu báo lỗi đã ghép (hiện cho nhân viên ở trang admin)
export class ApishipError extends Error {
  status: number
  constructor(message: string, status: number = 0) {
    super(message)
    this.status = status
  }
}

// Ghép câu báo lỗi từ dữ liệu ApiShip trả về: { code, message, description, errors: [{ field, message }] }
const getErrorMessage = (error: any): string => {
  if(error instanceof ApishipError) return error.message

  const axiosError = error as AxiosError<any>
  const data = axiosError?.response?.data
  if(data && typeof data === "object"){
    const parts: string[] = []
    if(data.message) parts.push(`${data.message}`)
    if(data.description && data.description !== data.message) parts.push(`${data.description}`)
    if(Array.isArray(data.errors)){
      for (const item of data.errors) {
        parts.push(item.field ? `${item.field}: ${item.message}` : `${item.message}`)
      }
    }
    if(parts.length > 0) return parts.join(". ")
  }

  if(axiosError?.code === "ECONNABORTED") return "ApiShip không trả lời (quá thời gian chờ)"
  return axiosError?.message || "Không kết nối được ApiShip"
}

// ===== Đăng nhập lấy token =====
// POST /login { login, password } => { accessToken, expires }
// Token được giữ trong bộ nhớ server, dùng lại cho các lần gọi sau, hết hạn / bị từ chối thì đăng nhập lại
let tokenCache: { token: string, expireAt: number, key: string } | null = null

const getToken = async (forceNew: boolean = false): Promise<string> => {
  const login = `${process.env.APISHIP_LOGIN || ""}`.trim()
  const password = `${process.env.APISHIP_PASSWORD || ""}`.trim()
  if(!login || !password){
    throw new ApishipError("Chưa điền APISHIP_LOGIN, APISHIP_PASSWORD trong file .env")
  }

  // Đổi tài khoản / đổi máy chủ thử nghiệm - thật thì đăng nhập lại
  const key = `${getApiUrl()}|${login}`
  if(!forceNew && tokenCache && tokenCache.key === key && tokenCache.expireAt > Date.now()){
    return tokenCache.token
  }

  try {
    const response = await axios.post(`${getApiUrl()}/login`, { login, password }, { timeout: 20000 })
    const token = response.data?.accessToken
    if(!token){
      throw new ApishipError("ApiShip không trả về token đăng nhập")
    }

    // Hết hạn theo ApiShip trả về (trừ hao 10 phút), không có thì dùng 12 tiếng
    const expires = response.data?.expires ? new Date(response.data.expires).getTime() : NaN
    const expireAt = Number.isFinite(expires) ? expires - 10 * 60 * 1000 : Date.now() + 12 * 60 * 60 * 1000

    tokenCache = { token, expireAt, key }
    return token
  } catch (error: any) {
    tokenCache = null
    throw new ApishipError(`Đăng nhập ApiShip thất bại: ${getErrorMessage(error)}`, error?.response?.status || 0)
  }
}

// Gọi 1 API của ApiShip, token hết hạn (401) thì đăng nhập lại và gọi lại 1 lần
const request = async (method: Method, path: string, options: { params?: any, data?: any, timeout?: number } = {}): Promise<any> => {
  const send = async (forceNewToken: boolean) => {
    const token = await getToken(forceNewToken)
    return axios.request({
      method: method,
      url: `${getApiUrl()}${path}`,
      params: options.params,
      data: options.data,
      timeout: options.timeout || 30000,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    })
  }

  try {
    try {
      const response = await send(false)
      return response.data
    } catch (error: any) {
      if(error?.response?.status === 401){
        const response = await send(true)
        return response.data
      }
      throw error
    }
  } catch (error: any) {
    throw new ApishipError(getErrorMessage(error), error?.response?.status || error?.status || 0)
  }
}

// ===== Tên hãng vận chuyển =====
// Lấy danh sách hãng từ ApiShip (GET /lists/providers), lưu trong bộ nhớ 1 ngày
// Lấy không được thì dùng tên có sẵn bên dưới
const defaultProviderNames: { [key: string]: string } = {
  cdek: "СДЭК",
  boxberry: "Boxberry",
  rupost: "Почта России",
  dpd: "DPD",
  x5: "5Post",
  yataxi: "Яндекс Доставка",
  dalli: "Dalli Service",
  pickpoint: "PickPoint",
  pecom: "ПЭК",
  dellin: "Деловые Линии",
  magnit: "Магнит Пост",
  ozon: "Ozon Доставка",
  wb: "WB Track",
  lpost: "Л-Пост",
  dostavista: "Dostavista"
}
let providerCache: { names: { [key: string]: string }, expireAt: number } | null = null

export const getProviderNames = async (): Promise<{ [key: string]: string }> => {
  if(providerCache && providerCache.expireAt > Date.now()){
    return providerCache.names
  }

  const names = { ...defaultProviderNames }
  try {
    const data = await request("GET", "/lists/providers", { params: { limit: 200, offset: 0 }, timeout: 15000 })
    for (const row of data?.rows || []) {
      if(row.key && row.name) names[row.key] = `${row.name}`
    }
    providerCache = { names, expireAt: Date.now() + 24 * 60 * 60 * 1000 }
  } catch (error) {
    console.log("Không lấy được danh sách hãng vận chuyển của ApiShip:", (error as Error).message)
    // Lần sau thử lại sau 10 phút
    providerCache = { names, expireAt: Date.now() + 10 * 60 * 1000 }
  }
  return names
}

export const getProviderName = (names: { [key: string]: string }, key: string): string => {
  return names[key] || defaultProviderNames[key] || key.toUpperCase()
}

// ===== Kiện hàng: khối lượng, kích thước =====
// items: [{ weight (gram / 1 sản phẩm), length, width, height (cm), quantity }]
// - Khối lượng: tổng khối lượng sản phẩm + bao bì (apishipPackagingWeight)
// - Kích thước: thùng nhỏ nhất trong apishipBoxList vừa với tổng thể tích (cộng 15% khoảng trống)
//   và vừa với sản phẩm to nhất; không thùng nào vừa thì tính theo khối lập phương
export type ParcelItem = { weight?: number, length?: number, width?: number, height?: number, quantity: number }

export const getItemWeight = (product: any): number => {
  if(product.grossWeight > 0) return Math.round(product.grossWeight)

  // Chưa nhập khối lượng cả bao bì: tạm tính theo khối lượng tịnh + 10%
  const netWeight = Number(product.netWeight) || 0
  if(netWeight > 0){
    if(product.netWeightUnit === "g" || product.netWeightUnit === "ml") return Math.round(netWeight * 1.1)
    if(product.netWeightUnit === "kg" || product.netWeightUnit === "l") return Math.round(netWeight * 1000 * 1.1)
  }
  return apishipDefaultItemWeight
}

export const getItemSize = (product: any) => {
  if(product.packageLength > 0 && product.packageWidth > 0 && product.packageHeight > 0){
    return {
      length: Number(product.packageLength),
      width: Number(product.packageWidth),
      height: Number(product.packageHeight)
    }
  }
  return { ...apishipDefaultItemSize }
}

export const buildParcel = (items: ParcelItem[]) => {
  let weight = apishipPackagingWeight
  let volume = 0
  let maxSides = [0, 0, 0]

  for (const item of items) {
    const quantity = item.quantity || 0
    const sides = [
      item.length || apishipDefaultItemSize.length,
      item.width || apishipDefaultItemSize.width,
      item.height || apishipDefaultItemSize.height
    ].sort((a, b) => b - a)

    weight += (item.weight || apishipDefaultItemWeight) * quantity
    volume += sides[0] * sides[1] * sides[2] * quantity
    maxSides = maxSides.map((side, index) => Math.max(side, sides[index]))
  }

  const needVolume = volume * 1.15
  const box = apishipBoxList
    .map(box => ({ ...box, sides: [box.length, box.width, box.height].sort((a, b) => b - a) }))
    .sort((a, b) => a.length * a.width * a.height - b.length * b.width * b.height)
    .find(box => box.length * box.width * box.height >= needVolume && box.sides.every((side, index) => side >= maxSides[index]))

  if(box){
    return { weight: Math.ceil(weight), length: box.length, width: box.width, height: box.height }
  }

  const side = Math.ceil(Math.cbrt(needVolume))
  return {
    weight: Math.ceil(weight),
    length: Math.max(side, Math.ceil(maxSides[0])),
    width: Math.max(side, Math.ceil(maxSides[1])),
    height: Math.max(side, Math.ceil(maxSides[2]))
  }
}

// ===== Tính phí giao hàng: POST /calculator =====
// - deliveryType: 1 giao tận cửa, 2 giao tới điểm nhận hàng
// - to: địa chỉ người nhận (city bắt buộc)
// Kết quả: danh sách tariff của các hãng [{ providerKey, tariffId, tariffName, deliveryCost, daysMin, daysMax, pointIds }]
export type CalculatorTariff = {
  providerKey: string,
  tariffId: number,
  tariffName: string,
  deliveryCost: number,
  daysMin: number,
  daysMax: number,
  pointIds: number[]
}

export const calculateDelivery = async (params: {
  deliveryType: number,
  to: { city: string, region?: string, postIndex?: string, addressString?: string },
  parcel: { weight: number, length: number, width: number, height: number },
  assessedCost: number,
  providerKeys?: string[]
}): Promise<CalculatorTariff[]> => {
  const body: any = {
    from: {
      countryCode: apishipSender.countryCode || "RU",
      city: apishipSender.city,
      region: apishipSender.region || undefined,
      index: apishipSender.postIndex || undefined,
      addressString: [apishipSender.city, apishipSender.street, apishipSender.house].filter(Boolean).join(", ") || undefined
    },
    to: {
      countryCode: "RU",
      city: params.to.city,
      region: params.to.region || undefined,
      index: params.to.postIndex || undefined,
      addressString: params.to.addressString || undefined
    },
    places: [params.parcel],
    pickupTypes: [apishipPickupType],
    deliveryTypes: [params.deliveryType],
    assessedCost: params.assessedCost,
    codCost: 0, // khách đã trả trước, không thu tiền khi giao
    includeFees: true, // phí giao hàng gồm cả phí bảo hiểm, phí dịch vụ của hãng
    timeout: 15000
  }
  if(params.providerKeys && params.providerKeys.length > 0){
    body.providerKeys = params.providerKeys
  }

  const data = await request("POST", "/calculator", { data: body, timeout: 40000 })
  const groupList = params.deliveryType === 2 ? data?.deliveryToPoint : data?.deliveryToDoor

  const result: CalculatorTariff[] = []
  for (const group of groupList || []) {
    for (const tariff of group.tariffs || []) {
      const cost = Number(tariff.deliveryCost)
      if(!group.providerKey || !tariff.tariffId || !Number.isFinite(cost) || cost < 0) continue

      result.push({
        providerKey: `${group.providerKey}`,
        tariffId: Number(tariff.tariffId),
        tariffName: `${tariff.tariffName || ""}`,
        deliveryCost: cost,
        daysMin: Number(tariff.daysMin ?? tariff.calendarDaysMin) || 0,
        daysMax: Number(tariff.daysMax ?? tariff.calendarDaysMax) || 0,
        pointIds: Array.isArray(tariff.pointIds) ? tariff.pointIds.map(Number).filter(Number.isFinite) : []
      })
    }
  }
  return result
}

// ===== Điểm nhận hàng (ПВЗ, постамат): GET /lists/points =====
// - ids: lấy theo danh sách id (pointIds của tariff)
// - không có ids: lấy theo thành phố + hãng vận chuyển
// Chỉ lấy điểm có giao hàng cho khách (availableOperation 2 - выдача, 3 - приём и выдача)
export type PickupPoint = {
  id: number,
  providerKey: string,
  code: string,
  name: string,
  address: string,
  city: string,
  timetable: string,
  description: string,
  lat: number | null,
  lng: number | null,
  type: string
}

const formatPoint = (row: any): PickupPoint => {
  const address = row.address
    || [row.postIndex, row.city, [row.streetType, row.street].filter(Boolean).join(" "), row.house, row.block, row.office]
      .filter(Boolean)
      .join(", ")

  const lat = Number(row.lat)
  const lng = Number(row.lng)

  return {
    id: Number(row.id),
    providerKey: `${row.providerKey || ""}`,
    code: `${row.code || ""}`,
    name: `${row.name || ""}`,
    address: `${address || ""}`,
    city: `${row.city || ""}`,
    timetable: `${row.timetable || ""}`,
    description: `${row.description || ""}`.slice(0, 500),
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
    type: `${row.type ?? ""}`
  }
}

// Giá trị trong bộ lọc của ApiShip không được chứa dấu ; = [ ] (ký tự đặc biệt của bộ lọc)
const cleanFilterValue = (value: string): string => {
  return `${value || ""}`.replace(/[;=\[\]]/g, " ").trim()
}

export const getPickupPoints = async (params: { ids?: number[], city?: string, providerKey?: string, limit?: number }): Promise<PickupPoint[]> => {
  const filterList: string[] = []
  if(params.ids && params.ids.length > 0){
    filterList.push(`id=[${params.ids.join(",")}]`)
  }
  else {
    if(params.city) filterList.push(`city=${cleanFilterValue(params.city)}`)
    if(params.providerKey) filterList.push(`providerKey=${cleanFilterValue(params.providerKey)}`)
  }
  filterList.push("availableOperation=[2,3]")

  const data = await request("GET", "/lists/points", {
    params: {
      limit: params.limit || 500,
      offset: 0,
      filter: filterList.join(";")
    },
    timeout: 30000
  })

  return (data?.rows || [])
    .map(formatPoint)
    .filter((point: PickupPoint) => Number.isFinite(point.id))
}

// ===== Vận đơn =====
// Ngày làm việc tiếp theo theo giờ Moscow (bỏ thứ 7, chủ nhật), dạng YYYY-MM-DD
export const getNextPickupDate = (): string => {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000) // giờ Moscow (UTC+3)
  do {
    date.setUTCDate(date.getUTCDate() + 1)
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6)
  return date.toISOString().slice(0, 10)
}

// Số điện thoại cho ApiShip: chỉ chữ số, ví dụ +7 (999) 123-45-67 => 79991234567
const phoneDigits = (phone: string): string => {
  return `${phone || ""}`.replace(/\D/g, "")
}

// Tạo vận đơn cho đơn hàng đã thanh toán: POST /orders
// Khách đã trả trước toàn bộ: không thu tiền khi giao (codCost = 0, giá từng sản phẩm cost = 0),
// assessedCost là giá trị khai báo (bảo hiểm) của hàng
// Kết quả: { orderId } - id đơn trong ApiShip
export const createShipment = async (order: any, pickupDate: string): Promise<{ orderId: number }> => {
  const delivery = order.delivery
  const isPoint = delivery.type === "point"
  const parcel = delivery.parcel
  const goodsValue = Math.max(0, (order.subtotal || 0) - (order.couponDiscount || 0))
  const discountRatio = order.subtotal > 0 ? goodsValue / order.subtotal : 1

  const orderPart: any = {
    clientNumber: order.code,
    description: `Заказ ${order.code}: продукты питания`,
    providerKey: delivery.providerKey,
    pickupType: apishipPickupType,
    deliveryType: isPoint ? 2 : 1,
    tariffId: delivery.tariffId,
    pickupDate: pickupDate,
    weight: parcel.weight,
    length: parcel.length,
    width: parcel.width,
    height: parcel.height
  }
  if(isPoint){
    orderPart.pointOutId = delivery.point.id
  }
  if(apishipPickupType === 2 && apishipPointInIds[delivery.providerKey]){
    orderPart.pointInId = apishipPointInIds[delivery.providerKey]
  }

  const recipient: any = {
    countryCode: "RU",
    region: delivery.region || undefined,
    city: delivery.city,
    contactName: order.customer.fullName,
    phone: phoneDigits(order.customer.phone),
    email: order.customer.email || undefined,
    comment: delivery.comment || undefined
  }
  if(!isPoint){
    recipient.postIndex = delivery.postIndex || undefined
    recipient.street = delivery.street
    recipient.house = delivery.house
    recipient.office = delivery.apartment || undefined
    recipient.addressString = delivery.address || undefined
  }

  const sender: any = {
    countryCode: apishipSender.countryCode || "RU",
    postIndex: apishipSender.postIndex || undefined,
    region: apishipSender.region || undefined,
    city: apishipSender.city,
    street: apishipSender.street || undefined,
    house: apishipSender.house || undefined,
    block: apishipSender.block || undefined,
    office: apishipSender.office || undefined,
    companyName: apishipSender.companyName || undefined,
    contactName: apishipSender.contactName || undefined,
    phone: phoneDigits(apishipSender.phone) || undefined,
    email: apishipSender.email || undefined
  }

  const body = {
    order: orderPart,
    cost: {
      assessedCost: Math.round(goodsValue * 100) / 100,
      codCost: 0,
      deliveryCost: 0,
      isDeliveryPayedByRecipient: false
    },
    sender: sender,
    recipient: recipient,
    places: [
      {
        placeNumber: "1",
        weight: parcel.weight,
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
        items: order.items.map((item: any) => ({
          articul: item.sku || item.productId,
          barcode: item.barcode || undefined,
          description: `${item.nameRu || item.name}`.slice(0, 250),
          quantity: item.quantity,
          weight: item.weight,
          length: item.length,
          width: item.width,
          height: item.height,
          assessedCost: Math.round(item.price * discountRatio * 100) / 100,
          cost: 0
        }))
      }
    ]
  }

  const data = await request("POST", "/orders", { data: body, timeout: 60000 })
  const orderId = Number(data?.orderId)
  if(!orderId){
    throw new ApishipError("ApiShip không trả về id vận đơn")
  }
  return { orderId }
}

// Trạng thái 1 vận đơn: GET /orders/{orderId}/status
// => { orderInfo: { providerNumber, trackingUrl,... }, status: { key, name, description, created, errorCode } }
export const getShipmentStatus = async (apishipOrderId: number): Promise<any> => {
  return await request("GET", `/orders/${apishipOrderId}/status`, { timeout: 30000 })
}

// Trạng thái nhiều vận đơn: POST /orders/statuses { orderIds }
// => { succeedOrders: [{ orderInfo, status }], failedOrders: [{ orderId, message }] }
export const getShipmentStatuses = async (apishipOrderIds: number[]): Promise<any> => {
  return await request("POST", "/orders/statuses", { data: { orderIds: apishipOrderIds }, timeout: 60000 })
}

// Phiếu gửi hàng (накладная) để in và dán lên kiện hàng: POST /orders/waybills { orderIds }
// => { waybillItems: [{ providerKey, file, orderIds }], failedOrders: [{ orderId, message }] }
export const getWaybills = async (apishipOrderIds: number[]): Promise<any> => {
  return await request("POST", "/orders/waybills", { data: { orderIds: apishipOrderIds }, timeout: 60000 })
}

// Huỷ vận đơn (chỉ huỷ được khi hãng vận chuyển chưa nhận hàng): GET /orders/{orderId}/cancel
export const cancelShipment = async (apishipOrderId: number): Promise<any> => {
  return await request("GET", `/orders/${apishipOrderId}/cancel`, { timeout: 30000 })
}
