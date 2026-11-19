"use client"

import { useEffect, useImperativeHandle, useRef, useState } from "react"
import Swal from "sweetalert2"
import { isVideoPath } from "@/lib/admin"
import { cx } from "@/lib/format"
import { adminCall } from "./api"
import { useAdmin } from "./AdminProvider"

// ===== Các ô nhập dùng lại ở các form admin =====

// --- Kiểm tra dữ liệu trước khi gửi (thay cho thư viện JustValidate của giao diện cũ) ---
// rules: { tênÔ: [{ test: (giáTrị, tấtCảGiáTrị) => đúng / sai, message: lời báo lỗi }] }
export type Rule = { test: (value: string, values: { [name: string]: string }) => boolean, message: string }
export type Rules = { [name: string]: Rule[] }
export type Errors = { [name: string]: string }

export const required = (message: string): Rule => ({ test: value => value.trim() !== "", message })
export const isEmail = (message: string): Rule => ({ test: value => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message })
export const minLength = (length: number, message: string): Rule => ({ test: value => value === "" || value.length >= length, message })
export const maxLength = (length: number, message: string): Rule => ({ test: value => value.length <= length, message })
export const custom = (test: Rule["test"], message: string): Rule => ({ test, message })

// Trả về lỗi của từng ô (ô đúng thì không có trong kết quả)
export const validate = (values: { [name: string]: string }, rules: Rules): Errors => {
  const errors: Errors = {}
  for (const [name, ruleList] of Object.entries(rules)) {
    const failed = ruleList.find(rule => !rule.test(values[name] ?? "", values))
    if(failed) errors[name] = failed.message
  }
  return errors
}

// Giá trị các ô của form dạng { tên: giá trị } (ô tick: "on" nếu được tick, không có nếu không tick)
export const formValues = (form: HTMLFormElement): { [name: string]: string } => {
  const values: { [name: string]: string } = {}
  new FormData(form).forEach((value, key) => {
    if(typeof value === "string" && !(key in values)) values[key] = value
  })
  return values
}

// Đưa con trỏ vào ô đầu tiên bị lỗi
export const focusFirstError = (form: HTMLFormElement, errors: Errors) => {
  const name = Object.keys(errors)[0]
  if(!name) return
  const input = form.querySelector<HTMLElement>(`[name="${name}"]`)
  if(input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" })
    input.focus({ preventScroll: true })
  }
}

// Dòng báo lỗi dưới ô nhập
export function FieldError({ message }: { message?: string }) {
  if(!message) return null
  return <div className="just-validate-error-label" style={{ color: "#b81111" }}>{message}</div>
}

// 1 ô nhập có nhãn và dòng báo lỗi
export function Field({ label, htmlFor, error, hint, className = "mb-3", children }: {
  label?: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      {label && <label className="form-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <div className="form-text">{hint}</div>}
      <FieldError message={error} />
    </div>
  )
}

// Ô chữ thường dùng: <TextField label="Tên *" name="name" defaultValue=... error=... />
export function TextField({ label, name, error, hint, className, type = "text", ...inputProps }: {
  label: React.ReactNode
  name: string
  error?: string
  hint?: React.ReactNode
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} className={className}>
      <input className={cx("form-control", error && "is-invalid")} id={name} type={type} name={name} {...inputProps} />
    </Field>
  )
}

// --- Chọn file (đường dẫn file ở server quản lý file) ---
// Xem trước ảnh / video của đường dẫn đang nhập
function FilePreview({ value }: { value: string }) {
  const { fileSrc } = useAdmin()
  const path = value.trim()
  if(!path) return null
  return (
    <div className="preview-file" style={{ display: "block" }}>
      {isVideoPath(path)
        ? <video src={fileSrc(path)} muted playsInline preload="metadata" controls style={{ display: "block" }}></video>
        : <img src={fileSrc(path)} alt="" />}
    </div>
  )
}

// Nút "Chọn file": mở cửa sổ quản lý file (FileManagerModal), copy đường dẫn file rồi dán vào ô
function ChooseFileButton() {
  return <span className="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#modalFileManager">Chọn file</span>
}

// Ô chọn 1 file (ảnh đại diện,...)
export function FileInput({ label, name, defaultValue = "", placeholder, error }: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  error?: string
}) {
  const [value, setValue] = useState(defaultValue || "")
  return (
    <div>
      <label className="form-label" htmlFor={name}>{label}</label>
      <div className="input-group">
        <ChooseFileButton />
        <input
          className={cx("form-control", error && "is-invalid")}
          id={name}
          type="text"
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={event => setValue(event.target.value)}
        />
      </div>
      <FieldError message={error} />
      <FilePreview value={value} />
    </div>
  )
}

// Ô chọn nhiều file (ví dụ album ảnh sản phẩm), mỗi file 1 dòng, bấm "Thêm ảnh" để thêm dòng
// Các dòng có cùng name: lấy danh sách bằng formData.getAll(name) (bỏ dòng trống)
export function FileMultiple({ label, name, defaultValues = [], buttonText = "Thêm ảnh" }: {
  label: string
  name: string
  defaultValues?: string[]
  buttonText?: string
}) {
  const nextId = useRef(defaultValues.length)
  const [itemList, setItemList] = useState(() => defaultValues.map((value, index) => ({ id: index, value })))

  return (
    <div>
      <label className="form-label">{label}</label>
      <div>
        {itemList.map(item => (
          <div className="file-multiple-item" key={item.id}>
            <div className="input-group">
              <ChooseFileButton />
              <input
                className="form-control"
                type="text"
                name={name}
                value={item.value}
                placeholder="Đường dẫn file..."
                autoFocus={item.id >= defaultValues.length}
                onChange={event => setItemList(list => list.map(other => other.id === item.id ? { ...other, value: event.target.value } : other))}
              />
              <span className="btn btn-outline-danger" title="Xoá" onClick={() => setItemList(list => list.filter(other => other.id !== item.id))}>
                <i className="fa-solid fa-xmark"></i>
              </span>
            </div>
            <FilePreview value={item.value} />
          </div>
        ))}
      </div>
      <span className="btn btn-outline-secondary btn-sm" onClick={() => setItemList(list => [...list, { id: nextId.current++, value: "" }])}>
        <i className="fa-solid fa-plus me-1"></i>
        {buttonText}
      </span>
    </div>
  )
}

// Danh sách đường dẫn file của ô chọn nhiều file (bỏ dòng trống)
export const getFileList = (formData: FormData, name: string): string[] => {
  return formData.getAll(name).map(value => `${value}`.trim()).filter(Boolean)
}

// --- Danh sách ô tick dạng cây (danh mục, quyền,...) ---
// Các ô tick có cùng name: lấy danh sách id đã tick bằng formData.getAll(name)
// - idPrefix: thêm vào trước id của ô tick, dùng khi 1 trang có nhiều danh sách để id không bị trùng
export function CheckboxTree({ list, name, checked = [], idPrefix = "", level = 0 }: {
  list: any[]
  name: string
  checked?: string[]
  idPrefix?: string
  level?: number
}) {
  return (
    <>
      {(list || []).map(item => (
        <div key={item.id} style={{ display: "contents" }}>
          <div className="checkbox-item" style={{ marginLeft: `${level * 20}px` }}>
            <input type="checkbox" id={`${idPrefix}${item.id}`} name={name} value={item.id} defaultChecked={checked.includes(item.id)} />
            <label htmlFor={`${idPrefix}${item.id}`}>{item.name}</label>
          </div>
          {item.children && item.children.length > 0 && (
            <CheckboxTree list={item.children} name={name} checked={checked} idPrefix={idPrefix} level={level + 1} />
          )}
        </div>
      ))}
    </>
  )
}

// Các <option> của ô chọn dạng cây (danh mục cha), danh mục con thụt vào bằng "--"
export function TreeOptions({ list, level = 0 }: { list: any[], level?: number }): React.ReactNode {
  return (list || []).map(item => [
    <option key={item.id} value={item.id}>{"--".repeat(level)} {item.name}</option>,
    item.children && item.children.length > 0 ? <TreeOptions key={`${item.id}-children`} list={item.children} level={level + 1} /> : null
  ])
}

// --- Nút "Tự động" tạo đường dẫn (slug) từ tên ---
// - model: tên model ở server để kiểm tra đường dẫn chưa bị trùng, from / to: tên ô lấy chữ / ô điền đường dẫn
export function SlugButton({ model, from, to }: { model: string, from: string, to: string }) {
  const handleClick = async (event: React.MouseEvent<HTMLSpanElement>) => {
    const form = event.currentTarget.closest("form")
    const fromInput = form?.querySelector<HTMLInputElement>(`[name="${from}"]`)
    const toInput = form?.querySelector<HTMLInputElement>(`[name="${to}"]`)
    if(!fromInput || !toInput) return

    const data = await adminCall("/helper/generate-slug", "POST", { string: fromInput.value, modelName: model })
    if(data) {
      toInput.value = data.slug
      toInput.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }

  return <span className="btn btn-outline-info" onClick={handleClick}>Tự động</span>
}

// Ô đường dẫn có nút "Tự động"
export function SlugField({ label = "Đường dẫn *", model, from = "name", name = "slug", defaultValue, error }: {
  label?: string
  model: string
  from?: string
  name?: string
  defaultValue?: string
  error?: string
}) {
  return (
    <Field label={label} htmlFor={name} error={error}>
      <div className="input-group">
        <SlugButton model={model} from={from} to={name} />
        <input className={cx("form-control", error && "is-invalid")} id={name} type="text" name={name} defaultValue={defaultValue} />
      </div>
    </Field>
  )
}

// --- Ô mật khẩu có nút con mắt hiện / ẩn mật khẩu ---
export function PasswordInput({ name, id, placeholder, autoComplete, error }: {
  name: string
  id?: string
  placeholder?: string
  autoComplete?: string
  error?: string
}) {
  const [isShown, setIsShown] = useState(false)
  return (
    <>
      <div className="input-group">
        <input
          className={cx("form-control", error && "is-invalid")}
          id={id || name}
          type={isShown ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          title={isShown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-label={isShown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setIsShown(!isShown)}
        >
          <i className={isShown ? "fa-regular fa-eye-slash" : "fa-regular fa-eye"}></i>
        </button>
      </div>
      <FieldError message={error} />
    </>
  )
}

// --- Trình soạn thảo (Quill) ---
// Lấy nội dung HTML bằng ref: editorRef.current?.getContent()
export type EditorHandle = { getContent: () => string }

export function Editor({ defaultValue = "", ref }: { defaultValue?: string, ref: React.Ref<EditorHandle> }) {
  const { fileUrl } = useAdmin()
  const containerRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)
  // Không tải được Quill thì dùng ô textarea thường để vẫn nhập được nội dung
  const [isFallback, setIsFallback] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    getContent: () => {
      const quill = quillRef.current
      if(quill) {
        // Ô soạn thảo trống thì trả về chuỗi rỗng, bỏ các dòng trống thừa ở cuối
        return quill.getLength() > 1 ? quill.getSemanticHTML().replace(/(<p><\/p>)+$/, "") : ""
      }
      return textareaRef.current ? textareaRef.current.value : defaultValue
    }
  }))

  useEffect(() => {
    let isCancelled = false
    const container = containerRef.current
    if(!container) return

    // Thư viện Quill chỉ tải ở trang có trình soạn thảo
    Promise.all([import("quill"), import("quill/dist/quill.snow.css" as string)]).then(([module]) => {
      if(isCancelled || quillRef.current) return
      const Quill: any = module.default

      // Khi lấy HTML, Quill mặc định đổi video thành thẻ <a>, sửa lại để giữ nguyên thẻ <iframe>
      const Video: any = Quill.import("formats/video")
      class VideoEmbed extends Video {
        html() {
          return (this as any).domNode.outerHTML
        }
      }
      Quill.register(VideoEmbed, true)

      // Hỏi đường dẫn ảnh / video, điền sẵn địa chỉ server quản lý file
      // (chỉ cần dán thêm đường dẫn file đã copy ở trang Quản lý file)
      const insertMedia = async (quill: any, type: "image" | "video") => {
        const range = quill.getSelection(true)
        const result = await Swal.fire({
          title: type === "image" ? "Chèn ảnh" : "Chèn video",
          input: "text",
          inputValue: fileUrl,
          showCancelButton: true,
          confirmButtonText: "Chèn",
          cancelButtonText: "Huỷ"
        })
        let link: string = result.isConfirmed ? result.value : ""
        if(!link) return

        // Link YouTube => đổi sang link nhúng để phát được trong bài viết
        const youtube = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
        if(type === "video" && youtube) {
          link = `https://www.youtube.com/embed/${youtube[1]}`
        }

        quill.insertEmbed(range.index, type, link, "user")
        quill.setSelection(range.index + 1, 0)
      }

      const editorElement = document.createElement("div")
      container.append(editorElement)

      const quill = new Quill(editorElement, {
        theme: "snow",
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, 4, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ align: [] }],
              [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
              ["blockquote", "code-block"],
              ["link", "image", "video"],
              ["clean"]
            ],
            handlers: {
              image: () => insertMedia(quill, "image"),
              video: () => insertMedia(quill, "video")
            }
          },
          // Không chèn ảnh dạng base64 khi kéo thả / dán file ảnh (làm database rất nặng)
          uploader: { mimetypes: [] }
        }
      })

      // Hiển thị nội dung cũ (HTML)
      quill.setContents(quill.clipboard.convert({ html: defaultValue }), "silent")
      quill.history.clear()
      quillRef.current = quill
    }).catch((error) => {
      console.error("Không tải được thư viện Quill", error)
      if(!isCancelled) setIsFallback(true)
    })

    return () => {
      isCancelled = true
      quillRef.current = null
      container.replaceChildren()
    }
    // Chỉ tạo trình soạn thảo 1 lần khi trang mở
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div ref={containerRef}></div>
      {isFallback && <textarea ref={textareaRef} className="form-control" rows={8} defaultValue={defaultValue}></textarea>}
    </>
  )
}

// --- Gửi form admin ---
// 1. Kiểm tra dữ liệu theo rules, có lỗi thì hiện lỗi dưới ô và dừng
// 2. build tạo dữ liệu gửi đi (FormData) từ giá trị các ô
// 3. Gửi lên server; thành công thì tải lại trang và hiện thông báo (hoặc gọi onSuccess)
type SubmitOptions = {
  api: string // đường dẫn sau /admin, ví dụ "/article/create"
  method?: string
  rules?: Rules | ((values: { [name: string]: string }) => Rules)
  build: (values: { [name: string]: string }, raw: FormData) => FormData | object
  onSuccess?: (data: any) => void
}

export function useAdminSubmit({ api, method = "POST", rules, build, onSuccess }: SubmitOptions) {
  const [errors, setErrors] = useState<Errors>({})
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = formValues(form)

    const ruleMap = typeof rules === "function" ? rules(values) : (rules || {})
    const newErrors = validate(values, ruleMap)
    setErrors(newErrors)
    if(Object.keys(newErrors).length > 0) {
      focusFirstError(form, newErrors)
      return
    }

    setIsSending(true)
    const data = await adminCall(api, method, build(values, new FormData(form)))
    if(data) {
      if(onSuccess) {
        onSuccess(data)
      }
      else {
        const { drawNotify } = await import("./notify")
        drawNotify(data.code, data.message || "")
        return
      }
    }
    setIsSending(false)
  }

  return { errors, setErrors, isSending, handleSubmit }
}

// Tạo FormData từ danh sách [tên, giá trị]
export const toFormData = (entries: { [name: string]: string | number | boolean | null | undefined }): FormData => {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value === null || value === undefined ? "" : `${value}`)
  }
  return formData
}

// Hai nút cuối form: gửi và huỷ (quay lại danh sách)
export function FormButtons({ submitLabel, cancelHref, isSending }: { submitLabel: string, cancelHref?: string, isSending: boolean }) {
  return (
    <>
      <button className="btn btn-primary" type="submit" disabled={isSending}>{submitLabel}</button>
      {cancelHref && <a className="btn btn-danger ms-1" href={cancelHref}>Hủy</a>}
    </>
  )
}
