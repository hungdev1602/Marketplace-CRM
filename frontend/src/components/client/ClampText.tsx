"use client"

import { useEffect, useRef, useState } from "react"
import { cx } from "@/lib/format"

// Chữ dài chỉ hiện vài dòng (CSS .sf-clamp), bấm "Читать полностью" để mở hết
// Chỉ hiện nút khi chữ thật sự dài hơn khung
export function ClampText({ moreLabel, children }: { moreLabel: string, children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  // null: chưa đo, true: đã mở hết (hoặc chữ ngắn), false: đang thu gọn và có nút
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null)

  useEffect(() => {
    const box = boxRef.current
    if(!box) return
    setIsExpanded(!(box.scrollHeight > box.clientHeight + 4))
  }, [])

  return (
    <div className="sf-clamp-wrap">
      <div ref={boxRef} className={cx("sf-clamp", isExpanded && "is-expanded")}>
        {children}
      </div>
      <button type="button" className="sf-review-read-more" hidden={isExpanded !== false} onClick={() => setIsExpanded(true)}>
        {moreLabel}
        <i className="fas fa-chevron-down"></i>
      </button>
    </div>
  )
}
