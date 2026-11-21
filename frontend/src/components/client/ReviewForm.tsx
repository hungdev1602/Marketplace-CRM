"use client"

import { useEffect, useRef, useState } from "react"
import { sendForm, sendJson } from "@/lib/api-client"
import { cx } from "@/lib/format"
import { sizedUrl } from "@/lib/media"
import { createTranslator } from "@/lib/i18n"
import { goTo } from "@/lib/top-loader"
import { saveToastForNextPage } from "./Toast"

// ===== Form viết / sửa đánh giá sản phẩm (trang /review/write/:code/:productId) =====
// Chọn sao, viết ưu / nhược điểm, nhận xét, gửi ảnh (thu nhỏ ảnh ngay trên trình duyệt trước khi gửi)
// Server trả về JSON { code, message, field, redirect } (server/controller/client/review.controller.ts)

type Photo =
  | { id: string, keep: string } // ảnh cũ giữ lại khi sửa đánh giá (đường dẫn trên server quản lý file)
  | { id: string, blob: Blob, url: string } // ảnh mới chọn (đã thu nhỏ), url để xem trước

type Props = {
  lang: string
  fileUrl: string
  formAction: string // "/review/write/:code/:productId"
  accessKey: string
  review: any | null // đánh giá đã viết (đang sửa)
  statusName: string
  initialRating: number
  authorName: string // tên hiện công khai, ví dụ "Анна К."
  limits: { maxPhotos: number, photoMaxSide: number, photoMaxSize: number, text: { [name: string]: number } }
  moderation: boolean
  editUntilText: string
}

const textFieldList = [
  { name: "pros", rows: 3, titleKey: "reviewPros", placeholderKey: "reviewProsPlaceholder" },
  { name: "cons", rows: 3, titleKey: "reviewCons", placeholderKey: "reviewConsPlaceholder" },
  { name: "comment", rows: 5, titleKey: "reviewComment", placeholderKey: "reviewCommentPlaceholder" }
]

export function ReviewForm(props: Props) {
  const { lang, review, limits } = props
  const { t } = createTranslator(lang)
  const isEdit = !!review
  const maxPhotos = limits.maxPhotos || 5
  const maxSide = limits.photoMaxSide || 1600
  const maxSize = (limits.photoMaxSize || 10) * 1024 * 1024
  const ratingHintList = [1, 2, 3, 4, 5].map(star => t(`ratingHint${star}`))

  const [rating, setRating] = useState(props.initialRating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [isRatingInvalid, setIsRatingInvalid] = useState(false)
  const [textMap, setTextMap] = useState<{ [name: string]: string }>({
    pros: review?.pros || "",
    cons: review?.cons || "",
    comment: review?.comment || ""
  })
  const [isAnonymous, setIsAnonymous] = useState(Boolean(isEdit && review.anonymous))
  const [photoList, setPhotoList] = useState<Photo[]>(
    ((isEdit && review.photos) || []).map((photo: string) => ({ id: photo, keep: photo }))
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState("")
  const [invalidField, setInvalidField] = useState("")

  const starInputRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const photoCount = useRef(0)

  // Rời trang thì giải phóng ảnh xem trước
  const photoListRef = useRef(photoList)
  photoListRef.current = photoList
  useEffect(() => {
    return () => {
      for (const photo of photoListRef.current) {
        if("url" in photo) URL.revokeObjectURL(photo.url)
      }
    }
  }, [])

  // Thu nhỏ ảnh (cạnh dài nhất maxSide px) và đổi sang JPG ngay trên trình duyệt:
  // ảnh điện thoại 5-10MB còn khoảng vài trăm KB, gửi nhanh hơn, không tốn dung lượng server
  // Trình duyệt tự xoay ảnh theo thông tin chụp (EXIF) khi vẽ lên canvas
  const resizePhoto = (file: File) => new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext("2d")
      if(!context) {
        URL.revokeObjectURL(url)
        reject(new Error("canvas"))
        return
      }
      context.fillStyle = "#FFFFFF" // ảnh PNG nền trong suốt: tô nền trắng
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("toBlob")), "image/jpeg", 0.85)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("decode"))
    }
    image.src = url
  })

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = [...(event.target.files || [])]
    event.target.value = "" // chọn lại đúng ảnh vừa bỏ vẫn nhận được
    if(fileList.length === 0) return

    setMessage("")
    const freeCount = maxPhotos - photoList.length
    if(fileList.length > freeCount) {
      setMessage(t("reviewPhotoTooMany").replace("{count}", `${maxPhotos}`))
    }

    setIsProcessing(true)
    const newList: Photo[] = []
    for (const file of fileList.slice(0, Math.max(0, freeCount))) {
      // Trình duyệt không đọc được (file không phải ảnh, ảnh hỏng, định dạng lạ như HEIC trên máy tính): báo lỗi
      let blob: Blob | null = null
      try {
        blob = await resizePhoto(file)
      } catch {}
      if(!blob) {
        setMessage(t("reviewPhotoInvalid"))
        continue
      }
      if(blob.size > maxSize) {
        setMessage(t("reviewPhotoTooLarge").replace("{size}", `${limits.photoMaxSize}`))
        continue
      }
      newList.push({ id: `new-${++photoCount.current}`, blob: blob, url: URL.createObjectURL(blob) })
    }
    setPhotoList(list => [...list, ...newList])
    setIsProcessing(false)
  }

  const removePhoto = (photo: Photo) => {
    if("url" in photo) URL.revokeObjectURL(photo.url)
    setPhotoList(list => list.filter(item => item.id !== photo.id))
  }

  // Gửi đánh giá
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")
    setInvalidField("")

    if(!rating) {
      setMessage(t("reviewRatingRequired"))
      setIsRatingInvalid(true)
      starInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    const formData = new FormData()
    formData.append("key", props.accessKey)
    formData.append("rating", `${rating}`)
    formData.append("pros", textMap.pros)
    formData.append("cons", textMap.cons)
    formData.append("comment", textMap.comment)
    formData.append("anonymous", isAnonymous ? "1" : "")
    // Ảnh cũ giữ lại (khi sửa đánh giá)
    formData.append("keepPhotos", JSON.stringify(photoList.filter(photo => "keep" in photo).map(photo => (photo as { keep: string }).keep)))
    // Ảnh mới
    photoList.forEach((photo, index) => {
      if("blob" in photo) formData.append("photos", photo.blob, `photo-${index + 1}.jpg`)
    })

    setIsSending(true)
    const result = await sendForm(props.formAction, "POST", formData, t("errorGeneral"))

    if(result.code === "success") {
      if(result.message) saveToastForNextPage(result.message)
      goTo(result.redirect || "/")
      return
    }

    setMessage(result.message || "")
    if(result.field && result.field !== "rating") {
      setInvalidField(result.field)
      formRef.current?.querySelector<HTMLElement>(`[name="${result.field}"]`)?.focus()
    }
    setIsSending(false)
  }

  // Xoá đánh giá
  const handleDelete = async () => {
    if(!confirm(t("reviewDeleteConfirm"))) return
    setIsDeleting(true)
    const result = await sendJson(`${props.formAction}/delete`, "POST", { key: props.accessKey }, t("errorGeneral"))
    if(result.code === "success") {
      if(result.message) saveToastForNextPage(result.message)
      goTo(result.redirect || "/")
      return
    }
    setMessage(result.message || "")
    setIsDeleting(false)
  }

  const shownRating = hoverRating || rating

  return (
    <form ref={formRef} action={props.formAction} className="sf-account-box sf-review-form" noValidate onSubmit={handleSubmit}>
      {isEdit && (
        <div className={`sf-review-status is-${review.status}`}>
          <span>{t("reviewStatusLabel")}:</span>
          <b>{props.statusName}</b>
          {review.status == "rejected" && (
            <p>
              {t("reviewRejectedText")}
              {review.rejectReason && `: ${review.rejectReason}`}. {t("reviewRejectedHint")}
            </p>
          )}
        </div>
      )}

      {/* Số sao: chữ gợi ý (Ужасно ... Отлично) theo sao đang chọn / đang rê chuột */}
      <fieldset className="sf-field sf-rating-field">
        <legend>{t("reviewRateLabel")}</legend>
        <div className="sf-rating-input-row">
          <div ref={starInputRef} className={cx("sf-star-input", isRatingInvalid && "is-invalid")}>
            {[5, 4, 3, 2, 1].map(star => [
              <input
                key={`input-${star}`}
                type="radio"
                id={`rating-${star}`}
                name="rating"
                value={star}
                checked={rating == star}
                onChange={() => {
                  setRating(star)
                  setIsRatingInvalid(false)
                  setMessage("")
                }}
              />,
              <label
                key={`label-${star}`}
                htmlFor={`rating-${star}`}
                title={ratingHintList[star - 1]}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <i className="fas fa-star"></i>
                <span className="visually-hidden">{star} — {ratingHintList[star - 1]}</span>
              </label>
            ])}
          </div>
          <span className="sf-rating-hint">{shownRating ? ratingHintList[shownRating - 1] : ""}</span>
        </div>
      </fieldset>

      {textFieldList.map(field => (
        <div className="sf-field" key={field.name}>
          <label htmlFor={`field-${field.name}`}>
            {t(field.titleKey)}
            <span className="sf-field-optional">{t("optional")}</span>
          </label>
          <textarea
            id={`field-${field.name}`}
            name={field.name}
            rows={field.rows}
            maxLength={limits.text?.[field.name]}
            placeholder={t(field.placeholderKey)}
            value={textMap[field.name]}
            aria-invalid={invalidField === field.name ? true : undefined}
            onChange={event => {
              setTextMap({ ...textMap, [field.name]: event.target.value })
              if(invalidField === field.name) setInvalidField("")
            }}
          ></textarea>
          {/* Đếm số ký tự đã nhập */}
          <span className="sf-text-counter">{textMap[field.name].length} / {limits.text?.[field.name]}</span>
        </div>
      ))}

      <div className="sf-field">
        <span className="sf-field-title">
          {t("reviewPhotos")}
          <span className="sf-field-optional">{t("optional")}</span>
        </span>
        <ul className="sf-review-upload">
          {photoList.map(photo => (
            <li className="sf-review-upload-item" key={photo.id}>
              <img src={"keep" in photo ? sizedUrl(`${props.fileUrl}${photo.keep}`, 320) : photo.url} alt="" />
              <button
                type="button"
                className="sf-review-upload-remove"
                aria-label={t("reviewRemovePhoto")}
                title={t("reviewRemovePhoto")}
                onClick={() => removePhoto(photo)}
              >
                <i className="fas fa-times"></i>
              </button>
            </li>
          ))}
          <li className="sf-review-upload-add" hidden={photoList.length >= maxPhotos}>
            <label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoChange} />
              <i className="fas fa-camera"></i>
              <span>{t("reviewAddPhoto")}</span>
            </label>
          </li>
        </ul>
        <p className="sf-field-hint">{t("reviewPhotosHint").replace("{count}", `${maxPhotos}`)}</p>
        <p className="sf-field-hint" hidden={!isProcessing}>
          <i className="fas fa-spinner fa-spin"></i> {t("reviewPhotoProcessing")}
        </p>
      </div>

      {/* Tên hiện công khai: tick "Оставить отзыв анонимно" thì đổi thành "Покупатель" */}
      <div className="form-check sf-check">
        <input
          className="form-check-input"
          type="checkbox"
          id="field-anonymous"
          name="anonymous"
          value="1"
          checked={isAnonymous}
          onChange={event => setIsAnonymous(event.target.checked)}
        />
        <label className="form-check-label" htmlFor="field-anonymous">{t("reviewAnonymousLabel")}</label>
      </div>
      <p className="sf-review-author-preview">
        {t("reviewAuthorPreview")}
        <b>{isAnonymous ? t("reviewAnonymous") : props.authorName}</b>
      </p>

      <div className="sf-review-notes">
        {props.moderation && (
          <p>
            <i className="fas fa-shield-alt"></i>
            {t("reviewModerationNote")}
          </p>
        )}
        <p>
          <i className="fas fa-info-circle"></i>
          {t("reviewRulesNote")}
        </p>
        {isEdit && props.editUntilText && (
          <p>
            <i className="far fa-clock"></i>
            {t("reviewEditUntil")} {props.editUntilText}
          </p>
        )}
      </div>

      <p className="sf-form-message is-error" role="alert" hidden={!message}>{message}</p>

      <div className="sf-review-actions">
        <button type="submit" className="sf-btn sf-btn-primary" disabled={isSending || isProcessing}>
          <i className="fas fa-paper-plane"></i>
          {t(isEdit ? "reviewSave" : "reviewSubmit")}
        </button>
        {isEdit && (
          <button type="button" className="sf-btn sf-btn-outline sf-review-delete" disabled={isDeleting} onClick={handleDelete}>
            <i className="far fa-trash-alt"></i>
            {t("reviewDelete")}
          </button>
        )}
      </div>
    </form>
  )
}
