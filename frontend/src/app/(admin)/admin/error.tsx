"use client"

import { useEffect } from "react"

// Trang báo lỗi của trang admin: không lấy được dữ liệu từ server Express (server chưa chạy, server lỗi,...)
export default function AdminError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container-xxl">
      <div className="row vh-100 d-flex justify-content-center">
        <div className="col-12 align-self-center">
          <div className="row">
            <div className="col-lg-5 col-md-8 mx-auto">
              <div className="card">
                <div className="card-body text-center p-5">
                  <i className="fa-solid fa-triangle-exclamation text-warning" style={{ fontSize: "3rem" }}></i>
                  <h4 className="mt-3 mb-2">Không tải được trang</h4>
                  <p className="text-muted mb-4">
                    Không lấy được dữ liệu từ máy chủ. Kiểm tra server Express (thư mục server) đã chạy chưa rồi thử lại.
                  </p>
                  <button className="btn btn-primary" type="button" onClick={() => reset()}>
                    <i className="fa-solid fa-rotate-right me-1"></i>
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
