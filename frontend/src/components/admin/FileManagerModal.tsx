"use client"

import { useEffect, useRef, useState } from "react"
import { adminUrl } from "@/lib/admin"

// Cửa sổ "Chọn File": mở trang quản lý file trong iframe, bấm nút copy cạnh file rồi dán đường dẫn vào ô nhập
// Mở bằng nút có data-bs-toggle="modal" data-bs-target="#modalFileManager" (xem FileInput ở form.tsx)
// iframe chỉ được tải khi mở cửa sổ lần đầu (không tải ngầm ở mọi trang)
export function FileManagerModal() {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const modal = modalRef.current
    if(!modal) return
    const onShow = () => setIsLoaded(true)
    modal.addEventListener("show.bs.modal", onShow)
    return () => modal.removeEventListener("show.bs.modal", onShow)
  }, [])

  return (
    <div id="modalFileManager" ref={modalRef} className="modal fade" aria-hidden="true" tabIndex={-1}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title fs-5">Chọn File</h1>
            <button className="btn-close" aria-label="Close" data-bs-dismiss="modal" type="button"></button>
          </div>
          <div className="modal-body">
            {isLoaded && <iframe src={adminUrl("/file-manager")} style={{ width: "100%", height: "76vh", border: 0 }}></iframe>}
          </div>
        </div>
      </div>
    </div>
  )
}
