"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createTranslator } from "@/lib/i18n"
import { sizedSrcSet, sizedUrl } from "@/lib/media"

// ===== Xem ảnh lớn (ảnh của khách trong đánh giá) =====
// Bấm ‹ ›, phím ← →, vuốt để xem ảnh khác; Esc hoặc bấm ra vùng tối để đóng

type LightboxContextValue = {
  // list: link tất cả ảnh của nhóm, index: ảnh mở đầu tiên
  openLightbox: (list: string[], index: number) => void
  isLightboxOpen: () => boolean
}

const LightboxContext = createContext<LightboxContextValue>({ openLightbox: () => {}, isLightboxOpen: () => false })

export const useLightbox = () => useContext(LightboxContext)

export function LightboxProvider({ lang, children }: { lang: string, children: React.ReactNode }) {
  const { t } = createTranslator(lang)
  const [gallery, setGallery] = useState<{ list: string[], index: number } | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)
  const isOpenRef = useRef(false)

  const openLightbox = useCallback((list: string[], index: number) => {
    if(list.length === 0) return
    lastFocus.current = document.activeElement as HTMLElement
    isOpenRef.current = true
    setGallery({ list, index: Math.min(list.length - 1, Math.max(0, index || 0)) })
  }, [])

  const isLightboxOpen = useCallback(() => isOpenRef.current, [])

  const close = useCallback(() => {
    isOpenRef.current = false
    setGallery(null)
    lastFocus.current?.focus()
  }, [])

  const move = useCallback((step: number) => {
    setGallery(current => {
      if(!current || current.list.length < 2) return current
      return { ...current, index: (current.index + step + current.list.length) % current.list.length }
    })
  }, [])

  const isOpen = gallery !== null

  useEffect(() => {
    if(!isOpen) return
    document.body.classList.add("sf-lightbox-open")
    closeButton.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if(event.key === "Escape") close()
      if(event.key === "ArrowLeft") move(-1)
      if(event.key === "ArrowRight") move(1)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.classList.remove("sf-lightbox-open")
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, close, move])

  return (
    <LightboxContext.Provider value={{ openLightbox, isLightboxOpen }}>
      {children}
      <div
        className="sf-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={t("reviewPhoto")}
        hidden={!gallery}
        // Bấm ra vùng tối xung quanh ảnh thì đóng
        onClick={event => { if(event.target === event.currentTarget) close() }}
        onTouchStart={event => { touchStartX.current = event.touches[0].clientX }}
        onTouchEnd={event => {
          if(touchStartX.current === null) return
          const distance = event.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if(Math.abs(distance) > 50) move(distance > 0 ? -1 : 1)
        }}
      >
        <button type="button" ref={closeButton} className="sf-lightbox-close" aria-label={t("close")} onClick={close}>
          <i className="fas fa-times"></i>
        </button>
        <button type="button" className="sf-lightbox-nav is-prev" aria-label={t("previous")} hidden={!gallery || gallery.list.length < 2} onClick={() => move(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        {gallery && <img src={gallery.list[gallery.index]} alt="" />}
        <button type="button" className="sf-lightbox-nav is-next" aria-label={t("next")} hidden={!gallery || gallery.list.length < 2} onClick={() => move(1)}>
          <i className="fas fa-chevron-right"></i>
        </button>
        <span className="sf-lightbox-counter">
          {gallery && gallery.list.length > 1 ? `${gallery.index + 1} / ${gallery.list.length}` : ""}
        </span>
      </div>
    </LightboxContext.Provider>
  )
}

// Danh sách ảnh nhỏ của 1 đánh giá, bấm vào để xem ảnh lớn
// - limit: chỉ hiện vài ảnh đầu (thẻ trong slider), ảnh cuối hiện "+3" là số ảnh còn lại
export function ReviewPhotos({ photos, fileUrl, limit, lang }: { photos: string[] | undefined, fileUrl: string, limit?: number, lang: string }) {
  const { t } = createTranslator(lang)
  const { openLightbox } = useLightbox()
  const photoList = photos || []
  const shownList = limit ? photoList.slice(0, limit) : photoList
  if(photoList.length === 0) return null

  // Xem lớn: ảnh rộng 1920px (ảnh chụp điện thoại gốc có thể vài MB), ảnh nhỏ trong danh sách: 160px
  const urlList = photoList.map(photo => sizedUrl(`${fileUrl}${photo}`, 1920))

  return (
    <ul className="sf-review-photos">
      {shownList.map((photo, index) => (
        <li key={photo}>
          <button type="button" aria-label={`${t("reviewPhoto")} ${index + 1}`} onClick={() => openLightbox(urlList, index)}>
            <img src={sizedUrl(`${fileUrl}${photo}`, 160)} srcSet={sizedSrcSet(`${fileUrl}${photo}`, 160)} alt="" loading="lazy" />
            {index == shownList.length - 1 && photoList.length > shownList.length && (
              <span className="sf-review-photo-more">+{photoList.length - shownList.length}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
