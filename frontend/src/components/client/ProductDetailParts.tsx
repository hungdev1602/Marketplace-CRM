"use client"

import { useRef, useState } from "react"
import { cx } from "@/lib/format"

// Các phần bấm được ở trang chi tiết sản phẩm: album ảnh / video, các tab thông tin

type Media = { url: string, isVideo: boolean }

// Ảnh / video sản phẩm: bấm vào danh sách nhỏ để xem ở khung lớn
// (giống Ozon, Wildberries: video đứng đầu danh sách, tự phát không tiếng)
export function ProductGallery({ mediaList, posterUrl, fallbackUrl, productName, children }: {
  mediaList: Media[]
  posterUrl: string // ảnh hiện trước khi video tải xong
  fallbackUrl: string // ảnh khi sản phẩm chưa có ảnh
  productName: string
  children?: React.ReactNode // nhãn giảm giá, mới, nổi bật
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const firstMedia = mediaList[0]
  const active = mediaList[activeIndex] || firstMedia
  const isVideo = Boolean(active && active.isVideo)
  const isFirstVideo = Boolean(firstMedia && firstMedia.isVideo)
  // Ảnh đang xem; đang xem video thì giữ ảnh đã xem gần nhất (bị ẩn)
  const [imageUrl, setImageUrl] = useState(isFirstVideo ? (posterUrl || fallbackUrl) : (firstMedia ? firstMedia.url : fallbackUrl))
  const [videoUrl, setVideoUrl] = useState(isFirstVideo ? firstMedia.url : "")

  const select = (index: number) => {
    const media = mediaList[index]
    setActiveIndex(index)
    if(media.isVideo) {
      setVideoUrl(media.url)
      requestAnimationFrame(() => {
        videoRef.current?.play().catch(() => {
          // trình duyệt chặn tự phát thì khách bấm nút ▶ trên video
        })
      })
    }
    else {
      videoRef.current?.pause()
      setImageUrl(media.url)
    }
  }

  return (
    <div className="sf-gallery">
      <div className="sf-gallery-main">
        <video
          ref={videoRef}
          className="sf-gallery-video"
          src={videoUrl || undefined}
          poster={posterUrl || undefined}
          controls
          muted
          autoPlay={isFirstVideo}
          loop
          playsInline
          preload="metadata"
          hidden={!isVideo}
        ></video>
        <img src={imageUrl} alt={productName} hidden={isVideo} />
        {children}
      </div>
      {mediaList.length > 1 && (
        <div className="sf-gallery-thumbs">
          {mediaList.map((media, index) => (
            <button
              key={media.url}
              type="button"
              className={index == activeIndex ? "active" : ""}
              aria-label={`${productName} ${index + 1}`}
              onClick={() => select(index)}
            >
              {media.isVideo ? (
                <>
                  <video src={`${media.url}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true"></video>
                  <span className="sf-thumb-play"><i className="fas fa-play"></i></span>
                </>
              ) : (
                <img src={media.url} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Các tab: mô tả, thành phần, bảo quản, thông tin (nội dung từng tab dựng sẵn ở server)
export function ProductTabs({ tabs }: { tabs: { id: string, label: string, content: React.ReactNode }[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)

  return (
    <div className="sf-product-tabs">
      <ul className="nav nav-tabs" role="tablist">
        {tabs.map(tab => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              id={`tab-${tab.id}-btn`}
              className={cx("nav-link", tab.id === activeId && "active")}
              type="button"
              role="tab"
              aria-controls={`tab-${tab.id}`}
              aria-selected={tab.id === activeId}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content">
        {tabs.map(tab => (
          <div
            key={tab.id}
            id={`tab-${tab.id}`}
            className={cx("tab-pane fade", tab.id === activeId && "show active")}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}-btn`}
            tabIndex={0}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}
