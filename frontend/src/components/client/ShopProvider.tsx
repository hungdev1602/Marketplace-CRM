"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { sendJson, type ApiResult } from "@/lib/api-client"
import { createTranslator } from "@/lib/i18n"
import type { ViewCtx } from "@/lib/view-ctx"
import { useToast } from "./Toast"

// ===== Giỏ hàng, yêu thích, so sánh của khách trên trang đang xem =====
// Server gửi kèm mỗi trang: số lượng từng sản phẩm trong giỏ (cartQuantityMap), sản phẩm yêu thích (wishlistMap),
// sản phẩm đang so sánh (compareMap).
// Khách bấm "В корзину", + −, ♡, "Сравнить" thì gửi lên server Express (/cart/add, /cart/update, /wishlist/toggle,
// /compare/toggle) rồi cập nhật lại số trên biểu tượng ở đầu trang và tất cả thẻ của sản phẩm đó trên trang.

export type ShopInitial = {
  cartQuantity: number
  cartQuantityMap: { [productId: string]: number }
  wishlistCount: number
  wishlistMap: { [productId: string]: boolean }
  compareCount: number
  compareMap: { [productId: string]: boolean }
}

type ShopState = ShopInitial & {
  // Số lượng tối đa đặt được của từng sản phẩm (server trả về sau mỗi lần đổi số lượng)
  maxQuantityMap: { [productId: string]: number }
  syncKey: string
}

type ShopContextValue = {
  ctx: ViewCtx
  t: (key: string) => string
  errorText: string
  state: ShopState
  cartVersion: number // tăng lên sau mỗi lần giỏ hàng thay đổi (trang giỏ hàng dựa vào đây để tải lại)
  notifyCartChanged: () => void
  setCartQuantity: (count: number) => void
  setProductQuantity: (productId: string, quantity: number, maxQuantity?: number) => void
  addToCart: (productId: string) => Promise<ApiResult>
  changeQuantity: (productId: string, quantity: number) => void
  toggleWishlist: (productId: string) => Promise<ApiResult>
  setWishlistCount: (count: number) => void
  toggleCompare: (productId: string) => Promise<ApiResult>
  setCompareCount: (count: number) => void
  request: (path: string, method?: string, data?: any) => Promise<ApiResult>
  // Menu trên điện thoại (bấm nút ☰ ở đầu trang)
  isMobileMenuOpen: boolean
  setMobileMenuOpen: (isOpen: boolean) => void
}

const ShopContext = createContext<ShopContextValue | null>(null)

export const useShop = (): ShopContextValue => {
  const value = useContext(ShopContext)
  if(!value) throw new Error("useShop phải dùng bên trong <ShopProvider>")
  return value
}

const toState = (initial: ShopInitial, syncKey: string): ShopState => ({
  cartQuantity: initial.cartQuantity || 0,
  cartQuantityMap: initial.cartQuantityMap || {},
  wishlistCount: initial.wishlistCount || 0,
  wishlistMap: initial.wishlistMap || {},
  compareCount: initial.compareCount || 0,
  compareMap: initial.compareMap || {},
  maxQuantityMap: {},
  syncKey: syncKey
})

export function ShopProvider({ ctx, initial, children }: { ctx: ViewCtx, initial: ShopInitial, children: React.ReactNode }) {
  const router = useRouter()
  const { showToast } = useToast()
  const { t } = useMemo(() => createTranslator(ctx.lang), [ctx.lang])
  const errorText = t("errorGeneral")

  // Server gửi dữ liệu mới (chuyển trang, tải lại) thì dùng dữ liệu mới của server
  const syncKey = JSON.stringify(initial)
  const [state, setState] = useState<ShopState>(() => toState(initial, syncKey))
  if(state.syncKey !== syncKey) {
    setState(toState(initial, syncKey))
  }

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartVersion, setCartVersion] = useState(0)
  const notifyCartChanged = useCallback(() => setCartVersion(version => version + 1), [])

  const request = useCallback((path: string, method: string = "POST", data?: any) => {
    return sendJson(path, method, data, errorText)
  }, [errorText])

  const setCartQuantity = useCallback((count: number) => {
    setState(current => ({ ...current, cartQuantity: count }))
  }, [])

  const setWishlistCount = useCallback((count: number) => {
    setState(current => ({ ...current, wishlistCount: count }))
  }, [])

  const setCompareCount = useCallback((count: number) => {
    setState(current => ({ ...current, compareCount: count }))
  }, [])

  const setProductQuantity = useCallback((productId: string, quantity: number, maxQuantity?: number) => {
    setState(current => ({
      ...current,
      cartQuantityMap: { ...current.cartQuantityMap, [productId]: quantity },
      maxQuantityMap: maxQuantity !== undefined
        ? { ...current.maxQuantityMap, [productId]: maxQuantity }
        : current.maxQuantityMap
    }))
  }, [])

  // Bấm "В корзину": thêm 1 cái vào giỏ
  const addToCart = useCallback(async (productId: string) => {
    const data = await request("/cart/add", "POST", { productId: productId, quantity: 1 })
    if(data.code === "success") {
      setProductQuantity(productId, data.quantity, data.maxQuantity)
      setCartQuantity(data.cartQuantity)
      showToast(data.message, "success", data.link)
      notifyCartChanged()
    }
    else {
      showToast(data.message, "error")
    }
    return data
  }, [request, setProductQuantity, setCartQuantity, showToast, notifyCartChanged])

  // Đổi số lượng: hiện số mới ngay, đợi khách ngừng bấm 0,4 giây mới gửi lên server
  // (bấm + nhiều lần liên tiếp chỉ gửi 1 lần)
  const cartTimers = useRef<{ [productId: string]: ReturnType<typeof setTimeout> }>({})
  const cartRequestIds = useRef<{ [productId: string]: number }>({})

  const changeQuantity = useCallback((productId: string, quantity: number) => {
    setProductQuantity(productId, quantity)

    clearTimeout(cartTimers.current[productId])
    cartTimers.current[productId] = setTimeout(async () => {
      // Bỏ qua kết quả của yêu cầu cũ nếu đã có yêu cầu mới hơn
      const requestId = (cartRequestIds.current[productId] || 0) + 1
      cartRequestIds.current[productId] = requestId

      const data = await request("/cart/update", "PATCH", { productId: productId, quantity: quantity })
      if(requestId !== cartRequestIds.current[productId]) return

      if(data.code === "success") {
        setProductQuantity(productId, data.quantity, data.maxQuantity)
        setCartQuantity(data.cartQuantity)
        showToast(data.message, data.quantity > 0 ? "warning" : "success")
      }
      else {
        showToast(data.message, "error")
      }
      notifyCartChanged()
    }, 400)
  }, [request, setProductQuantity, setCartQuantity, showToast, notifyCartChanged])

  // Bấm ♡: thêm / bỏ sản phẩm yêu thích
  const toggleWishlist = useCallback(async (productId: string) => {
    const data = await request("/wishlist/toggle", "POST", { productId: productId })
    if(data.code !== "success") {
      showToast(data.message, "error")
      return data
    }

    setState(current => ({
      ...current,
      wishlistCount: data.wishlistCount,
      wishlistMap: { ...current.wishlistMap, [productId]: Boolean(data.added) }
    }))
    showToast(data.message, "success", data.link)
    return data
  }, [request, showToast])

  // Bấm "Сравнить": thêm / bỏ sản phẩm so sánh
  // Danh sách so sánh nằm trong cookie (server/helpers/compare.helper.ts), nên gửi lần lượt từng yêu cầu:
  // bấm nhanh 2 sản phẩm liên tiếp thì yêu cầu sau đợi yêu cầu trước lưu cookie xong, không bị mất sản phẩm
  const compareQueue = useRef<Promise<unknown>>(Promise.resolve())

  const toggleCompare = useCallback((productId: string) => {
    const run = async (): Promise<ApiResult> => {
      const data = await request("/compare/toggle", "POST", { productId: productId })
      if(data.code !== "success") {
        // Đã đủ số sản phẩm tối đa: thông báo kèm link "Перейти к сравнению"
        showToast(data.message, "error", data.link)
        return data
      }

      setState(current => ({
        ...current,
        compareCount: data.compareCount,
        compareMap: { ...current.compareMap, [productId]: Boolean(data.added) }
      }))
      showToast(data.message, "success", data.link)
      return data
    }

    const result = compareQueue.current.then(run, run)
    compareQueue.current = result.catch(() => undefined)
    return result
  }, [request, showToast])

  // Khách bấm "Quay lại" trên trình duyệt: trang lấy từ bộ nhớ đệm (giỏ hàng, giá có thể đã cũ) nên lấy lại dữ liệu mới
  useEffect(() => {
    const refresh = () => router.refresh()
    const onPageShow = (event: PageTransitionEvent) => {
      if(event.persisted) window.location.reload()
    }
    window.addEventListener("popstate", refresh)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      window.removeEventListener("popstate", refresh)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [router])

  const value: ShopContextValue = {
    ctx,
    t,
    errorText,
    state,
    cartVersion,
    notifyCartChanged,
    setCartQuantity,
    setProductQuantity,
    addToCart,
    changeQuantity,
    toggleWishlist,
    setWishlistCount,
    toggleCompare,
    setCompareCount,
    request,
    isMobileMenuOpen,
    setMobileMenuOpen
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
