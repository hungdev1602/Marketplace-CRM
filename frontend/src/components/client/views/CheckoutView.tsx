"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { getJson, sendJson } from "@/lib/api-client"
import { cx, formatNumber, formatPrice } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { goTo, reloadPage } from "@/lib/top-loader"
import { mediaSrcSet, mediaUrl } from "@/lib/view-ctx"
import { FormField } from "../AccountForm"
import { useShop } from "../ShopProvider"

// ===== Trang đặt hàng (/checkout) =====
// 1. Khách chọn giao tận cửa / giao tới điểm nhận hàng, nhập địa chỉ, bấm "Рассчитать доставку"
//    => server hỏi ApiShip giá của các hãng vận chuyển (POST /checkout/delivery), hiện danh sách để chọn
// 2. Giao tới điểm nhận hàng: chọn hãng xong thì tải danh sách điểm nhận hàng của hãng (GET /checkout/points),
//    khách chọn trong danh sách hoặc trên bản đồ
// 3. Bấm "Перейти к оплате": gửi đơn hàng (POST /checkout), server trả về link trang thanh toán Т-Банк
// Giá giao hàng không gửi từ trình duyệt lên: server lưu kết quả tính phí (quoteId), khách chỉ gửi số thứ tự hãng đã chọn
// Dữ liệu: server/controller/client/checkout.controller.ts

type Message = { text: string, type: "error" | "warning" | "info" } | null
type Option = { index: number, providerName: string, tariffName: string, cost: number, costFormat: string, daysText?: string }
type Point = { id: number | string, address: string, name?: string, code?: string, timetable?: string, lat?: number, lng?: number }

const addressNames = ["city", "region", "postIndex", "street", "house"]
const deliveryFieldNames = ["quoteId", "optionIndex", "pointId"]

const hasCoords = (point: Point) => typeof point.lat === "number" && typeof point.lng === "number"

// Điểm trên bản đồ: chấm xanh (màu logo), điểm đang chọn to hơn, màu vàng
const markerStyle = (isSelected: boolean) => isSelected
  ? { radius: 11, color: "#111417", weight: 3, fillColor: "#FFC53D", fillOpacity: 1 }
  : { radius: 7, color: "#111417", weight: 2, fillColor: "#02CAE5", fillOpacity: 1 }

// Thư viện bản đồ Leaflet (public/client/assets/libs/leaflet) chỉ tải khi cần
// (lần đầu có điểm nhận hàng có toạ độ), trang đặt hàng mở nhanh hơn
let leafletPromise: Promise<any> | null = null
const loadLeaflet = (): Promise<any> => {
  const browser = window as any
  if(browser.L) return Promise.resolve(browser.L)
  if(!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link")
      css.rel = "stylesheet"
      css.href = "/client/assets/libs/leaflet/leaflet.css"
      document.head.append(css)

      const script = document.createElement("script")
      script.src = "/client/assets/libs/leaflet/leaflet.js"
      script.onload = () => resolve(browser.L)
      script.onerror = () => {
        leafletPromise = null
        reject(new Error("Leaflet"))
      }
      document.head.append(script)
    })
  }
  return leafletPromise
}

export function CheckoutView({ data }: { data: any }) {
  const { ctx } = useShop()
  const lang = ctx.lang
  const { t, tName, tCount } = useMemo(() => createTranslator(lang), [lang])
  const errorText = t("errorGeneral")

  const view = data.cartView
  const coupon = view.coupon
  const couponOk = coupon && !coupon.errorKey
  const prefill = data.prefill || {}
  const canOrder = Boolean(data.canOrder)
  const belowMinOrder = Boolean(data.belowMinOrder)
  const goodsTotal: number = Number(view.total) || 0
  const mapTiles: string = data.mapTileUrl || ""
  const mapAttribution: string = data.mapAttribution || ""

  const formRef = useRef<HTMLFormElement>(null)
  const calcButtonRef = useRef<HTMLButtonElement>(null)
  const pointsBoxRef = useRef<HTMLDivElement>(null)
  const pointListRef = useRef<HTMLUListElement>(null)
  const mapCanvasRef = useRef<HTMLDivElement>(null)

  const [deliveryType, setDeliveryType] = useState<string>(prefill.deliveryType || "point")
  const [quoteId, setQuoteId] = useState("")
  const [options, setOptions] = useState<Option[]>([])
  const [optionIndex, setOptionIndex] = useState<number | null>(null)
  const [points, setPoints] = useState<Point[] | null>(null) // null: chưa tải / không cần điểm nhận hàng
  const [pointId, setPointId] = useState("")
  const [pointSearch, setPointSearch] = useState("")
  const [pointStatus, setPointStatus] = useState("") // "Загрузка…" hoặc lời báo lỗi khi tải điểm
  const [isSelectedFirst, setIsSelectedFirst] = useState(false) // vừa chọn trên bản đồ: đưa điểm đang chọn lên đầu danh sách
  const [userLatLng, setUserLatLng] = useState<[number, number] | null>(null)
  const [isMapShown, setIsMapShown] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState<Message>(null)
  const [formMessage, setFormMessage] = useState<Message>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Giá trị mới nhất để dùng trong các hàm chạy sau (đợi server) và trong các hàm của bản đồ
  const calcRequestId = useRef(0)
  const pointsRequestId = useRef(0)
  const mapRequestId = useRef(0)
  const stateRef = useRef({ deliveryType, quoteId, pointId, points, userLatLng, pointSearch })
  stateRef.current = { deliveryType, quoteId, pointId, points, userLatLng, pointSearch }

  // Bản đồ (Leaflet)
  const mapRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const markerByIdRef = useRef<{ [id: string]: any }>({})
  const userMarkerRef = useRef<any>(null)

  const selectedOption = options.find(item => item.index === optionIndex) || null
  // Phí giao hàng ở khung bên phải: null là chưa chọn hãng
  const deliveryCost: number | null = selectedOption ? selectedOption.cost : null
  const total = Math.round((goodsTotal + (deliveryCost || 0)) * 100) / 100
  const isCourier = deliveryType === "courier"

  const clearInvalid = () => {
    formRef.current?.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"))
  }

  const markInvalid = (name: string) => {
    if(deliveryFieldNames.includes(name)) {
      // Chưa chọn hãng / điểm nhận hàng: cuộn tới phần giao hàng
      const target = name === "pointId" && stateRef.current.points ? pointsBoxRef.current : calcButtonRef.current
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    const input = formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)
    if(!input) return
    input.setAttribute("aria-invalid", "true")
    input.focus()
  }

  const getValue = (name: string): string => {
    const input = formRef.current?.elements.namedItem(name) as HTMLInputElement | null
    return input ? input.value : ""
  }

  const clearPointMarkers = () => {
    mapRequestId.current++
    markerLayerRef.current?.clearLayers()
    markerByIdRef.current = {}
  }

  // Bỏ kết quả tính phí cũ (đổi cách giao hàng, đổi địa chỉ)
  const resetDelivery = (message: string = "") => {
    calcRequestId.current++
    pointsRequestId.current++
    setQuoteId("")
    setOptions([])
    setOptionIndex(null)
    setPoints(null)
    setPointId("")
    setPointStatus("")
    clearPointMarkers()
    setIsCalculating(false)
    setDeliveryMessage(message ? { text: message, type: "warning" } : null)
  }

  // --- Điểm nhận hàng ---
  const loadPoints = async (currentQuoteId: string, index: number) => {
    const requestId = ++pointsRequestId.current
    setPoints([])
    setPointSearch("")
    setPointStatus(t("loading"))
    setIsSelectedFirst(false)
    clearPointMarkers()

    let result: any
    try {
      result = await getJson(`/checkout/points?quoteId=${encodeURIComponent(currentQuoteId)}&option=${index}`)
    } catch {
      result = { code: "error", message: errorText }
    }
    if(requestId !== pointsRequestId.current) return

    if(result.code !== "success") {
      setPointStatus(result.message || errorText)
      return
    }

    setPointStatus("")
    fitNextRender.current = true
    setPoints(result.points || [])
  }

  // Khách chọn 1 hãng vận chuyển
  const selectOption = (index: number, currentQuoteId: string, currentType: string) => {
    setOptionIndex(index)
    setPointId("")
    setFormMessage(null)
    if(currentType === "point") {
      loadPoints(currentQuoteId, index)
    }
    else {
      setPoints(null)
    }
  }

  // --- Tính phí giao hàng ---
  const calculateDelivery = async (type: string = stateRef.current.deliveryType) => {
    const requestId = ++calcRequestId.current
    clearInvalid()
    setDeliveryMessage({ text: t("loading"), type: "info" })
    setOptions([])
    setOptionIndex(null)
    setPoints(null)
    setIsCalculating(true)

    const body: { [name: string]: string } = { deliveryType: type }
    addressNames.forEach(name => { body[name] = getValue(name) })

    const result = await sendJson("/checkout/delivery", "POST", body, errorText)
    if(requestId !== calcRequestId.current) return
    setIsCalculating(false)

    if(result.code !== "success") {
      resetDelivery()
      setDeliveryMessage({ text: result.message || errorText, type: "error" })
      if(result.field) markInvalid(result.field)
      if(result.reload) setTimeout(reloadPage, 2000)
      return
    }

    setDeliveryMessage(null)
    setQuoteId(result.quoteId)
    const optionList: Option[] = result.options || []
    setOptions(optionList)
    // Chọn sẵn hãng rẻ nhất (khách đổi được)
    if(optionList.length > 0) {
      selectOption(optionList[0].index, result.quoteId, type)
    }
  }

  // Đã có địa chỉ (khách đặt hàng lần trước): tính phí luôn khi mở trang
  useEffect(() => {
    if(canOrder && getValue("city").trim().length >= 2) {
      calculateDelivery()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Khoảng cách gần đúng (km) từ vị trí của khách tới 1 điểm, để xếp điểm gần trước
  const distanceTo = useCallback((point: Point): number => {
    if(!userLatLng || !hasCoords(point)) return Infinity
    const toRad = Math.PI / 180
    const x = ((point.lng as number) - userLatLng[1]) * toRad * Math.cos(((point.lat as number) + userLatLng[0]) / 2 * toRad)
    const y = ((point.lat as number) - userLatLng[0]) * toRad
    return Math.sqrt(x * x + y * y) * 6371
  }, [userLatLng])

  // Điểm đang hiện: lọc theo từ khoá tìm kiếm, khách đã bấm "Рядом со мной" thì xếp điểm gần trước
  const visiblePoints = useMemo(() => {
    if(!points) return []
    const keyword = pointSearch.trim().toLowerCase()
    const list = keyword
      ? points.filter(point => `${point.address} ${point.name} ${point.code}`.toLowerCase().includes(keyword))
      : [...points]
    if(userLatLng) list.sort((a, b) => distanceTo(a) - distanceTo(b))
    return list
  }, [points, pointSearch, userLatLng, distanceTo])

  // Danh sách: hiện tối đa 100 điểm (thành phố lớn có hàng trăm điểm), khách gõ địa chỉ để tìm hoặc chọn trên bản đồ
  const shownPoints = useMemo(() => {
    let list = visiblePoints
    if(isSelectedFirst && pointId) {
      const selected = list.find(point => `${point.id}` === pointId)
      if(selected) list = [selected, ...list.filter(point => point !== selected)]
    }
    return list.slice(0, 100)
  }, [visiblePoints, isSelectedFirst, pointId])

  // Khách chọn 1 điểm (source: "list" - bấm trong danh sách, "map" - bấm trên bản đồ)
  const selectPoint = useCallback((id: string | number, source: "list" | "map") => {
    const newId = `${id}`
    const previousMarker = markerByIdRef.current[stateRef.current.pointId]
    if(previousMarker) previousMarker.setStyle(markerStyle(false))

    stateRef.current.pointId = newId
    setPointId(newId)
    setFormMessage(null)

    const marker = markerByIdRef.current[newId]
    if(marker) {
      marker.setStyle(markerStyle(true))
      marker.bringToFront()
      if(source === "list" && mapRef.current) {
        mapRef.current.setView(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 15))
      }
      marker.openPopup()
    }

    // Chọn trên bản đồ: đưa điểm lên đầu danh sách và tick chọn
    setIsSelectedFirst(source === "map")
    if(source === "map" && pointListRef.current) pointListRef.current.scrollTop = 0
  }, [])

  // --- Bản đồ điểm nhận hàng (thư viện Leaflet, bản đồ OpenStreetMap) ---
  // ApiShip không có toạ độ của điểm nào thì ẩn bản đồ, khách chọn trong danh sách
  const fitNextRender = useRef(false) // phóng bản đồ vừa các điểm đang hiện (lần đầu tải điểm, khi gõ tìm kiếm)
  const selectedText = t("selected")

  useEffect(() => {
    const allPoints = points || []
    const fit = fitNextRender.current
    fitNextRender.current = false
    const requestId = ++mapRequestId.current

    if(!mapTiles || !allPoints.some(hasCoords)) {
      setIsMapShown(false)
      return
    }

    const buildPopup = (point: Point) => {
      const box = document.createElement("div")
      box.className = "sf-map-popup"
      const address = document.createElement("b")
      address.textContent = point.address
      box.append(address)
      if(point.name && point.name !== point.address) {
        const name = document.createElement("small")
        name.textContent = point.name
        box.append(name)
      }
      if(point.timetable) {
        const timetable = document.createElement("small")
        timetable.textContent = point.timetable
        box.append(timetable)
      }
      const selected = document.createElement("span")
      selected.className = "sf-map-popup-selected"
      selected.textContent = `✓ ${selectedText}`
      box.append(selected)
      return box
    }

    loadLeaflet().then((L) => {
      if(requestId !== mapRequestId.current || !mapCanvasRef.current) return

      // Hiện khung bản đồ trước khi tạo bản đồ (Leaflet cần biết kích thước khung)
      setIsMapShown(true)
      mapCanvasRef.current.parentElement?.removeAttribute("hidden")

      const located = visiblePoints.filter(hasCoords)
      let map = mapRef.current
      if(!map) {
        map = L.map(mapCanvasRef.current, {
          preferCanvas: true, // vẽ hàng trăm điểm nhanh hơn
          scrollWheelZoom: false
        })
        mapRef.current = map
        // Dòng ghi nguồn bản đồ: chỉ chữ "Leaflet" (bỏ biểu tượng cờ mặc định của thư viện)
        map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>')
        L.tileLayer(mapTiles, { maxZoom: 19, attribution: mapAttribution }).addTo(map)
        markerLayerRef.current = L.layerGroup().addTo(map)
        // Lăn chuột chỉ phóng to / thu nhỏ bản đồ sau khi khách bấm vào bản đồ (không cản trở cuộn trang)
        map.on("click focus", () => map.scrollWheelZoom.enable())
        map.on("blur mouseout", () => map.scrollWheelZoom.disable())
        const allLocated = allPoints.filter(hasCoords)
        map.fitBounds(L.latLngBounds(allLocated.map(point => [point.lat, point.lng])), { padding: [24, 24], maxZoom: 15 })
      }

      map.invalidateSize()
      markerLayerRef.current.clearLayers()
      markerByIdRef.current = {}
      const currentPointId = stateRef.current.pointId
      located.forEach((point) => {
        const marker = L.circleMarker([point.lat, point.lng], markerStyle(currentPointId === `${point.id}`))
        marker.bindPopup(() => buildPopup(point), { closeButton: false })
        marker.on("click", () => selectPoint(point.id, "map"))
        markerLayerRef.current.addLayer(marker)
        markerByIdRef.current[`${point.id}`] = marker
      })
      const selectedMarker = markerByIdRef.current[currentPointId]
      if(selectedMarker) selectedMarker.bringToFront()
      if(fit && located.length > 0) {
        map.fitBounds(L.latLngBounds(located.map(point => [point.lat, point.lng])), { padding: [24, 24], maxZoom: 15 })
      }
    }).catch(() => {
      setIsMapShown(false)
    })
  }, [points, visiblePoints, mapTiles, mapAttribution, selectPoint, selectedText])

  // Rời trang thì bỏ bản đồ
  useEffect(() => {
    const requestIdRef = mapRequestId
    return () => {
      requestIdRef.current++
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  // Nút "Рядом со мной": lấy vị trí của khách (trình duyệt hỏi khách cho phép), xếp điểm gần trước
  const handleLocate = () => {
    const L = (window as any).L
    const map = mapRef.current
    if(!navigator.geolocation || !map || !L) {
      setDeliveryMessage({ text: t("mapNoLocation"), type: "warning" })
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition((position) => {
      setIsLocating(false)
      setDeliveryMessage(null)
      const latLng: [number, number] = [position.coords.latitude, position.coords.longitude]
      if(userMarkerRef.current) {
        userMarkerRef.current.setLatLng(latLng)
      }
      else {
        userMarkerRef.current = L.circleMarker(latLng, { radius: 8, color: "#FFFFFF", weight: 3, fillColor: "#2F80ED", fillOpacity: 1, interactive: false }).addTo(map)
      }
      map.setView(latLng, 14)
      setUserLatLng(latLng)
      setIsSelectedFirst(false)
      if(pointListRef.current) pointListRef.current.scrollTop = 0
    }, () => {
      setIsLocating(false)
      setDeliveryMessage({ text: t("mapNoLocation"), type: "warning" })
    }, { timeout: 10000, maximumAge: 10 * 60 * 1000 })
  }

  // --- Sự kiện của form ---
  const handleTypeChange = (type: string) => {
    setDeliveryType(type)
    stateRef.current.deliveryType = type
    resetDelivery()
    if(getValue("city").trim().length >= 2) calculateDelivery(type)
  }

  const handleInput = (event: React.FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement
    target.removeAttribute("aria-invalid")
    // Đổi địa chỉ sau khi đã tính phí: phải tính lại (phí phụ thuộc địa chỉ)
    if(addressNames.includes(target.name) && stateRef.current.quoteId) {
      resetDelivery(t("deliveryAddressChanged"))
    }
  }

  // Enter trong ô địa chỉ: tính phí giao hàng (không gửi đơn hàng)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if(event.key !== "Enter") return
    const target = event.target as HTMLInputElement
    if(addressNames.includes(target.name)) {
      event.preventDefault()
      calculateDelivery()
    }
    else if(target.type === "search") {
      event.preventDefault()
    }
  }

  // --- Đặt hàng ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearInvalid()
    setFormMessage(null)

    const body: { [name: string]: any } = Object.fromEntries(new FormData(event.currentTarget))
    delete body.deliveryOption
    delete body.deliveryPoint
    delete body.pointSearch
    body.quoteId = quoteId
    body.optionIndex = optionIndex === null ? "" : `${optionIndex}`
    body.pointId = pointId

    setIsSubmitting(true)
    const result = await sendJson("/checkout", "POST", body, errorText)

    if(result.code === "success" && result.redirect) {
      // Giữ nút bị khoá trong lúc chuyển sang trang thanh toán để khách không bấm 2 lần
      goTo(result.redirect)
      return
    }

    setIsSubmitting(false)
    setFormMessage({ text: result.message || errorText, type: "error" })
    if(result.field) markInvalid(result.field)
    if(result.recalc) resetDelivery(result.message)
    if(result.reload) setTimeout(reloadPage, 2500)
  }

  const messageElement = (message: Message) => (
    <p className={cx("sf-form-message", message && `is-${message.type}`)} role="alert" hidden={!message?.text}>
      {message?.text}
    </p>
  )

  const pointCountText = pointStatus
    ? pointStatus
    : visiblePoints.length === 0
      ? t("pointNotFound")
      : `${t("pointCount")} ${visiblePoints.length}` + (visiblePoints.length > 100 ? `. ${t("pointMore")}` : "")

  return (
    <>
      {!canOrder ? (
        // Chưa cấu hình thanh toán / vận chuyển ở trang admin
        <div className="sf-guest-note sf-checkout-alert" role="alert">
          <i className="fas fa-exclamation-circle"></i>
          <div>
            <p><b>{t("checkoutUnavailable")}</b></p>
          </div>
        </div>
      ) : belowMinOrder ? (
        <div className="sf-guest-note sf-checkout-alert" role="alert">
          <i className="fas fa-exclamation-circle"></i>
          <div>
            <p>
              <b>{t("minOrderText")} {formatPrice(data.minOrderValue)}.</b>{" "}
              {t("couponAddMore")} {formatPrice(data.minOrderValue - view.total)}
            </p>
            <div className="sf-guest-note-buttons">
              <Link href="/cart" className="sf-btn sf-btn-dark sf-btn-sm">{t("backToCart")}</Link>
            </div>
          </div>
        </div>
      ) : null}

      <form
        ref={formRef}
        action="/checkout"
        className="sf-checkout-form"
        noValidate
        onSubmit={handleSubmit}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      >
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="sf-account-box sf-checkout-box">
              <h2>
                <span className="sf-step-num">1</span>
                {t("checkoutContact")}
              </h2>
              {!ctx.clientAccount && (
                <p className="sf-checkout-login">
                  {t("checkoutLoginHint")}{" "}
                  <Link href="/account/login?next=%2Fcheckout">{t("loginAction")}</Link>
                </p>
              )}
              <div className="row g-3">
                <div className="col-md-6">
                  <FormField lang={lang} name="fullName" label={t("recipientName")} type="text" defaultValue={prefill.fullName} autoComplete="name" maxLength={100} hint={t("recipientNameHint")} />
                </div>
                <div className="col-md-6">
                  <FormField lang={lang} name="phone" label={t("phone")} type="tel" defaultValue={prefill.phone} autoComplete="tel" inputMode="tel" maxLength={20} hint={t("phoneDeliveryHint")} />
                </div>
                <div className="col-12">
                  <FormField lang={lang} name="email" label={t("email")} type="email" defaultValue={prefill.email} autoComplete="email" inputMode="email" maxLength={100} hint={t("checkoutEmailHint")} />
                </div>
              </div>
            </div>

            <div className="sf-account-box sf-checkout-box">
              <h2>
                <span className="sf-step-num">2</span>
                {t("delivery")}
              </h2>
              <div className="sf-delivery-types" role="radiogroup" aria-label={t("deliveryMethod")}>
                {(data.deliveryTypeList || []).map((type: any) => (
                  <label className="sf-choice" key={type.id}>
                    <input
                      type="radio"
                      name="deliveryType"
                      value={type.id}
                      checked={deliveryType == type.id}
                      onChange={() => handleTypeChange(type.id)}
                    />
                    <span className="sf-choice-box">
                      <i className={type.id == "point" ? "fas fa-store" : "fas fa-truck"}></i>
                      <span>
                        <b>{tName(type)}</b>
                        <small>{t(type.id == "point" ? "deliveryPointHint" : "deliveryCourierHint")}</small>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="row g-3">
                <div className="col-md-7">
                  <FormField lang={lang} name="city" label={t("city")} type="text" defaultValue={prefill.city} autoComplete="address-level2" maxLength={100} hint={t("cityHint")} />
                </div>
                <div className="col-md-5">
                  <FormField lang={lang} name="region" label={t("region")} type="text" defaultValue={prefill.region} autoComplete="address-level1" maxLength={100} optional />
                </div>
              </div>
              {/* Giao tận cửa mới cần mã bưu chính, đường, số nhà, ghi chú cho người giao hàng */}
              <div className="sf-courier-fields" hidden={!isCourier}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <FormField lang={lang} name="postIndex" label={t("postIndex")} type="text" defaultValue={prefill.postIndex} autoComplete="postal-code" inputMode="numeric" maxLength={6} />
                  </div>
                  <div className="col-md-8">
                    <FormField lang={lang} name="street" label={t("street")} type="text" defaultValue={prefill.street} autoComplete="address-line1" maxLength={150} />
                  </div>
                  <div className="col-6 col-md-4">
                    <FormField lang={lang} name="house" label={t("house")} type="text" defaultValue={prefill.house} maxLength={30} />
                  </div>
                  <div className="col-6 col-md-4">
                    <FormField lang={lang} name="apartment" label={t("apartment")} type="text" defaultValue={prefill.apartment} autoComplete="address-line2" maxLength={30} optional />
                  </div>
                </div>
              </div>
              <button
                type="button"
                ref={calcButtonRef}
                className="sf-btn sf-btn-dark sf-delivery-calc"
                disabled={!canOrder || isCalculating}
                onClick={() => calculateDelivery()}
              >
                <i className="fas fa-calculator"></i>
                <span>{t("deliveryCalc")}</span>
              </button>
              {messageElement(deliveryMessage)}

              {/* Các hãng vận chuyển kèm giá, thời gian giao */}
              <div className="sf-delivery-options" hidden={options.length === 0}>
                <h3>{t("deliveryChooseTitle")}</h3>
                <div className="sf-option-list" role="radiogroup" aria-label={t("deliveryChooseTitle")}>
                  {options.map(option => (
                    <label className="sf-option" key={option.index}>
                      <input
                        type="radio"
                        name="deliveryOption"
                        value={option.index}
                        checked={optionIndex === option.index}
                        onChange={() => selectOption(option.index, quoteId, deliveryType)}
                      />
                      <span className="sf-option-box">
                        <span className="sf-option-main">
                          <b>{option.providerName}</b>
                          <small>{option.tariffName}</small>
                        </span>
                        <span className="sf-option-side">
                          <b className={option.cost === 0 ? "sf-free" : undefined}>{option.costFormat}</b>
                          {option.daysText && <small>{option.daysText}</small>}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Điểm nhận hàng: bản đồ + danh sách */}
              <div className="sf-delivery-points" ref={pointsBoxRef} hidden={points === null}>
                <h3>{t("pointChooseTitle")}</h3>
                <p className="sf-point-hint">{t("pointMapHint")}</p>
                <div className="sf-points-layout">
                  <div className="sf-point-map" hidden={!isMapShown}>
                    <div ref={mapCanvasRef} className="sf-point-map-canvas" role="application" aria-label={t("pointMap")}></div>
                    <button type="button" className="sf-map-locate" title={t("mapNearMe")} disabled={isLocating} onClick={handleLocate}>
                      <i className="fas fa-location-arrow"></i>
                      <span>{t("mapNearMe")}</span>
                    </button>
                  </div>
                  <div className="sf-point-side">
                    <div className="sf-point-search">
                      <i className="fas fa-search"></i>
                      <input
                        type="search"
                        name="pointSearch"
                        placeholder={t("pointSearch")}
                        aria-label={t("pointSearch")}
                        autoComplete="off"
                        value={pointSearch}
                        onChange={event => {
                          // Gõ tìm điểm nhận hàng: lọc danh sách và điểm trên bản đồ, phóng bản đồ vừa các điểm tìm được
                          fitNextRender.current = true
                          setIsSelectedFirst(false)
                          setPointSearch(event.target.value)
                        }}
                      />
                    </div>
                    <p className="sf-point-count">{pointCountText}</p>
                    <ul ref={pointListRef} className="sf-point-list" role="radiogroup" aria-label={t("pointChooseTitle")}>
                      {shownPoints.map(point => {
                        const distance = distanceTo(point)
                        return (
                          <li key={point.id}>
                            <label className="sf-point">
                              <input
                                type="radio"
                                name="deliveryPoint"
                                value={point.id}
                                checked={pointId === `${point.id}`}
                                onChange={() => selectPoint(point.id, "list")}
                              />
                              <span className="sf-point-box">
                                <b>{point.address}</b>
                                {point.name && point.name !== point.address && <small>{point.name}</small>}
                                {point.timetable && <small className="sf-point-time">{point.timetable}</small>}
                                {Number.isFinite(distance) && (
                                  <small className="sf-point-distance">
                                    {distance < 1 ? `${Math.round(distance * 1000)} м` : `${distance.toFixed(1).replace(".", ",")} км`}
                                  </small>
                                )}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="sf-field sf-comment-field" hidden={!isCourier}>
                <label htmlFor="field-comment">
                  {t("deliveryComment")}
                  <span className="sf-field-optional">{t("optional")}</span>
                </label>
                <textarea id="field-comment" name="comment" rows={2} maxLength={500} placeholder={t("deliveryCommentPlaceholder")}></textarea>
              </div>
              {view.hasColdItems && (
                <p className="sf-cold-note">
                  <i className="fas fa-snowflake"></i>
                  {t("coldChainNote")}
                </p>
              )}
            </div>

            <div className="sf-account-box sf-checkout-box">
              <h2>
                <span className="sf-step-num">3</span>
                {t("paymentTitle")}
              </h2>
              <div className="sf-pay-method">
                <i className="far fa-credit-card"></i>
                <div>
                  <b>{t("paymentOnline")}</b>
                  <p>{t("paymentOnlineText")}</p>
                </div>
              </div>
              <p className="sf-pay-note">
                <i className="fas fa-info-circle"></i>
                {t("paymentPrepayNote")} {tCount(data.paymentTimeoutMinutes, "minuteCount")}.
              </p>
              {data.paymentProvider == "test" && (
                <p className="sf-test-note">
                  <i className="fas fa-flask"></i>
                  {t("paymentTestModeNote")}
                </p>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <aside className="sf-cart-summary sf-checkout-summary">
              <h2>{t("orderSummary")}</h2>
              <ul className="sf-checkout-items">
                {view.itemList.map((item: any) => (
                  <li key={item.product.id}>
                    <span className="sf-checkout-item-img">
                      <img src={mediaUrl(ctx, item.product.cardImage, 160)} srcSet={mediaSrcSet(ctx, item.product.cardImage, 160)} alt="" loading="lazy" />
                      <span className="sf-checkout-item-qty">{item.quantity}</span>
                    </span>
                    <span className="sf-checkout-item-name">{tName(item.product)}</span>
                    <b>{formatPrice(item.lineTotal)}</b>
                  </li>
                ))}
              </ul>
              {view.unavailableList.length > 0 && (
                <p className="sf-checkout-unavailable">
                  <i className="fas fa-exclamation-circle"></i>
                  {t("checkoutUnavailableItems")}
                </p>
              )}
              <dl className="sf-summary-list">
                <div>
                  <dt>{t("itemsTotal")} ({formatNumber(view.totalQuantity)})</dt>
                  <dd>{formatPrice(view.oldSubtotal)}</dd>
                </div>
                {view.productDiscount > 0 && (
                  <div className="is-discount">
                    <dt>{t("productDiscount")}</dt>
                    <dd>−{formatPrice(view.productDiscount)}</dd>
                  </div>
                )}
                {couponOk && view.couponDiscount > 0 && (
                  <div className="is-discount">
                    <dt>{t("coupon")} {coupon.code}</dt>
                    <dd>−{formatPrice(view.couponDiscount)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t("delivery")}</dt>
                  <dd>
                    {deliveryCost === null ? (
                      data.freeDelivery
                        ? <span className="sf-free">{t("free")}</span>
                        : <span className="sf-muted">{t("deliveryNotChosen")}</span>
                    ) : deliveryCost === 0 ? (
                      <span className="sf-free">{t("free")}</span>
                    ) : (
                      <span>{formatPrice(deliveryCost)}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="sf-summary-total">
                <span>{t("total")}</span>
                <b>{formatPrice(total)}</b>
              </div>
              {coupon && !couponOk && (
                <p className="sf-checkout-coupon-warning">
                  <i className="fas fa-ticket-alt"></i>
                  {t("couponNotApplied")} ({coupon.code})
                </p>
              )}
              {data.freeDelivery ? (
                <p className="sf-checkout-free">
                  <i className="fas fa-gift"></i>
                  {t("freeDeliveryApplied")}
                </p>
              ) : data.freeDeliveryFrom > 0 ? (
                <p className="sf-checkout-free is-muted">
                  <i className="fas fa-gift"></i>
                  {t("freeDeliveryFrom")} {formatPrice(data.freeDeliveryFrom)}
                </p>
              ) : null}
              <div className="form-check sf-check sf-checkout-agree">
                <input className="form-check-input" type="checkbox" id="field-agree" name="agree" />
                <label className="form-check-label" htmlFor="field-agree">{t("checkoutAgree")}</label>
              </div>
              {messageElement(formMessage)}
              <button type="submit" className="sf-btn sf-btn-primary sf-checkout-btn" disabled={!canOrder || belowMinOrder || isSubmitting}>
                <i className="fas fa-lock"></i>
                <span>{t("goToPayment")}</span>
              </button>
              <p className="sf-checkout-note">{t("checkoutPayNote")}</p>
              <Link href="/cart" className="sf-continue">
                <i className="fas fa-arrow-left"></i>
                {t("backToCart")}
              </Link>
            </aside>
          </div>
        </div>
      </form>
    </>
  )
}
