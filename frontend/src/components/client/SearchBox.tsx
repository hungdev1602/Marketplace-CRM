"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getJson } from "@/lib/api-client"
import { cx } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { startTopLoader } from "@/lib/top-loader"
import { useToast } from "./Toast"

// ===== Ô tìm kiếm ở đầu trang =====
// - Gõ từ khoá: khung gợi ý sản phẩm, danh mục, thương hiệu, từ khoá hay tìm (server: /search/suggest)
//   Server tự sửa từ khoá gõ nhầm bàn phím / sai chính tả, ví dụ "kfgif" => "лапша"
// - Bấm vào ô còn trống: lịch sử tìm kiếm (lưu trên trình duyệt) và "Часто ищут" (server: /search/popular)
// - Phím ↑ ↓ để chọn gợi ý, Enter để mở, Esc để đóng; máy tính: nhấn phím "/" để bắt đầu tìm
// - Nút micro: tìm bằng giọng nói (trình duyệt có Web Speech API: Chrome, Edge, Safari; Firefox chưa có)
// - Nút mã vạch: quét mã vạch bằng camera (điện thoại có BarcodeDetector: Chrome trên Android)
// Các nút chỉ hiện khi trình duyệt của khách hỗ trợ

const cleanText = (text: any): string => `${text || ""}`.replace(/\s+/g, " ").trim()
const searchUrl = (keyword: string): string => `/products?keyword=${encodeURIComponent(keyword)}`

// --- Lịch sử tìm kiếm (localStorage, tối đa 8 từ khoá, mới nhất lên đầu) ---
const historyKey = "sf-search-history"
const historyMax = 8

const getHistory = (): string[] => {
  try {
    const list = JSON.parse(localStorage.getItem(historyKey) || "[]")
    return Array.isArray(list) ? list.filter(item => typeof item === "string" && cleanText(item)).slice(0, historyMax) : []
  } catch {
    return []
  }
}

const saveHistory = (list: string[]) => {
  try {
    localStorage.setItem(historyKey, JSON.stringify(list.slice(0, historyMax)))
  } catch {
    // trình duyệt chặn lưu (chế độ ẩn danh,...) thì bỏ qua
  }
}

export const addSearchHistory = (keyword: string) => {
  keyword = cleanText(keyword).slice(0, 100)
  if(!keyword) return
  saveHistory([keyword, ...getHistory().filter(item => item.toLowerCase() !== keyword.toLowerCase())])
}

// Trang kết quả tìm kiếm: lưu từ khoá vừa tìm (kể cả tìm bằng giọng nói, mã vạch, bấm gợi ý)
export function SearchHistoryAdd({ keyword }: { keyword: string }) {
  useEffect(() => {
    addSearchHistory(keyword)
  }, [keyword])
  return null
}

// --- "Часто ищут": chỉ tải 1 lần khi khách bấm vào ô tìm kiếm lần đầu ---
let popularPromise: Promise<string[]> | null = null
const getPopular = (): Promise<string[]> => {
  if(!popularPromise) {
    popularPromise = getJson("/search/popular")
      .then(data => Array.isArray(data.queries) ? data.queries : [])
      .catch(() => {
        popularPromise = null // lỗi mạng thì lần sau tải lại
        return []
      })
  }
  return popularPromise
}

// --- Tô đậm chữ khớp từ khoá (không phân biệt hoa thường, có dấu / không dấu) ---
// Đổi từng chữ về dạng không dấu, nhớ vị trí chữ gốc để tô đúng chỗ trong tên gốc
const foldText = (text: string) => {
  let folded = ""
  const indexList: number[] = []
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    for (const item of char) {
      folded += item
      indexList.push(i)
    }
  }
  return { folded, indexList }
}

function Highlight({ text, keyword }: { text: string, keyword: string }) {
  text = `${text || ""}`
  const { folded, indexList } = foldText(text)
  const wordList = foldText(cleanText(keyword)).folded.split(" ").filter(Boolean)
  const markList: boolean[] = new Array(text.length).fill(false)
  for (const word of wordList) {
    let position = folded.indexOf(word)
    while(position !== -1) {
      for (let i = position; i < position + word.length; i++) {
        markList[indexList[i]] = true
      }
      position = folded.indexOf(word, position + word.length)
    }
  }

  const partList: React.ReactNode[] = []
  let start = 0
  while(start < text.length) {
    const isMark = markList[start]
    let end = start
    while(end < text.length && markList[end] === isMark) end++
    const part = text.slice(start, end)
    partList.push(isMark ? <mark key={start}>{part}</mark> : part)
    start = end
  }
  return <>{partList}</>
}

// 1 nhóm trong khung gợi ý: tiêu đề (+ nút bên phải) và danh sách
function Section({ title, action, children }: { title: string, action?: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="sf-sd-section" role="group" aria-label={title}>
      <div className="sf-sd-head" role="presentation">
        <span className="sf-sd-title">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

type OptionProps = {
  index: number // số thứ tự của mục trong khung gợi ý
  active: boolean // đang được chọn bằng phím ↑ ↓
  register: (element: HTMLElement | null) => void
  className: string
  children: React.ReactNode
}

// Link trong khung gợi ý: chuyển trang không tải lại
function OptionLink({ index, active, register, onGo, href, className, children }: OptionProps & { href: string, onGo: (url: string) => void }) {
  return (
    <a
      id={`sf-search-option-${index}`}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      ref={register}
      href={href}
      className={cx(className, active && "is-active")}
      onClick={event => {
        if(event.metaKey || event.ctrlKey || event.shiftKey) return // mở tab mới
        event.preventDefault()
        onGo(href)
      }}
    >
      {children}
    </a>
  )
}

function OptionButton({ index, active, register, onClick, className, children }: OptionProps & { onClick: () => void }) {
  return (
    <button
      id={`sf-search-option-${index}`}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      ref={register}
      type="button"
      className={cx(className, active && "is-active")}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Nội dung khung gợi ý
type DropdownView =
  | { type: "empty", historyList: string[], popularList: string[] } // ô còn trống: lịch sử + "Часто ищут"
  | { type: "suggest", data: any } // có từ khoá: gợi ý từ server
  | { type: "voice", text: string } // đang nghe giọng nói

type Props = {
  lang: string
  categoryTree: any[]
  initialKeyword: string
  initialCategory: string
}

const voiceLangList: { [lang: string]: string } = { ru: "ru-RU", vi: "vi-VN" }

export function SearchBox({ lang, categoryTree, initialKeyword, initialCategory }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const { t, tName } = useMemo(() => createTranslator(lang), [lang])

  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<(HTMLElement | null)[]>([])

  const [keyword, setKeywordState] = useState(initialKeyword)
  const [category, setCategory] = useState(initialCategory)
  const [view, setView] = useState<DropdownView | null>(null)
  const [isOpen, setIsOpenState] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListeningState] = useState(false)
  const [hasVoice, setHasVoice] = useState(false)
  const [scanFormats, setScanFormats] = useState<string[] | null>(null)

  // Giá trị mới nhất để dùng trong các hàm chạy sau (đợi server, đợi giọng nói)
  const keywordRef = useRef(keyword)
  const categoryRef = useRef(category)
  const listeningRef = useRef(false)

  const setKeyword = (value: string) => {
    keywordRef.current = value
    setKeywordState(value)
  }
  const setIsListening = (value: boolean) => {
    listeningRef.current = value
    setIsListeningState(value)
  }
  const getKeyword = () => cleanText(keywordRef.current)
  const isSearchFocused = () => Boolean(boxRef.current && boxRef.current.contains(document.activeElement))

  const setOpen = useCallback((open: boolean) => {
    setIsOpenState(open)
    if(!open) setActiveIndex(-1)
    // Đầu trang nằm dưới menu dính: đưa đầu trang lên trên để khung gợi ý không bị menu che
    boxRef.current?.closest(".sf-header")?.classList.toggle("is-search-open", open)
  }, [])

  // Chuyển sang trang khác (bấm link, tìm kiếm): điền lại ô theo trang mới, đóng khung gợi ý
  const [syncKey, setSyncKey] = useState(`${initialCategory}|${initialKeyword}`)
  if(syncKey !== `${initialCategory}|${initialKeyword}`) {
    setSyncKey(`${initialCategory}|${initialKeyword}`)
    setKeyword(initialKeyword)
    categoryRef.current = initialCategory
    setCategory(initialCategory)
  }

  const goTo = (url: string) => {
    setOpen(false)
    inputRef.current?.blur()
    startTopLoader(url)
    router.push(url)
  }

  // Gửi form: bỏ danh mục trống để link gọn (/products?keyword=лапша)
  const submitSearch = (value?: string) => {
    const params = new URLSearchParams()
    if(categoryRef.current) params.set("category", categoryRef.current)
    params.set("keyword", cleanText(value ?? keywordRef.current))
    goTo(`/products?${params}`)
  }

  // --- Ô còn trống: lịch sử tìm kiếm + "Часто ищут" ---
  const renderEmptyState = async () => {
    const historyList = getHistory()
    const popularList = await getPopular()
    // Trong lúc chờ khách đã gõ thêm / đã bấm ra ngoài
    if(getKeyword().length >= 2 || !isSearchFocused() || listeningRef.current) return

    setActiveIndex(-1)
    setView({ type: "empty", historyList, popularList })
    setOpen(historyList.length > 0 || popularList.length > 0)
  }

  // --- Gọi server lấy gợi ý: đợi khách ngừng gõ 0,2 giây, lưu lại kết quả đã có ---
  const suggestCache = useRef(new Map<string, any>())
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestController = useRef<AbortController | null>(null)

  const renderSuggestions = (data: any) => {
    setActiveIndex(-1)
    setView({ type: "suggest", data })
    setOpen(true)
  }

  const requestSuggestions = () => {
    if(suggestTimer.current) clearTimeout(suggestTimer.current)
    const currentKeyword = getKeyword()

    if(currentKeyword.length < 2) {
      suggestController.current?.abort()
      setIsLoading(false)
      renderEmptyState()
      return
    }

    const currentCategory = categoryRef.current
    const cacheKey = `${currentCategory}|${currentKeyword.toLowerCase()}`
    if(suggestCache.current.has(cacheKey)) {
      renderSuggestions(suggestCache.current.get(cacheKey))
      return
    }

    suggestTimer.current = setTimeout(async () => {
      suggestController.current?.abort()
      const controller = new AbortController()
      suggestController.current = controller
      setIsLoading(true)

      try {
        const params = new URLSearchParams({ keyword: currentKeyword })
        if(currentCategory) params.set("category", currentCategory)
        const response = await fetch(`/api/search/suggest?${params}`, {
          headers: { "Accept": "application/json" },
          signal: controller.signal
        })
        const data = await response.json()
        if(data.code !== "success") throw new Error(data.message)

        suggestCache.current.set(cacheKey, data)
        // Chỉ giữ 50 kết quả gần nhất
        if(suggestCache.current.size > 50) {
          suggestCache.current.delete(suggestCache.current.keys().next().value as string)
        }

        // Khách đã gõ tiếp / đã bấm ra ngoài thì bỏ qua
        if(getKeyword() === currentKeyword && isSearchFocused() && !listeningRef.current) {
          renderSuggestions(data)
        }
      } catch {
        // Lỗi mạng: không hiện gì, khách vẫn bấm Enter để tìm được
      } finally {
        if(suggestController.current === controller) setIsLoading(false)
      }
    }, 200)
  }

  // Phím ↑ ↓ Enter Esc trong ô tìm kiếm
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const optionList = optionRefs.current.filter(Boolean) as HTMLElement[]

    if(event.key === "ArrowDown" || event.key === "ArrowUp") {
      if(!isOpen) {
        requestSuggestions()
        return
      }
      if(optionList.length === 0) return
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      let index = activeIndex + step
      if(index >= optionList.length) index = -1 // xuống quá mục cuối thì quay về ô nhập
      if(index < -1) index = optionList.length - 1
      setActiveIndex(index)
      optionList[index]?.scrollIntoView({ block: "nearest" })
      return
    }

    if(event.key === "Enter" && isOpen && optionList[activeIndex]) {
      event.preventDefault()
      optionList[activeIndex].click()
      return
    }

    if(event.key === "Escape" && isOpen) {
      event.preventDefault()
      setOpen(false)
    }
  }

  // Bấm ra ngoài thì đóng khung gợi ý. Phím "/": đưa con trỏ vào ô tìm kiếm (khi không đang gõ ở ô khác)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if(boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if(event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if(event.key !== "/" && event.code !== "Slash") return
      const target = event.target as HTMLElement
      if(target.closest && target.closest("input, textarea, select, [contenteditable]")) return
      const input = inputRef.current
      if(!input || input.offsetParent === null) return // ô tìm kiếm đang bị ẩn
      event.preventDefault()
      input.focus()
      input.select()
    }
    document.addEventListener("click", onClick)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("click", onClick)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [setOpen])

  // --- Tìm bằng giọng nói (Web Speech API) ---
  // Nói xong thì tự tìm. Trình duyệt gửi giọng nói tới dịch vụ nhận dạng (Google, Apple), cần mạng và trang chạy HTTPS
  const recognitionRef = useRef<any>(null)

  const handleVoice = () => {
    // Bấm lần nữa khi đang nghe: dừng lại và tìm theo chữ đã nghe được
    if(recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const voiceErrorList: { [code: string]: string } = {
      "not-allowed": t("voiceErrorPermission"),
      "service-not-allowed": t("voiceErrorUnavailable"),
      "language-not-supported": t("voiceErrorUnavailable"),
      "audio-capture": t("voiceErrorNoMic"),
      "no-speech": t("voiceErrorNoSpeech"),
      "network": t("voiceErrorNetwork")
    }

    const startValue = keywordRef.current
    let finalText = ""
    let errorCode = ""

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = voiceLangList[lang] || "ru-RU"
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let text = ""
      finalText = ""
      for (const result of event.results) {
        text += result[0].transcript
        if(result.isFinal) finalText += result[0].transcript
      }
      setKeyword(cleanText(text))
      setView({ type: "voice", text: cleanText(text) })
      setOpen(true)
    }

    recognition.onerror = (event: any) => {
      errorCode = event.error
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)

      const heard = cleanText(finalText) || (errorCode ? "" : getKeyword())
      if(heard && heard !== cleanText(startValue)) {
        // Nghe được: tìm luôn
        setKeyword(heard)
        submitSearch(heard)
        return
      }

      setKeyword(startValue)
      setOpen(false)
      if(errorCode && errorCode !== "aborted") {
        showToast(voiceErrorList[errorCode] || t("errorGeneral"), "error")
      }
    }

    try {
      recognition.start()
      setIsListening(true)
      setView({ type: "voice", text: "" })
      setOpen(true)
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      showToast(t("voiceErrorUnavailable"), "error")
    }
  }

  // --- Quét mã vạch bằng camera (BarcodeDetector) ---
  // Chỉ hiện trên điện thoại / máy tính bảng có trình duyệt hỗ trợ (Chrome trên Android)
  // Quét được thì mở /products?keyword=mã: mã vạch đúng của 1 sản phẩm thì server mở luôn trang sản phẩm đó
  const scanDialogRef = useRef<HTMLDialogElement>(null)
  const scanVideoRef = useRef<HTMLVideoElement>(null)
  const scanState = useRef<{ detector: any, stream: MediaStream | null, timer: ReturnType<typeof setTimeout> | null }>({
    detector: null,
    stream: null,
    timer: null
  })
  const [scanMessage, setScanMessage] = useState<{ text: string, isError: boolean } | null>(null)

  // Các nút micro, mã vạch chỉ hiện khi trình duyệt hỗ trợ (kiểm tra sau khi trang đã hiện)
  useEffect(() => {
    const browser = window as any
    if(browser.SpeechRecognition || browser.webkitSpeechRecognition) setHasVoice(true)

    const canScan = "BarcodeDetector" in window
      && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
      && typeof HTMLDialogElement !== "undefined"
      && window.matchMedia("(pointer: coarse)").matches
    if(canScan) {
      browser.BarcodeDetector.getSupportedFormats().then((supportedList: string[]) => {
        const formatList = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"].filter(format => supportedList.includes(format))
        if(formatList.includes("ean_13")) setScanFormats(formatList)
      }).catch(() => {})
    }
  }, [])

  const stopScan = useCallback(() => {
    const scan = scanState.current
    if(scan.timer) clearTimeout(scan.timer)
    scan.timer = null
    if(scan.stream) {
      scan.stream.getTracks().forEach(track => track.stop())
      scan.stream = null
    }
    if(scanVideoRef.current) scanVideoRef.current.srcObject = null
  }, [])

  // Rời trang thì tắt camera, dừng nghe giọng nói
  useEffect(() => {
    return () => {
      stopScan()
      recognitionRef.current?.abort?.()
    }
  }, [stopScan])

  // Cứ 0,25 giây đọc 1 lần cho đến khi thấy mã vạch
  const detectLoop = async () => {
    const scan = scanState.current
    const video = scanVideoRef.current
    if(!scan.stream || !video) return
    try {
      if(video.readyState >= 2) {
        const codeList = await scan.detector.detect(video)
        const code = codeList.map((item: any) => item.rawValue).find((value: string) => value)
        if(code && scan.stream) {
          stopScan()
          setScanMessage({ text: `${t("scanFound")} ${code}`, isError: false })
          if(navigator.vibrate) navigator.vibrate(80)
          scanDialogRef.current?.close()
          goTo(searchUrl(code))
          return
        }
      }
    } catch {
      // khung hình lỗi thì đọc khung tiếp theo
    }
    scan.timer = setTimeout(detectLoop, 250)
  }

  const handleScan = async () => {
    const dialog = scanDialogRef.current
    const video = scanVideoRef.current
    if(!dialog || !video || !scanFormats) return

    setOpen(false)
    setScanMessage(null)
    dialog.showModal()

    const scan = scanState.current
    try {
      scan.detector = scan.detector || new (window as any).BarcodeDetector({ formats: scanFormats })
      scan.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, // camera sau
        audio: false
      })
      // Khách đã đóng khung trong lúc chờ cho phép dùng camera
      if(!dialog.open) {
        stopScan()
        return
      }
      video.srcObject = scan.stream
      await video.play()
      detectLoop()
    } catch (error: any) {
      stopScan()
      setScanMessage({
        text: error?.name === "NotAllowedError" ? t("scanErrorPermission")
          : (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") ? t("scanErrorNoCamera")
          : t("errorGeneral"),
        isError: true
      })
    }
  }

  // ===== Khung gợi ý =====
  // Mỗi mục chọn được bằng phím ↑ ↓ có 1 số thứ tự (index), theo thứ tự hiện trong khung
  optionRefs.current = []
  let optionCount = 0
  const option = () => {
    const index = optionCount++
    return {
      index: index,
      active: index === activeIndex,
      register: (element: HTMLElement | null) => { optionRefs.current[index] = element }
    }
  }
  const linkOption = () => ({ ...option(), onGo: goTo })

  let dropdownContent: React.ReactNode = null

  if(view?.type === "voice") {
    dropdownContent = (
      <div className="sf-sd-voice">
        <span className="sf-sd-voice-icon"><i className="fas fa-microphone" aria-hidden="true"></i></span>
        <div>
          <b>{t("voiceListening")}</b>
          <p>{view.text || t("voiceHint")}</p>
        </div>
        <button type="button" className="sf-btn sf-btn-outline sf-sd-voice-stop" onClick={() => recognitionRef.current?.stop()}>
          {t("voiceStop")}
        </button>
      </div>
    )
  }
  else if(view?.type === "empty") {
    dropdownContent = (
      <>
        {view.historyList.length > 0 && (
          <Section
            title={t("searchRecent")}
            action={(
              <button
                type="button"
                className="sf-sd-action"
                onClick={() => {
                  saveHistory([])
                  inputRef.current?.focus()
                  renderEmptyState()
                }}
              >
                {t("searchClearHistory")}
              </button>
            )}
          >
            <ul className="sf-sd-history">
              {view.historyList.map(item => (
                <li key={item}>
                  <OptionLink {...linkOption()} href={searchUrl(item)} className="sf-sd-history-link">
                    <i className="fas fa-history" aria-hidden="true"></i>
                    <span>{item}</span>
                  </OptionLink>
                  <button
                    type="button"
                    className="sf-sd-remove"
                    aria-label={`${t("searchRemoveHistory")}: ${item}`}
                    title={t("searchRemoveHistory")}
                    onClick={() => {
                      saveHistory(getHistory().filter(other => other !== item))
                      inputRef.current?.focus()
                      renderEmptyState()
                    }}
                  >
                    <i className="fas fa-times" aria-hidden="true"></i>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {view.popularList.length > 0 && (
          <Section title={t("searchPopular")}>
            <div className="sf-sd-chips">
              {view.popularList.map((item, index) => (
                <OptionLink key={item} {...linkOption()} href={searchUrl(item)} className="sf-sd-chip">
                  <i className={index < 3 ? "fas fa-fire" : "fas fa-search"} aria-hidden="true"></i>
                  <span>{item}</span>
                </OptionLink>
              ))}
            </div>
          </Section>
        )}
      </>
    )
  }
  else if(view?.type === "suggest") {
    const data = view.data
    const usedKeyword: string = data.usedKeyword || data.keyword
    const queries: string[] = data.queries || []
    const categories: any[] = data.categories || []
    const brands: any[] = data.brands || []
    const products: any[] = data.products || []
    const hasResult = queries.length > 0 || categories.length > 0 || brands.length > 0 || products.length > 0

    dropdownContent = (
      <>
        {/* Từ khoá đã được sửa: "Показаны результаты по запросу «лапша»", bấm vào để tìm bằng từ khoá đúng */}
        {data.corrected && (
          <OptionLink {...linkOption()} href={searchUrl(data.usedKeyword)} className="sf-sd-note">
            <i className="fas fa-spell-check" aria-hidden="true"></i>
            <span>{t("searchCorrected")} <b>«{data.usedKeyword}»</b></span>
          </OptionLink>
        )}
        {/* Từ khoá hay tìm, bắt đầu bằng chữ đang gõ */}
        {queries.length > 0 && (
          <Section title={t("searchQueries")}>
            <div className="sf-sd-list">
              {queries.map(item => (
                <OptionLink key={item} {...linkOption()} href={searchUrl(item)} className="sf-sd-query">
                  <i className="fas fa-search" aria-hidden="true"></i>
                  <span><Highlight text={item} keyword={usedKeyword} /></span>
                </OptionLink>
              ))}
            </div>
          </Section>
        )}
        {/* Danh mục, thương hiệu */}
        {(categories.length > 0 || brands.length > 0) && (
          <Section title={categories.length > 0 ? t("categories") : t("searchBrands")}>
            <div className="sf-sd-chips">
              {categories.map(item => (
                <OptionLink key={`category-${item.url}`} {...linkOption()} href={item.url} className="sf-sd-chip">
                  {item.image
                    ? <img src={item.image} alt="" loading="lazy" />
                    : <i className="fas fa-th-large" aria-hidden="true"></i>}
                  <span><Highlight text={item.name} keyword={usedKeyword} /></span>
                </OptionLink>
              ))}
              {brands.map(item => (
                <OptionLink key={`brand-${item.url}`} {...linkOption()} href={item.url} className="sf-sd-chip">
                  <i className="fas fa-tag" aria-hidden="true"></i>
                  <span><Highlight text={item.name} keyword={usedKeyword} /></span>
                </OptionLink>
              ))}
            </div>
          </Section>
        )}
        {/* Sản phẩm */}
        {products.length > 0 && (
          <Section title={t("products")}>
            <div className="sf-sd-list">
              {products.map(product => (
                <OptionLink key={product.url} {...linkOption()} href={product.url} className={cx("sf-sd-product", !product.inStock && "is-out")}>
                  <img src={product.image} alt="" loading="lazy" />
                  <span className="sf-sd-product-info">
                    <span className="sf-sd-product-name"><Highlight text={product.name} keyword={usedKeyword} /></span>
                    {product.meta && <span className="sf-sd-product-meta">{product.meta}</span>}
                    {!product.inStock && <span className="sf-sd-product-out">{t("outOfStock")}</span>}
                  </span>
                  <span className={cx("sf-sd-product-price", product.priceOld && "is-sale")}>
                    <b>{product.price}</b>
                    {product.priceOld && <del>{product.priceOld}</del>}
                  </span>
                </OptionLink>
              ))}
            </div>
          </Section>
        )}
        {data.total > 0 ? (
          // "Показать все результаты (12)": tìm theo từ khoá đang gõ (giữ danh mục đang chọn)
          <OptionButton {...option()} className="sf-sd-all" onClick={() => submitSearch()}>
            <span>{t("searchShowAll")} ({data.total})</span>
            <i className="fas fa-arrow-right" aria-hidden="true"></i>
          </OptionButton>
        ) : !hasResult && (
          <p className="sf-sd-empty">
            <i className="fas fa-search" aria-hidden="true"></i>
            {t("searchNothingFound")} <b>«{data.keyword}»</b>
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <div
        ref={boxRef}
        className={cx("sf-search-box", isOpen && "is-open", isLoading && "is-loading", isListening && "is-listening", hasVoice && "has-voice", scanFormats && "has-scan")}
        onBlur={event => {
          // Chuyển sang phần khác của trang thì đóng khung gợi ý
          if(!event.currentTarget.contains(event.relatedTarget as Node) && !listeningRef.current) setOpen(false)
        }}
      >
        <form
          action="/products"
          method="GET"
          className="sf-search"
          role="search"
          onSubmit={event => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <select
            name="category"
            className="sf-search-select"
            aria-label={t("categories")}
            value={category}
            onChange={event => {
              categoryRef.current = event.target.value
              setCategory(event.target.value)
              if(getKeyword().length >= 2) {
                inputRef.current?.focus()
                requestSuggestions()
              }
            }}
          >
            <option value="">{t("allCategories")}</option>
            {categoryTree.map(item => [
              <option key={item.slug} value={item.slug}>{tName(item)}</option>,
              ...item.children.map((child: any) => (
                <option key={child.slug} value={child.slug}>— {tName(child)}</option>
              ))
            ])}
          </select>
          <div className="sf-search-input">
            <input
              ref={inputRef}
              placeholder={t("searchPlaceholder")}
              type="search"
              name="keyword"
              value={keyword}
              aria-label={t("searchPlaceholder")}
              maxLength={100}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="sf-search-dropdown"
              aria-activedescendant={isOpen && activeIndex >= 0 ? `sf-search-option-${activeIndex}` : undefined}
              onChange={event => {
                setKeyword(event.target.value)
                requestSuggestions()
              }}
              onFocus={requestSuggestions}
              onKeyDown={handleKeyDown}
            />
            {hasVoice && (
              <button
                type="button"
                className="sf-search-tool"
                aria-label={t("voiceSearch")}
                title={t("voiceSearch")}
                aria-pressed={isListening}
                onClick={handleVoice}
              >
                <i className="fas fa-microphone"></i>
              </button>
            )}
            {scanFormats && (
              <button type="button" className="sf-search-tool" aria-label={t("scanBarcode")} title={t("scanBarcode")} onClick={handleScan}>
                <i className="fas fa-barcode"></i>
              </button>
            )}
            <button type="submit" className="sf-search-submit" aria-label={t("search")}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </form>
        <div
          id="sf-search-dropdown"
          className="sf-search-dropdown"
          role="listbox"
          aria-label={t("searchSuggestions")}
          hidden={!isOpen}
          // Bấm trong khung gợi ý: giữ con trỏ ở ô tìm kiếm (không làm khung bị đóng trước khi mở link)
          onMouseDown={event => event.preventDefault()}
        >
          {dropdownContent}
        </div>
      </div>

      {/* Khung quét mã vạch */}
      <dialog
        ref={scanDialogRef}
        className="sf-scan-dialog"
        aria-labelledby="sf-scan-title"
        // Bấm ra ngoài khung thì đóng
        onClick={event => {
          if(event.target === event.currentTarget) event.currentTarget.close()
        }}
        // Đóng khung (nút ✕, phím Esc, nút Back) thì tắt camera
        onClose={stopScan}
      >
        <div className="sf-scan-head">
          <h2 id="sf-scan-title">{t("scanTitle")}</h2>
          <button type="button" className="sf-scan-close" aria-label={t("close")} onClick={() => scanDialogRef.current?.close()}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="sf-scan-video">
          <video ref={scanVideoRef} muted playsInline></video>
          <span className="sf-scan-frame"></span>
          <span className="sf-scan-line"></span>
        </div>
        <p className={cx("sf-scan-message", scanMessage?.isError && "is-error")} aria-live="polite">
          {scanMessage ? scanMessage.text : t("scanHint")}
        </p>
      </dialog>
    </>
  )
}
