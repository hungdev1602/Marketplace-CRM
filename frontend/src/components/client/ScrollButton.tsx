"use client"

import { useEffect, useRef, useState } from "react"
import { cx } from "@/lib/format"

// Nút cuộn lên đầu trang (vòng tròn hiện tiến độ cuộn trang)
export function ScrollButton() {
  const pathRef = useRef<SVGPathElement>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const path = pathRef.current
    if(!path) return
    const pathLength = path.getTotalLength()
    path.style.strokeDasharray = `${pathLength} ${pathLength}`

    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      const progress = height > 0 ? window.scrollY / height : 0
      path.style.strokeDashoffset = `${pathLength - progress * pathLength}`
      setIsActive(window.scrollY > 50)
    }
    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })
    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  return (
    <div className={cx("progress-wrap", isActive && "active-progress")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
      <svg className="progress-circle svg-content" viewBox="-1 -1 102 102" height="100%" width="100%">
        <path ref={pathRef} d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
      </svg>
    </div>
  )
}
