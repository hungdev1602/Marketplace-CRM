"use client"

import { Suspense, useCallback, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { pageKey, TOP_LOADER_EVENT, type TopLoaderAction } from "@/lib/top-loader"
import "./top-loader.css"

// ===== Thanh loading mỏng ở trên cùng trang khi chuyển trang (dùng chung cho trang khách và trang admin) =====
// Đặt 1 lần ở đầu thẻ <body> của layout. Thanh tự chạy khi:
// - Bấm <Link> của Next.js (chuyển trang không tải lại): xong khi trang mới hiện ra (đường dẫn đổi)
// - Bấm thẻ <a> thường, gửi form thường (tải lại cả trang): thanh chạy trong lúc chờ server, trang mới mở ra thì
//   thanh chạy tiếp từ chỗ đang dừng tới hết (lưu tạm trong sessionStorage)
// - JS gọi startTopLoader / goTo / reloadPage (lib/top-loader.ts)
// Không chạy khi: mở tab mới (Ctrl / ⌘ + bấm, target="_blank"), link tải file (download, /api/...), link sang website khác,
// link #mục trong cùng trang, link có thuộc tính data-no-loader

const STORAGE_KEY = "sf-top-loader"
const SHOW_DELAY = 100 // ms: chuyển trang xong nhanh hơn thì không hiện thanh (tránh nháy)
const TRICKLE_INTERVAL = 300 // ms: mỗi lần thanh nhích thêm 1 đoạn
const MAX_PROGRESS = 0.94 // chưa xong thì thanh dừng ở 94%
const MAX_DURATION = 20000 // ms: quá 20 giây vẫn chưa xong (link không đổi trang,...) thì tự ẩn
const HANDOFF_MAX_AGE = 15000 // ms: trang trước để lại tiến độ quá 15 giây thì bỏ qua

// Chạy ngay khi trình duyệt đọc tới đầu <body> (trước khi trang hiện ra): trang trước vừa chuyển sang trang này
// thì gắn data-top-loader để CSS hiện thanh luôn, không phải chờ React chạy xong
const HANDOFF_SCRIPT = `(function () {
  try {
    var raw = sessionStorage.getItem("${STORAGE_KEY}")
    if(!raw) return
    sessionStorage.removeItem("${STORAGE_KEY}")
    var data = JSON.parse(raw)
    if(!(Date.now() - data.time < ${HANDOFF_MAX_AGE})) return
    var html = document.documentElement
    html.style.setProperty("--sf-top-loader-from", String(Math.min(Math.max(Number(data.progress) || 0.3, 0.1), ${MAX_PROGRESS})))
    html.setAttribute("data-top-loader", "")
    setTimeout(function () { html.removeAttribute("data-top-loader") }, 10000)
  } catch (error) {}
})()`

type Status = "idle" | "waiting" | "running" | "finishing"

type Loader = {
  start: () => void
  done: () => void
  reset: () => void
  resume: (from: number) => void
  snapshot: () => { status: Status, progress: number }
}

// Điều khiển thanh bằng cách đổi style trực tiếp (không render lại React mỗi lần thanh nhích)
const createLoader = (root: HTMLElement, bar: HTMLElement): Loader => {
  let status: Status = "idle"
  let progress = 0
  let startedAt = 0
  let showTimer = 0
  let trickleTimer = 0
  let hideTimer = 0

  const clearTimers = () => {
    window.clearTimeout(showTimer)
    window.clearInterval(trickleTimer)
    window.clearTimeout(hideTimer)
  }

  // value: 0 → 1. animate = false: nhảy ngay tới vị trí, không chạy hiệu ứng
  const render = (value: number, animate: boolean = true) => {
    progress = value
    if(!animate) bar.style.transition = "none"
    bar.style.transform = `translate3d(${(value - 1) * 100}%, 0, 0)`
    if(!animate) {
      void bar.offsetWidth // bắt trình duyệt áp dụng vị trí mới trước khi bật lại hiệu ứng
      bar.style.transition = ""
    }
  }

  // Càng gần cuối càng nhích chậm
  const trickle = () => {
    if(Date.now() - startedAt > MAX_DURATION) {
      done()
      return
    }
    const step = progress < 0.2 ? 0.1 : progress < 0.5 ? 0.04 : progress < 0.8 ? 0.02 : 0.005
    render(Math.min(progress + step * (0.6 + Math.random() * 0.8), MAX_PROGRESS))
  }

  const run = (from: number) => {
    status = "running"
    render(from, false)
    root.classList.add("is-active")
    trickleTimer = window.setInterval(trickle, TRICKLE_INTERVAL)
  }

  const start = () => {
    if(status === "waiting" || status === "running") return
    clearTimers()
    status = "waiting"
    startedAt = Date.now()
    showTimer = window.setTimeout(() => {
      run(0)
      render(0.1)
    }, SHOW_DELAY)
  }

  const done = () => {
    if(status === "waiting") {
      clearTimers()
      status = "idle"
      return
    }
    if(status !== "running") return
    clearTimers()
    status = "finishing"
    render(1)
    hideTimer = window.setTimeout(() => {
      root.classList.remove("is-active")
      hideTimer = window.setTimeout(() => {
        status = "idle"
        render(0, false)
      }, 300)
    }, 250)
  }

  // Ẩn ngay, không chạy hiệu ứng (trang được lấy lại từ bộ nhớ đệm khi bấm "Quay lại")
  const reset = () => {
    clearTimers()
    status = "idle"
    root.style.transition = "none"
    root.classList.remove("is-active")
    render(0, false)
    root.style.transition = ""
  }

  const resume = (from: number) => {
    clearTimers()
    startedAt = Date.now()
    run(from)
  }

  return { start, done, reset, resume, snapshot: () => ({ status, progress }) }
}

// Đường dẫn hoặc tham số trên đường dẫn đổi = trang mới đã hiện ra
function RouteChangeListener({ onChange }: { onChange: () => void }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()

  useEffect(() => {
    onChange()
  }, [pathname, search, onChange])

  return null
}

// Bấm vào link này có làm trình duyệt / Next.js mở trang khác trong website không
const isPageLink = (event: MouseEvent): boolean => {
  if(event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  const anchor = event.target instanceof Element ? event.target.closest("a") : null
  if(!(anchor instanceof HTMLAnchorElement) || !anchor.hasAttribute("href")) return false
  if(anchor.target && anchor.target !== "_self") return false
  if(anchor.hasAttribute("download") || anchor.hasAttribute("data-bs-toggle") || anchor.hasAttribute("data-no-loader")) return false
  if((anchor.getAttribute("href") || "").startsWith("#")) return false

  let url: URL
  try {
    url = new URL(anchor.href)
  } catch {
    return false
  }
  if(url.origin !== window.location.origin) return false // website khác, tel:, mailto:, blob:...
  if(url.pathname.startsWith("/api/")) return false // tải file, gọi API của server Express

  // Cùng trang đang xem: link #mục chỉ cuộn trang, <Link> của Next.js không đổi trang.
  // Chỉ thẻ <a> thường không có # mới tải lại trang
  if(pageKey(url) === pageKey(new URL(window.location.href))) {
    return !event.defaultPrevented && !url.hash
  }
  return true
}

// Gửi form này có làm trình duyệt tải trang khác không (form do JS xử lý đã gọi preventDefault)
const isPageSubmit = (event: SubmitEvent): boolean => {
  if(event.defaultPrevented || !(event.target instanceof HTMLFormElement)) return false
  const form = event.target
  const submitter = event.submitter
  const method = (submitter?.getAttribute("formmethod") || form.getAttribute("method") || "get").toLowerCase()
  const target = submitter?.getAttribute("formtarget") || form.getAttribute("target") || ""
  if(method === "dialog" || (target && target !== "_self")) return false
  try {
    const action = new URL(submitter?.getAttribute("formaction") || form.action || window.location.href, window.location.href)
    return action.origin === window.location.origin && !action.pathname.startsWith("/api/")
  } catch {
    return false
  }
}

export function TopLoader({ color }: { color?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<Loader | null>(null)
  const finish = useCallback(() => loaderRef.current?.done(), [])

  useEffect(() => {
    if(!rootRef.current || !barRef.current) return
    if(!loaderRef.current) loaderRef.current = createLoader(rootRef.current, barRef.current)
    const loader = loaderRef.current

    // Trang trước vừa chuyển sang trang này (đoạn script đầu trang đã hiện thanh): chạy nốt tới hết
    const html = document.documentElement
    if(html.hasAttribute("data-top-loader")) {
      const from = parseFloat(getComputedStyle(html).getPropertyValue("--sf-top-loader-from")) || 0.3
      loader.resume(from)
      html.removeAttribute("data-top-loader")
      html.style.removeProperty("--sf-top-loader-from")
      if(!html.getAttribute("style")) html.removeAttribute("style")
      loader.done()
    }

    const onClick = (event: MouseEvent) => {
      if(isPageLink(event)) loader.start()
    }
    const onSubmit = (event: SubmitEvent) => {
      if(isPageSubmit(event)) loader.start()
    }
    const onAction = (event: Event) => {
      const action = (event as CustomEvent<TopLoaderAction>).detail
      if(action === "start") loader.start()
      else if(action === "done") loader.done()
    }
    // Rời trang khi thanh đang chạy (tải lại cả trang): lưu tiến độ để trang mới chạy tiếp
    const onPageHide = () => {
      const { status, progress } = loader.snapshot()
      if(status !== "waiting" && status !== "running") return
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ time: Date.now(), progress: status === "running" ? progress : 0.2 }))
      } catch {}
    }
    // Bấm "Quay lại": trình duyệt lấy lại trang cũ từ bộ nhớ đệm, thanh lúc rời trang vẫn còn => ẩn đi
    const onPageShow = (event: PageTransitionEvent) => {
      if(!event.persisted) return
      loader.reset()
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {}
    }

    // Gắn vào window (không phải document): chạy sau khi React và <Link> đã xử lý cú bấm,
    // nên event.defaultPrevented cho biết Next.js tự chuyển trang hay để trình duyệt tải lại trang
    window.addEventListener("click", onClick)
    window.addEventListener("submit", onSubmit)
    window.addEventListener(TOP_LOADER_EVENT, onAction)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      window.removeEventListener("click", onClick)
      window.removeEventListener("submit", onSubmit)
      window.removeEventListener(TOP_LOADER_EVENT, onAction)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  return (
    <>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: HANDOFF_SCRIPT }}
      />
      <div
        ref={rootRef}
        className="sf-top-loader"
        style={color ? ({ "--sf-top-loader-color": color } as React.CSSProperties) : undefined}
        aria-hidden="true"
      >
        <div ref={barRef} className="sf-top-loader-bar"></div>
      </div>
      <Suspense fallback={null}>
        <RouteChangeListener onChange={finish} />
      </Suspense>
    </>
  )
}
