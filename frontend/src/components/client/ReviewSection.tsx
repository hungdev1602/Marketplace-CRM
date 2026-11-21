"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { getJson, sendJson } from "@/lib/api-client"
import { cx, formatNumber } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { sizedSrcSet, sizedUrl } from "@/lib/media"
import { RatingStars } from "./common"
import { ReviewPhotos, useLightbox } from "./Lightbox"
import { useToast } from "./Toast"

// ===== Đánh giá sản phẩm ở trang chi tiết sản phẩm (phần #reviews) =====
// - Tổng quan: điểm trung bình, số lượt theo từng mức sao, ảnh của khách
// - Các thẻ đánh giá trong slider ngang: lọc theo số sao / có ảnh, sắp xếp (tải lại slider từ trang 1),
//   kéo / bấm mũi tên tới cuối slider thì tự tải thêm (server: GET /review/product/:id)
// - "Читать полностью": tải toàn bộ 1 đánh giá (GET /review/item/:id) và hiện trong cửa sổ
// - "Отзыв полезен?" 👍 / 👎 (POST /review/:id/vote)

// Lượt bấm 👍 / 👎 mới nhất của từng đánh giá (cập nhật cả thẻ trong slider và cửa sổ "Читать полностью")
type VoteState = { myVote: number, helpfulCount: number, unhelpfulCount: number }
type VoteMap = { [reviewId: string]: VoteState }

type ReviewText = { lang: string, fileUrl: string }

// Đầu thẻ đánh giá: chữ cái đầu, tên khách, ngày, số sao
function ReviewHead({ view, lang }: { view: any, lang: string }) {
  const { t } = createTranslator(lang)
  return (
    <div className="sf-review-head">
      <span className="sf-review-avatar" aria-hidden="true">{view.authorInitial}</span>
      <div className="sf-review-author">
        <b>{view.authorName}</b>
        <span>
          {view.dateText}
          {view.review.editedAt && ` · ${t("reviewEdited")}`}
        </span>
      </div>
      <RatingStars rating={view.review.rating} size="sm" lang={lang} />
    </div>
  )
}

// "Отзыв полезен?" 👍 / 👎: bấm lại nút đã bấm là bỏ lượt bấm (đánh giá của chính khách thì hiện "Ваш отзыв")
function ReviewVotes({ view, lang, vote, isVoting, onVote }: {
  view: any
  lang: string
  vote: VoteState
  isVoting: boolean
  onVote: (reviewId: string, value: number) => void
}) {
  const { t } = createTranslator(lang)
  const review = view.review

  return (
    <div className="sf-review-foot">
      {view.isMine ? (
        <span className="sf-review-mine">
          <i className="fas fa-user-check"></i>
          {t("reviewYours")}
        </span>
      ) : (
        <>
          <span>{t("reviewHelpfulQuestion")}</span>
          <button
            type="button"
            className={cx("sf-review-vote", vote.myVote == 1 && "is-active")}
            aria-pressed={vote.myVote == 1}
            disabled={isVoting}
            onClick={() => onVote(review.id, 1)}
          >
            <i className="far fa-thumbs-up"></i>
            <span>{t("reviewHelpfulYes")}</span>
            <b>{vote.helpfulCount > 0 ? vote.helpfulCount : ""}</b>
          </button>
          <button
            type="button"
            className={cx("sf-review-vote", vote.myVote == -1 && "is-active")}
            aria-pressed={vote.myVote == -1}
            disabled={isVoting}
            onClick={() => onVote(review.id, -1)}
          >
            <i className="far fa-thumbs-down"></i>
            <span>{t("reviewHelpfulNo")}</span>
            <b>{vote.unhelpfulCount > 0 ? vote.unhelpfulCount : ""}</b>
          </button>
        </>
      )}
    </div>
  )
}

type VoteProps = {
  vote: VoteState
  isVoting: boolean
  onVote: (reviewId: string, value: number) => void
}

// Thẻ đánh giá trong slider: chỉ hiện đoạn đầu, dài hơn thì có nút "Читать полностью"
function ReviewCard({ view, lang, fileUrl, onReadMore, ...voteProps }: ReviewText & VoteProps & { view: any, onReadMore: (reviewId: string, button: HTMLElement) => void }) {
  const { t } = createTranslator(lang)
  const review = view.review
  const preview = view.preview || { partList: [] }

  return (
    <article className="sf-review-card" id={`review-${review.id}`}>
      <ReviewHead view={view} lang={lang} />
      <p className="sf-review-verified">
        <i className="fas fa-check-circle"></i>
        {t("reviewVerifiedBuyer")}
      </p>
      {preview.partList.length > 0 && (
        <div className="sf-review-card-text">
          {preview.partList.map((part: any) => (
            <p key={part.key}>
              <b>{t(part.key)}:</b> {part.text}
            </p>
          ))}
        </div>
      )}
      <ReviewPhotos photos={review.photos} fileUrl={fileUrl} limit={4} lang={lang} />
      {preview.replyText && (
        <div className="sf-review-card-reply">
          <b>
            <i className="fas fa-store"></i>
            {t("reviewShopReply")}
          </b>
          <p>{preview.replyText}</p>
        </div>
      )}
      {preview.truncated && (
        <button type="button" className="sf-review-read-more" onClick={event => onReadMore(review.id, event.currentTarget)}>
          {t("reviewReadMore")}
          <i className="fas fa-chevron-right"></i>
        </button>
      )}
      <ReviewVotes view={view} lang={lang} {...voteProps} />
    </article>
  )
}

// Toàn bộ 1 đánh giá (trong cửa sổ "Читать полностью")
export function ReviewItem({ view, lang, fileUrl, ...voteProps }: ReviewText & VoteProps & { view: any }) {
  const { t } = createTranslator(lang)
  const review = view.review

  return (
    <article className="sf-review">
      <ReviewHead view={view} lang={lang} />
      <p className="sf-review-verified">
        <i className="fas fa-check-circle"></i>
        {t("reviewVerifiedBuyer")}
      </p>
      {review.pros && (
        <div className="sf-review-block">
          <h4>{t("reviewPros")}</h4>
          <p>{review.pros}</p>
        </div>
      )}
      {review.cons && (
        <div className="sf-review-block">
          <h4>{t("reviewCons")}</h4>
          <p>{review.cons}</p>
        </div>
      )}
      {review.comment && (
        <div className="sf-review-block">
          <h4>{t("reviewComment")}</h4>
          <p>{review.comment}</p>
        </div>
      )}
      <ReviewPhotos photos={review.photos} fileUrl={fileUrl} lang={lang} />
      {review.reply && review.reply.text && (
        <div className="sf-review-reply">
          <div className="sf-review-reply-head">
            <b>
              <i className="fas fa-store"></i>
              {t("reviewShopReply")}
            </b>
            {view.replyDateText && <span>{view.replyDateText}</span>}
          </div>
          <p>{review.reply.text}</p>
        </div>
      )}
      <ReviewVotes view={view} lang={lang} {...voteProps} />
    </article>
  )
}

type Props = {
  lang: string
  fileUrl: string
  productId: string
  rating: number
  reviewCount: number // số đánh giá đã đăng có chữ / ảnh
  reviewSummary: any // số lượt theo từng mức sao, ảnh của khách
  reviewSortList: { id: string, key: string }[]
  reviewViewList: any[] // trang đầu danh sách đánh giá
  reviewResult: { page: number, total: number, hasMore: boolean }
  reviewAction: { type: string, url: string, statusName?: string } | null
}

export function ReviewSection(props: Props) {
  const { lang, fileUrl, reviewSummary, reviewAction } = props
  const { t, tCount } = createTranslator(lang)
  const errorText = t("errorGeneral")
  const { showToast } = useToast()
  const { openLightbox, isLightboxOpen } = useLightbox()

  const [viewList, setViewList] = useState<any[]>(props.reviewViewList)
  const [result, setResult] = useState(props.reviewResult)
  const [filter, setFilterState] = useState({ rating: "", photo: false, sort: "" })
  const [isLoading, setIsLoading] = useState(false) // đang tải lại slider
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [arrows, setArrows] = useState({ prev: false, next: true })
  const [voteMap, setVoteMap] = useState<VoteMap>({})
  const [votingId, setVotingId] = useState("")
  // Cửa sổ "Читать полностью": view = null là đang tải
  const [modal, setModal] = useState<{ view: any | null } | null>(null)

  const trackRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const modalCloseRef = useRef<HTMLButtonElement>(null)
  const modalLastFocus = useRef<HTMLElement | null>(null)
  const requestId = useRef(0)
  const filterRef = useRef(filter)
  const loadingMoreRef = useRef(false)

  const hasCustomerPhotos = (reviewSummary.photoList || []).length > 0
  // Link ảnh gốc của khách; ảnh nhỏ trong danh sách 160px, xem lớn 1920px (server quản lý file thu nhỏ sẵn)
  const photoUrlList: string[] = (reviewSummary.photoList || []).map((photo: any) => `${fileUrl}${photo.path}`)
  const photoLargeList = photoUrlList.map(url => sizedUrl(url, 1920))

  // Mũi tên ‹ ›: khoá khi đã ở đầu / cuối slider
  const updateArrows = useCallback(() => {
    const track = trackRef.current
    if(!track) return
    const maxScroll = track.scrollWidth - track.clientWidth
    setArrows({ prev: track.scrollLeft > 2, next: track.scrollLeft < maxScroll - 2 })
  }, [])

  // Tải các thẻ đánh giá: trang 1 thì thay toàn bộ slider (về đầu slider), trang sau thì nối vào cuối
  const loadReviews = useCallback(async (page: number) => {
    const currentRequest = ++requestId.current
    const current = filterRef.current
    if(page === 1) setIsLoading(true)

    const params = new URLSearchParams()
    if(current.rating) params.set("rating", current.rating)
    if(current.photo) params.set("photo", "1")
    if(current.sort) params.set("sort", current.sort)
    if(page > 1) params.set("page", `${page}`)
    const query = params.toString()

    try {
      const payload = await getJson(`/review/product/${props.productId}${query ? `?${query}` : ""}`)
      if(currentRequest !== requestId.current) return // khách đã đổi bộ lọc khác trong lúc chờ
      const data = payload.data || {}
      setResult(data.reviewResult)
      if(page === 1) {
        setViewList(data.reviewViewList || [])
        if(trackRef.current) trackRef.current.scrollLeft = 0
      }
      else {
        setViewList(list => [...list, ...(data.reviewViewList || [])])
      }
    } catch {
      showToast(errorText, "error")
    }

    if(currentRequest === requestId.current) {
      setIsLoading(false)
    }
  }, [props.productId, errorText, showToast])

  const loadMore = useCallback(async () => {
    if(loadingMoreRef.current || !result.hasMore) return
    loadingMoreRef.current = true
    setIsLoadingMore(true)
    await loadReviews(result.page + 1)
    loadingMoreRef.current = false
    setIsLoadingMore(false)
  }, [loadReviews, result.hasMore, result.page])

  const setFilter = (newFilter: typeof filter) => {
    filterRef.current = newFilter
    setFilterState(newFilter)
    loadReviews(1)
  }

  // Bấm số sao: ở thanh lọc bấm lại số sao đang lọc thì bỏ lọc; ở bảng tổng quan thì cuộn tới danh sách
  const filterByRating = (value: string, isFromSummary: boolean) => {
    if(value === "") {
      setFilter({ ...filter, rating: "", photo: false })
    }
    else {
      setFilter({ ...filter, rating: filter.rating === value && !isFromSummary ? "" : value })
    }
    if(isFromSummary) toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Cập nhật mũi tên khi cuộn slider, đổi cỡ cửa sổ, đổi danh sách
  useEffect(() => {
    const track = trackRef.current
    if(!track) return
    updateArrows()
    track.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    return () => {
      track.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [updateArrows, viewList])

  // Ô "Показать ещё" ở cuối slider hiện ra (khách kéo tới cuối) thì tự tải thêm
  useEffect(() => {
    const track = trackRef.current
    const moreBox = moreRef.current
    if(!track || !moreBox || !("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if(entry.isIntersecting) loadMore()
      })
    }, { root: track, rootMargin: "0px 240px 0px 0px" })
    observer.observe(moreBox)
    return () => observer.disconnect()
  }, [loadMore, viewList])

  // Bấm mũi tên: cuộn gần 1 màn hình thẻ
  const scrollReviews = (direction: number) => {
    const track = trackRef.current
    if(track) track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" })
  }

  // 👍 / 👎. Chưa đăng nhập: thông báo kèm link "Войти"
  const getVote = (view: any): VoteState => voteMap[view.review.id] || {
    myVote: view.myVote || 0,
    helpfulCount: view.review.helpfulCount || 0,
    unhelpfulCount: view.review.unhelpfulCount || 0
  }

  const handleVote = async (reviewId: string, value: number) => {
    setVotingId(reviewId)
    const data = await sendJson(`/review/${reviewId}/vote`, "POST", { value: value }, errorText)
    setVotingId("")

    if(data.code !== "success") {
      const loginLink = data.login
        ? { url: `/account/login?next=${encodeURIComponent(`${location.pathname}#reviews`)}`, text: t("loginAction") }
        : null
      showToast(data.message, "warning", loginLink)
      return
    }

    setVoteMap(map => ({
      ...map,
      [reviewId]: { myVote: data.myVote, helpfulCount: data.helpfulCount, unhelpfulCount: data.unhelpfulCount }
    }))
  }

  const voteProps = (view: any) => ({
    vote: getVote(view),
    isVoting: votingId === view.review.id,
    onVote: handleVote
  })

  // --- Cửa sổ "Читать полностью": chỉ tải toàn bộ đánh giá khi khách bấm ---
  const closeModal = useCallback(() => {
    setModal(null)
    modalLastFocus.current?.focus()
  }, [])

  const openModal = async (reviewId: string, button: HTMLElement) => {
    modalLastFocus.current = button
    setModal({ view: null })
    requestAnimationFrame(() => modalCloseRef.current?.focus())
    try {
      const payload = await getJson(`/review/item/${reviewId}`)
      if(!payload.data?.view) throw new Error("empty")
      setModal(current => current ? { view: payload.data.view } : current)
    } catch {
      closeModal()
      showToast(errorText, "error")
    }
  }

  const isModalOpen = modal !== null
  useEffect(() => {
    if(!isModalOpen) return
    document.body.classList.add("sf-modal-open")
    const onKeyDown = (event: KeyboardEvent) => {
      // Đang xem ảnh lớn (mở từ trong cửa sổ): phím Esc chỉ đóng ảnh
      if(event.key === "Escape" && !isLightboxOpen()) closeModal()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.classList.remove("sf-modal-open")
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isModalOpen, closeModal, isLightboxOpen])

  return (
    <section className="sf-reviews" id="reviews">
      <div className="sf-section-heading">
        <div>
          <h2>
            {t("reviewsTitle")}
            {props.reviewCount > 0 && <span className="sf-reviews-count">{formatNumber(props.reviewCount)}</span>}
          </h2>
        </div>
      </div>

      <div className={cx("sf-review-overview", hasCustomerPhotos && "has-photos")}>
        <aside className="sf-review-summary">
          {reviewSummary.total > 0 ? (
            <>
              <div className="sf-review-score">
                <b>{formatNumber(props.rating)}</b>
                <div>
                  <RatingStars rating={props.rating} size="lg" lang={lang} />
                  <span>{tCount(reviewSummary.total, "ratingCount")}</span>
                </div>
              </div>
              <ul className="sf-review-bars">
                {reviewSummary.distribution.map((row: any) => (
                  <li key={row.star}>
                    <button
                      type="button"
                      disabled={row.count == 0 || !(props.reviewCount > 0)}
                      aria-label={`${row.star} ${t("ratingOutOf")}: ${row.count}`}
                      onClick={() => filterByRating(`${row.star}`, true)}
                    >
                      <span className="sf-review-bar-star">
                        {row.star}
                        <i className="fas fa-star"></i>
                      </span>
                      <span className="sf-review-bar">
                        <span style={{ width: `${row.percent}%` }}></span>
                      </span>
                      <span className="sf-review-bar-count">{formatNumber(row.count)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="sf-review-none">
              <RatingStars rating={0} size="lg" lang={lang} />
              <b>{t("reviewsNone")}</b>
              <p>{t("reviewsNoneText")}</p>
            </div>
          )}
          {/* Nút "Написать отзыв": chỉ khách đã nhận đơn có sản phẩm này */}
          <div className="sf-review-action">
            {reviewAction && reviewAction.type == "write" ? (
              <Link href={reviewAction.url} className="sf-btn sf-btn-primary sf-review-write-btn">
                <i className="fas fa-pen"></i>
                {t("reviewWriteButton")}
              </Link>
            ) : reviewAction && reviewAction.type == "edit" ? (
              <Link href={reviewAction.url} className="sf-btn sf-btn-outline sf-review-write-btn">
                <i className="fas fa-user-check"></i>
                {t("reviewYours")}
                {reviewAction.statusName && <small> · {reviewAction.statusName}</small>}
              </Link>
            ) : (
              <p className="sf-review-buyers-note">
                <i className="fas fa-info-circle"></i>
                {t("reviewOnlyBuyers")}
              </p>
            )}
          </div>
        </aside>

        {hasCustomerPhotos && (
          <div className="sf-review-gallery">
            <h3>
              {t("reviewCustomerPhotos")}
              <span>{formatNumber(reviewSummary.photoReviewCount)}</span>
            </h3>
            <ul>
              {photoUrlList.map((url, index) => (
                <li key={url}>
                  <button type="button" aria-label={`${t("reviewPhoto")} ${index + 1}`} onClick={() => openLightbox(photoLargeList, index)}>
                    <img src={sizedUrl(url, 160)} srcSet={sizedSrcSet(url, 160)} alt="" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {props.reviewCount > 0 && (
        <>
          <div className="sf-review-toolbar" ref={toolbarRef}>
            <div className="sf-chip-list" role="group">
              <button
                type="button"
                className={cx("sf-chip", !filter.rating && !filter.photo && "active")}
                aria-pressed={!filter.rating && !filter.photo}
                onClick={() => filterByRating("", false)}
              >
                {t("reviewFilterAll")}
              </button>
              {reviewSummary.photoReviewCount > 0 && (
                <button
                  type="button"
                  className={cx("sf-chip", filter.photo && "active")}
                  aria-pressed={filter.photo}
                  onClick={() => setFilter({ ...filter, photo: !filter.photo })}
                >
                  <i className="fas fa-camera"></i>
                  {t("reviewFilterPhoto")}
                </button>
              )}
              {[5, 4, 3, 2, 1].map(star => {
                const starRow = reviewSummary.distribution.find((row: any) => row.star == star)
                if(!starRow || !(starRow.count > 0)) return null
                return (
                  <button
                    key={star}
                    type="button"
                    className={cx("sf-chip", filter.rating === `${star}` && "active")}
                    aria-pressed={filter.rating === `${star}`}
                    onClick={() => filterByRating(`${star}`, false)}
                  >
                    {star}
                    <i className="fas fa-star"></i>
                  </button>
                )
              })}
            </div>
            <label className="sf-review-sort">
              <span>{t("reviewSortLabel")}</span>
              <select value={filter.sort} onChange={event => setFilter({ ...filter, sort: event.target.value })}>
                {props.reviewSortList.map(item => (
                  <option key={item.id} value={item.id}>{t(item.key)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="sf-review-slider">
            <button type="button" className="sf-slider-arrow is-prev" aria-label={t("previous")} disabled={!arrows.prev} onClick={() => scrollReviews(-1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div
              ref={trackRef}
              className={cx("sf-review-track", isLoading && "is-loading")}
              tabIndex={0}
              role="region"
              aria-label={t("reviewsTitle")}
              aria-live="polite"
            >
              {viewList.map(view => (
                <ReviewCard key={view.review.id} view={view} lang={lang} fileUrl={fileUrl} onReadMore={openModal} {...voteProps(view)} />
              ))}
              {result.page == 1 && result.total == 0 && (
                <p className="sf-review-empty-filter">{t("reviewFilterEmpty")}</p>
              )}
              {result.hasMore && (
                <div ref={moreRef} className={cx("sf-review-more", isLoadingMore && "is-loading")}>
                  <button type="button" className="sf-btn sf-btn-outline" onClick={loadMore}>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{t("reviewShowMore")}</span>
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="sf-slider-arrow is-next" aria-label={t("next")} disabled={!arrows.next} onClick={() => scrollReviews(1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </>
      )}

      <div
        className="sf-review-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("reviewsTitle")}
        hidden={!modal}
        // Bấm ra vùng tối xung quanh thì đóng
        onClick={event => { if(event.target === event.currentTarget) closeModal() }}
      >
        <div className="sf-review-modal-box">
          <button type="button" ref={modalCloseRef} className="sf-review-modal-close" aria-label={t("close")} onClick={closeModal}>
            <i className="fas fa-times"></i>
          </button>
          <div className="sf-review-modal-body">
            {modal && (modal.view
              ? <ReviewItem view={modal.view} lang={lang} fileUrl={fileUrl} {...voteProps(modal.view)} />
              : <div className="sf-review-modal-loading"><i className="fas fa-spinner fa-spin"></i></div>)}
          </div>
        </div>
      </div>
    </section>
  )
}
