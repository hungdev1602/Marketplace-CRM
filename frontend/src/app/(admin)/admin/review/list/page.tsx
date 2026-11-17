import { ActionButton, TextPatchForm } from "@/components/admin/ActionButton"
import { AdminPagination, EmptyRow, FilterForm } from "@/components/admin/ui"
import { adminUrl } from "@/lib/admin"
import { adminMetadata, adminPage, type AdminPageProps } from "@/lib/admin-page"

// Đánh giá sản phẩm của khách: /admin/review/list (duyệt, từ chối, xoá, trả lời khách)
// Dữ liệu: hàm list ở server/controller/admin/review.controller.ts

const path = "/review/list"

export const generateMetadata = (props: AdminPageProps) => adminMetadata(path, props)

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating))

export default async function ReviewListPage(props: AdminPageProps) {
  return adminPage(path, props, (data) => {
    const permissions: string[] = data.permissions || []
    const canModerate = permissions.includes("review-moderate")
    const canReply = permissions.includes("review-reply")
    const reviewList: any[] = data.reviewList || []
    const filter = data.filter || {}
    const fileUrl: string = data.domainFileManager || ""

    return (
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h4 className="card-title">{data.pageTitle}</h4>
                  {data.filterProduct && (
                    <div className="small text-muted mt-1">
                      Sản phẩm: <b>{data.filterProduct.name}</b>
                      <a className="ms-2" href={adminUrl("/review/list")}>Xem tất cả sản phẩm</a>
                    </div>
                  )}
                </div>
                <div className="col-auto">
                  {data.pendingCount > 0 && (
                    <a className="btn btn-warning" href={adminUrl("/review/list?status=pending")}>
                      <i className="fa-solid fa-hourglass-half me-1"></i>
                      {data.pendingCount} đánh giá chờ duyệt
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body pt-0">
              {data.moderation && (
                <p className="text-muted small mb-3">
                  <i className="fa-solid fa-circle-info me-1"></i>
                  Đánh giá có chữ / ảnh chỉ hiện trên trang sản phẩm sau khi được duyệt. Chỉ chấm sao (không viết gì) thì được đăng ngay.
                  {" "}Đổi cách duyệt ở <a href={adminUrl("/setting/edit/review")}>Cài đặt cửa hàng → Đánh giá sản phẩm</a>.
                </p>
              )}
              <FilterForm className="row g-2 align-items-end mb-3">
                {filter.productId && <input type="hidden" name="productId" value={filter.productId} />}
                <div className="col-md-6 col-lg-4">
                  <label className="form-label" htmlFor="filterKeyword">Từ khoá</label>
                  <input className="form-control" id="filterKeyword" type="text" name="keyword" placeholder="Tên sản phẩm, tên / email khách, mã đơn, nội dung..." defaultValue={filter.keyword} />
                </div>
                <div className="col-md-6 col-lg-2">
                  <label className="form-label" htmlFor="filterStatus">Trạng thái</label>
                  <select className="form-select" id="filterStatus" name="status" defaultValue={filter.status || ""}>
                    <option value="">-- Tất cả --</option>
                    {(data.statusList || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-lg-2">
                  <label className="form-label" htmlFor="filterRating">Số sao</label>
                  <select className="form-select" id="filterRating" name="rating" defaultValue={`${filter.rating || ""}`}>
                    <option value="">-- Tất cả --</option>
                    {[5, 4, 3, 2, 1].map(star => <option key={star} value={star}>{star} sao</option>)}
                  </select>
                </div>
                <div className="col-md-6 col-lg-2">
                  <label className="form-label" htmlFor="filterType">Loại</label>
                  <select className="form-select" id="filterType" name="type" defaultValue={filter.type || ""}>
                    <option value="">-- Tất cả --</option>
                    <option value="content">Có chữ / ảnh</option>
                    <option value="photo">Có ảnh</option>
                    <option value="rating-only">Chỉ chấm sao</option>
                  </select>
                </div>
                <div className="col-md-12 col-lg-2">
                  <button className="btn btn-primary me-1" type="submit">
                    <i className="fa-solid fa-filter me-1"></i>
                    Lọc
                  </button>
                  <a className="btn btn-secondary" href={adminUrl("/review/list")}>Xoá lọc</a>
                </div>
              </FilterForm>
              <p className="text-muted mb-2">Tìm thấy {data.pagination.totalRecord} đánh giá</p>
            </div>
            <div className="table-responsive">
              <table className="table mb-0 align-top">
                <thead className="table-light">
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Khách hàng</th>
                    <th style={{ minWidth: "360px" }}>Đánh giá</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewList.length > 0 ? reviewList.map(review => {
                    const product = review.productInfo
                    const hasReply = review.reply && review.reply.text
                    const replyId = `reply-${review.id}`
                    return (
                      <tr key={review.id}>
                        <td style={{ minWidth: "200px", maxWidth: "260px" }}>
                          {product ? (
                            <div className="d-flex align-items-start gap-2">
                              {review.productImage && (
                                <img className="rounded border" src={`${fileUrl}${review.productImage}`} alt="" style={{ width: "48px", height: "48px", objectFit: "contain", flex: "0 0 auto" }} />
                              )}
                              <div>
                                {!product.deleted && product.status == "active" ? (
                                  <a className="fw-medium" href={`/product/${product.slug}#reviews`} target="_blank" rel="noopener">{product.name}</a>
                                ) : (
                                  <>
                                    <span className="fw-medium">{product.name}</span>
                                    <div className="small text-muted">(đã ngừng bán / đã xoá)</div>
                                  </>
                                )}
                                {product.ratingCount > 0 && (
                                  <div className="small text-muted mt-1">
                                    <span className="text-warning">★</span> {product.rating} · {product.ratingCount} lượt
                                  </div>
                                )}
                                <a className="small" href={adminUrl(`/review/list?productId=${review.productId}`)}>Đánh giá của sản phẩm này</a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Sản phẩm không còn</span>
                          )}
                        </td>
                        <td style={{ minWidth: "180px" }}>
                          <div className="fw-medium">{review.customerName}</div>
                          <div className="small text-muted">{review.customerEmail}</div>
                          <div className="small">
                            Đơn <a className="font-monospace" href={adminUrl(`/order/detail/${review.orderId}`)}>{review.orderCode}</a>
                          </div>
                          <div className="small text-muted">Tên hiện: {review.anonymous ? "Покупатель (ẩn tên)" : review.authorName}</div>
                          <div className="small text-muted">Ngôn ngữ: {review.lang == "vi" ? "Tiếng Việt" : "Tiếng Nga"}</div>
                        </td>
                        <td>
                          <div className="text-warning fs-5" title={`${review.rating} sao`}>{stars(review.rating)}</div>
                          {!review.hasContent && <div className="small text-muted">Chỉ chấm sao, không viết gì</div>}
                          {/* Nội dung dài: cuộn trong khung (không làm dòng quá cao), vẫn đọc được hết để duyệt */}
                          {(review.pros || review.cons || review.comment) && (
                            <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                              {[
                                ["pros", "Ưu điểm (Достоинства)"],
                                ["cons", "Nhược điểm (Недостатки)"],
                                ["comment", "Nhận xét (Комментарий)"]
                              ].map(([field, label]) => review[field] && (
                                <div className="mt-1" key={field}>
                                  <div className="small fw-bold">{label}</div>
                                  <div className="text-break" style={{ whiteSpace: "pre-line" }}>{review[field]}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {review.photos && review.photos.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {review.photos.map((photo: string) => (
                                <a key={photo} href={`${fileUrl}${photo}`} target="_blank" rel="noopener" title="Xem ảnh lớn">
                                  <img className="rounded border" src={`${fileUrl}${photo}`} alt="" style={{ width: "72px", height: "72px", objectFit: "cover" }} />
                                </a>
                              ))}
                            </div>
                          )}
                          {review.rejectReason && (
                            <div className="small text-danger mt-2">
                              <i className="fa-solid fa-ban me-1"></i>
                              Lý do từ chối (khách xem được): {review.rejectReason}
                            </div>
                          )}
                          {/* Câu trả lời của cửa hàng */}
                          {hasReply && (
                            <div className="border-start border-3 border-info ps-2 mt-2">
                              <div className="small fw-bold">
                                <i className="fa-solid fa-store me-1"></i>
                                Cửa hàng trả lời
                                <span className="fw-normal text-muted"> · {review.replyAtFormat} · {review.reply.by}</span>
                              </div>
                              <div className="text-break" style={{ whiteSpace: "pre-line" }}>{review.reply.text}</div>
                            </div>
                          )}
                          {/* Chỉ chấm sao (không viết gì) không hiện trên trang sản phẩm nên không cần trả lời */}
                          {canReply && review.hasContent && (
                            <>
                              <a className="small d-inline-block mt-2" data-bs-toggle="collapse" href={`#${replyId}`} role="button" aria-expanded="false" aria-controls={replyId}>
                                <i className="fa-solid fa-reply me-1"></i>
                                {hasReply ? "Sửa câu trả lời" : "Trả lời khách"}
                              </a>
                              <div className="collapse mt-2" id={replyId}>
                                <TextPatchForm
                                  api={`/review/reply/${review.id}`}
                                  field="reply"
                                  defaultValue={hasReply ? review.reply.text : ""}
                                  rows={3}
                                  maxLength={2000}
                                  placeholder={review.lang == "vi" ? "Câu trả lời hiện công khai dưới đánh giá" : "Ответ виден всем под отзывом (khách viết tiếng Nga: nên trả lời bằng tiếng Nga)"}
                                  submitLabel="Lưu câu trả lời"
                                  reloadOnSuccess
                                />
                                <span className="small text-muted">Để trống rồi lưu là xoá câu trả lời</span>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="text-nowrap">
                          {review.statusInfo && <span className={`badge ${review.statusInfo.color}`}>{review.statusInfo.name}</span>}
                          <div className="small text-muted mt-1">{review.createdAtFormat}</div>
                          {review.editedAtFormat && <div className="small text-muted">Sửa: {review.editedAtFormat}</div>}
                          {review.moderatedBy && <div className="small text-muted" title="Người duyệt / từ chối">{review.moderatedBy}</div>}
                        </td>
                        <td className="text-end text-nowrap">
                          {canModerate && (
                            <>
                              {review.status != "published" && (
                                <>
                                  <ActionButton api={`/review/approve/${review.id}`} method="PATCH" className="btn btn-sm btn-success mb-1">
                                    <i className="fa-solid fa-check me-1"></i>
                                    Duyệt
                                  </ActionButton>
                                  <br />
                                </>
                              )}
                              {review.status != "rejected" && (
                                <>
                                  <ActionButton
                                    api={`/review/reject/${review.id}`}
                                    method="PATCH"
                                    confirm="Từ chối đánh giá này? Đánh giá sẽ không hiện trên trang sản phẩm"
                                    reason
                                    reasonPlaceholder="Lý do (khách xem được), ví dụ: Отзыв не о товаре / Нецензурная лексика"
                                    className="btn btn-sm btn-outline-warning mb-1"
                                  >
                                    <i className="fa-solid fa-ban me-1"></i>
                                    Từ chối
                                  </ActionButton>
                                  <br />
                                </>
                              )}
                              <ActionButton
                                api={`/review/delete/${review.id}`}
                                method="DELETE"
                                confirm="Xoá hẳn đánh giá này (cả ảnh)? Không khôi phục được"
                                className="btn btn-sm btn-outline-danger"
                              >
                                <i className="fa-solid fa-trash me-1"></i>
                                Xoá
                              </ActionButton>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  }) : <EmptyRow colSpan={5} text="Không có đánh giá nào" />}
                </tbody>
              </table>
              <AdminPagination totalPage={data.pagination.totalPage} page={data.page} />
            </div>
          </div>
        </div>
      </div>
    )
  })
}
