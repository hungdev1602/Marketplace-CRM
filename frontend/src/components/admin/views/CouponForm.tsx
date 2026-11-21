"use client"

import { useState } from "react"
import { adminUrl } from "@/lib/admin"
import { cx, formatPrice } from "@/lib/format"
import { adminRequest } from "../api"
import { useAdmin } from "../AdminProvider"
import { CheckboxTree, Field, FieldError, FormButtons, TextField, custom, required, toFormData, useAdminSubmit } from "../form"
import { notifyError } from "../notify"

// ===== Form mã giảm giá (tạo mới / chỉnh sửa) =====
// Các ô ẩn / hiện theo loại giảm giá và phạm vi áp dụng:
// - Miễn phí giao hàng: không có mức giảm, áp dụng cho cả đơn hàng
// - Giảm theo %: có thêm ô "Giảm tối đa"
// - Phạm vi "Danh mục" / "Sản phẩm": chọn danh mục / tìm và chọn sản phẩm

type PickerProduct = { id: string, name: string, nameRu?: string, sku?: string, avatar?: string, priceFormat?: string, deleted?: boolean, status?: string }

// Chọn sản phẩm áp dụng mã giảm giá: tìm sản phẩm rồi bấm "Chọn"
function ProductPicker({ selectedList, setSelectedList, error }: {
  selectedList: PickerProduct[]
  setSelectedList: (list: PickerProduct[]) => void
  error?: string
}) {
  const { fileSrc } = useAdmin()
  const [keyword, setKeyword] = useState("")
  const [resultList, setResultList] = useState<PickerProduct[] | null>(null)

  const search = async () => {
    const data = await adminRequest(`/coupon/product-search?keyword=${encodeURIComponent(keyword.trim())}`)
    if(data.code === "error") {
      notifyError(data.message || "Tìm sản phẩm thất bại, vui lòng tải lại trang và thử lại!")
      return
    }
    setResultList(data.productList || [])
  }

  // Ảnh, tên, SKU, giá của 1 sản phẩm
  const productInfo = (product: PickerProduct) => (
    <div className="d-flex align-items-center gap-2 flex-grow-1">
      {product.avatar
        ? <img src={fileSrc(product.avatar, 160)} className="thumb-md rounded" style={{ objectFit: "contain" }} alt="" />
        : <span className="thumb-md rounded bg-light d-inline-block"></span>}
      <div>
        <div className="fw-medium">
          {product.name}
          {product.deleted && <span className="badge bg-danger ms-1">Trong thùng rác</span>}
          {product.status === "inactive" && <span className="badge bg-secondary ms-1">Ngừng bán</span>}
        </div>
        <div className="small text-muted">
          {product.sku ? `SKU: ${product.sku} · ` : ""}{product.priceFormat}
        </div>
      </div>
    </div>
  )

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="productSearchInput">Sản phẩm được áp dụng *</label>
      <div className="input-group mb-2">
        <input
          className="form-control"
          id="productSearchInput"
          type="text"
          placeholder="Tìm theo tên (Việt / Nga), SKU, mã vạch, thương hiệu..."
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          // Nhấn Enter ở ô tìm kiếm thì tìm sản phẩm (không gửi form)
          onKeyDown={event => {
            if(event.key === "Enter") {
              event.preventDefault()
              search()
            }
          }}
        />
        <span className="btn btn-outline-secondary" onClick={search}>
          <i className="fa-solid fa-magnifying-glass me-1"></i>
          Tìm
        </span>
      </div>
      <div className="list-group coupon-product-list mb-3">
        {resultList && resultList.length === 0 && <div className="list-group-item text-muted small">Không tìm thấy sản phẩm nào</div>}
        {(resultList || []).map(product => {
          const isSelected = selectedList.some(item => item.id === product.id)
          return (
            <div className="list-group-item d-flex align-items-center gap-2" key={product.id}>
              {productInfo(product)}
              {isSelected ? (
                <span className="btn btn-sm btn-success disabled"><i className="fa-solid fa-check me-1"></i>Đã chọn</span>
              ) : (
                <span className="btn btn-sm btn-outline-primary" onClick={() => setSelectedList([...selectedList, product])}>Chọn</span>
              )}
            </div>
          )
        })}
      </div>
      <label className="form-label">
        Đã chọn
        <span className="badge bg-primary ms-1">{selectedList.length}</span>
      </label>
      <div className="list-group coupon-product-list">
        {selectedList.length === 0 ? (
          <div className="list-group-item text-muted small">Chưa chọn sản phẩm nào, hãy tìm sản phẩm ở ô bên trên rồi bấm &quot;Chọn&quot;</div>
        ) : selectedList.map(product => (
          <div className="list-group-item d-flex align-items-center gap-2" key={product.id}>
            {productInfo(product)}
            <span className="btn btn-sm btn-outline-danger" title="Bỏ chọn" onClick={() => setSelectedList(selectedList.filter(item => item.id !== product.id))}>
              <i className="fa-solid fa-xmark"></i>
            </span>
          </div>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  )
}

// Định dạng tiền rúp kiểu Nga, ví dụ: 3334 => "3 334 ₽"
const formatRub = formatPrice

// Lời nhắc dưới ô "Giảm tối đa" (loại giảm theo %): đơn từ bao nhiêu thì được giảm đủ mức tối đa
// Ví dụ giảm 15% tối đa 500 ₽: đơn từ 3 334 ₽ mới được giảm đủ 500 ₽, đơn 300 ₽ chỉ được giảm 45 ₽
const getMaxDiscountHint = (percentText: string, maxDiscountText: string, minOrderText: string): string => {
  const percent = Number(percentText)
  const maxDiscount = Number(maxDiscountText)
  if(maxDiscountText.trim() === "" || !(maxDiscount > 0) || !(percent > 0 && percent <= 100)) return ""

  // Đơn nhỏ nhất được giảm đủ mức tối đa, làm tròn lên đến rúp (toFixed để bỏ sai số khi chia số thập phân)
  const fullDiscountOrder = Math.ceil(Number((maxDiscount * 100 / percent).toFixed(2)))
  let hint = `Đơn từ ${formatRub(fullDiscountOrder)} mới được giảm đủ ${formatRub(maxDiscount)}, đơn nhỏ hơn được giảm ${percent}%.`
  const minOrder = Number(minOrderText)
  if(minOrderText.trim() !== "" && minOrder > 0) {
    const minOrderDiscount = minOrder * percent / 100
    hint = minOrderDiscount >= maxDiscount
      ? `Đơn tối thiểu ${formatRub(minOrder)} đã được giảm đủ ${formatRub(maxDiscount)}, nên mọi đơn dùng mã đều được giảm đúng ${formatRub(maxDiscount)}.`
      : `${hint} Ví dụ đơn ${formatRub(minOrder)} (tối thiểu) được giảm ${formatRub(minOrderDiscount)}.`
  }
  return hint
}

// Tạo mã ngẫu nhiên 8 ký tự (bỏ các ký tự dễ nhầm: 0 - O, 1 - I - L)
const randomCode = (): string => {
  const characters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += characters[Math.floor(Math.random() * characters.length)]
  }
  return code
}

const numberValue = (value: any) => value === null || value === undefined ? "" : `${value}`

export function CouponForm({ coupon, selectedProducts = [], categoryTree, options, defaultStartAt }: {
  coupon?: any
  selectedProducts?: PickerProduct[]
  categoryTree: any[]
  options: any
  defaultStartAt?: string
}) {
  // Trang tạo: giá trị mặc định, bắt đầu từ bây giờ
  const item = coupon || { discountType: "percent", applyTo: "all", status: "active", startAtInput: defaultStartAt }

  const [code, setCode] = useState(item.code || "")
  const [discountType, setDiscountType] = useState(item.discountType || "percent")
  const [applyTo, setApplyTo] = useState(item.applyTo || "all")
  const [hintValues, setHintValues] = useState({
    discountValue: numberValue(item.discountValue),
    maxDiscount: numberValue(item.maxDiscount),
    minOrderValue: numberValue(item.minOrderValue)
  })
  const [productList, setProductList] = useState<PickerProduct[]>(selectedProducts)

  const isFreeShipping = discountType === "free-shipping"
  const visible = {
    discountValue: !isFreeShipping,
    maxDiscount: discountType === "percent",
    applyTo: !isFreeShipping,
    categories: !isFreeShipping && applyTo === "category",
    products: !isFreeShipping && applyTo === "product"
  }

  const { errors, setErrors, isSending, handleSubmit } = useAdminSubmit({
    api: coupon ? `/coupon/edit/${coupon.id}` : "/coupon/create",
    method: coupon ? "PATCH" : "POST",
    rules: (values) => ({
      code: [
        required("Vui lòng nhập mã giảm giá!"),
        custom(value => /^[A-Za-z0-9_-]{3,30}$/.test(value.trim()), "Mã gồm 3 - 30 ký tự: chữ cái Latin không dấu, chữ số, dấu - hoặc _ (không có khoảng trắng)!")
      ],
      name: [required("Vui lòng nhập tên chương trình!")],
      ...(visible.discountValue ? {
        discountValue: [
          required("Vui lòng nhập mức giảm!"),
          custom(value => discountType === "percent" ? Number(value) > 0 && Number(value) <= 100 : Number(value) > 0, "Mức giảm phải lớn hơn 0 (giảm theo % thì không quá 100)!")
        ]
      } : {}),
      startAt: [required("Vui lòng chọn thời gian bắt đầu!")],
      endAt: [custom(value => value === "" || value > (values.startAt || ""), "Thời gian kết thúc phải sau thời gian bắt đầu!")],
      ...(visible.categories ? { categories: [custom((_value, all) => Boolean(all.categories), "Vui lòng chọn ít nhất 1 danh mục được áp dụng mã!")] } : {}),
      ...(visible.products ? { products: [custom(() => productList.length > 0, "Vui lòng chọn ít nhất 1 sản phẩm được áp dụng mã!")] } : {})
    }),
    // Dữ liệu gửi lên, ô đang ẩn gửi giá trị trống
    build: (values, raw) => {
      const fieldList = [
        "code", "name", "description", "discountType", "discountValue", "maxDiscount",
        "minOrderValue", "applyTo", "usageLimit", "usageLimitPerCustomer", "startAt", "endAt", "status"
      ]
      const data: { [name: string]: string } = {}
      fieldList.forEach(name => { data[name] = `${values[name] ?? ""}`.trim() })
      data.code = data.code.toUpperCase() // mã luôn là chữ in hoa
      if(!visible.discountValue) data.discountValue = ""
      if(!visible.maxDiscount) data.maxDiscount = ""
      if(!visible.applyTo) data.applyTo = "all"
      data.categories = JSON.stringify(visible.categories ? raw.getAll("categories") : [])
      data.products = JSON.stringify(visible.products ? productList.map(product => product.id) : [])
      return toFormData(data)
    }
  })

  const maxDiscountHint = visible.maxDiscount ? getMaxDiscountHint(hintValues.discountValue, hintValues.maxDiscount, hintValues.minOrderValue) : ""
  const updateHint = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => setHintValues({ ...hintValues, [name]: event.target.value })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-12"><h5 className="border-bottom pb-2 mb-3 mt-2">Thông tin mã</h5></div>
        <div className="col-md-6">
          <Field
            label="Mã giảm giá *"
            htmlFor="code"
            error={errors.code}
            hint="Khách nhập mã này khi thanh toán. Gồm 3 - 30 ký tự: chữ cái Latin không dấu (A-Z), chữ số, dấu - hoặc _. Khách nhập chữ thường vẫn được."
          >
            <div className="input-group">
              <input
                className={cx("form-control text-uppercase", errors.code && "is-invalid")}
                id="code"
                type="text"
                name="code"
                maxLength={30}
                value={code}
                placeholder="Ví dụ: TET2027, FREESHIP"
                autoComplete="off"
                onChange={event => setCode(event.target.value)}
              />
              <span className="btn btn-outline-info" title="Tạo mã ngẫu nhiên 8 ký tự" onClick={() => setCode(randomCode())}>
                <i className="fa-solid fa-shuffle me-1"></i>
                Tạo ngẫu nhiên
              </span>
            </div>
          </Field>
        </div>
        <div className="col-md-6">
          <TextField label="Tên chương trình *" name="name" maxLength={200} defaultValue={item.name} placeholder="Ví dụ: Khuyến mãi Tết 2027" hint="Chỉ hiện trong trang quản trị, để dễ tìm và phân biệt các mã" error={errors.name} />
        </div>
        <div className="col-12">
          <TextField label="Mô tả cho khách" name="description" maxLength={500} defaultValue={item.description} placeholder="Ví dụ: Giảm 10% cho đơn hàng từ 2 000 ₽, tối đa 500 ₽" />
        </div>
      </div>

      <div className="row">
        <div className="col-12"><h5 className="border-bottom pb-2 mb-3 mt-2">Mức giảm</h5></div>
        <div className="col-md-4">
          <Field label="Loại giảm giá *" htmlFor="discountType">
            <select className="form-select" id="discountType" name="discountType" value={discountType} onChange={event => setDiscountType(event.target.value)}>
              {(options.typeList || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </Field>
        </div>
        {visible.discountValue && (
          <div className="col-md-4">
            <Field label="Mức giảm *" htmlFor="discountValue" error={errors.discountValue}>
              <div className="input-group">
                <input className={cx("form-control", errors.discountValue && "is-invalid")} id="discountValue" type="number" name="discountValue" min="0" step="0.01" defaultValue={numberValue(item.discountValue)} onChange={updateHint("discountValue")} />
                <span className="input-group-text">{discountType === "percent" ? "%" : "₽"}</span>
              </div>
            </Field>
          </div>
        )}
        {visible.maxDiscount && (
          <div className="col-md-4">
            <Field label="Giảm tối đa" htmlFor="maxDiscount" hint="Ví dụ giảm 10% nhưng không quá 500 ₽. Để trống nếu không giới hạn">
              <div className="input-group">
                <input className="form-control" id="maxDiscount" type="number" name="maxDiscount" min="1" step="0.01" defaultValue={numberValue(item.maxDiscount)} placeholder="Không giới hạn" onChange={updateHint("maxDiscount")} />
                <span className="input-group-text">₽</span>
              </div>
              {maxDiscountHint && <div className="small text-info mt-1">{maxDiscountHint}</div>}
            </Field>
          </div>
        )}
        {isFreeShipping && (
          <div className="col-md-8">
            <div className="alert alert-info mb-3">
              <i className="fa-solid fa-truck-fast me-1"></i>
              Khách được miễn phí giao hàng cho cả đơn hàng (không giảm tiền hàng).
            </div>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-12"><h5 className="border-bottom pb-2 mb-3 mt-2">Điều kiện áp dụng</h5></div>
        <div className="col-md-4">
          <Field label="Giá trị đơn hàng tối thiểu" htmlFor="minOrderValue" hint="Tổng tiền hàng tối thiểu để dùng được mã. Để trống nếu không yêu cầu">
            <div className="input-group">
              <input className="form-control" id="minOrderValue" type="number" name="minOrderValue" min="0" step="0.01" defaultValue={numberValue(item.minOrderValue)} placeholder="Không yêu cầu" onChange={updateHint("minOrderValue")} />
              <span className="input-group-text">₽</span>
            </div>
          </Field>
        </div>
        {visible.applyTo && (
          <div className="col-md-8">
            <Field label="Phạm vi áp dụng" htmlFor="applyTo" hint="Chỉ giảm giá cho các sản phẩm trong phạm vi này">
              <select className="form-select" id="applyTo" name="applyTo" value={applyTo} onChange={event => setApplyTo(event.target.value)}>
                {(options.applyToList || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </Field>
          </div>
        )}
        {visible.categories && (
          <div className="col-12">
            <Field label="Danh mục được áp dụng *" hint="Tính cả sản phẩm thuộc danh mục con của danh mục được chọn" error={errors.categories}>
              <div className="checkbox-list" onChange={() => setErrors({ ...errors, categories: "" })}>
                <CheckboxTree list={categoryTree} name="categories" checked={item.categories || []} />
              </div>
            </Field>
          </div>
        )}
        {visible.products && (
          <div className="col-12">
            <ProductPicker
              selectedList={productList}
              setSelectedList={list => {
                setProductList(list)
                setErrors({ ...errors, products: "" })
              }}
              error={errors.products}
            />
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-12"><h5 className="border-bottom pb-2 mb-3 mt-2">Giới hạn lượt dùng</h5></div>
        <div className="col-md-4">
          <TextField
            label="Tổng số lượt dùng"
            name="usageLimit"
            type="number"
            min="1"
            step="1"
            defaultValue={numberValue(item.usageLimit)}
            placeholder="Không giới hạn"
            hint={<>Ví dụ chỉ 100 đơn hàng đầu tiên được dùng mã. Để trống nếu không giới hạn{item.usedCount ? <><br /><b>Đã dùng: {item.usedCount} lượt</b></> : null}</>}
          />
        </div>
        <div className="col-md-4">
          <TextField label="Số lần mỗi khách được dùng" name="usageLimitPerCustomer" type="number" min="1" step="1" defaultValue={numberValue(item.usageLimitPerCustomer)} placeholder="Không giới hạn" hint="Thường đặt là 1. Để trống nếu không giới hạn" />
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <h5 className="border-bottom pb-2 mb-3 mt-2">Thời gian áp dụng</h5>
          <p className="text-muted small mb-2">Tính theo giờ Moscow (UTC{options.utcOffset})</p>
        </div>
        <div className="col-md-4">
          <TextField label="Bắt đầu *" name="startAt" type="datetime-local" defaultValue={item.startAtInput} error={errors.startAt} />
        </div>
        <div className="col-md-4">
          <TextField label="Kết thúc" name="endAt" type="datetime-local" defaultValue={item.endAtInput} hint="Để trống nếu mã không hết hạn" error={errors.endAt} />
        </div>
        <div className="col-md-4">
          <Field label="Trạng thái" htmlFor="status" hint="Tạm dừng thì khách không dùng được mã, bật lại lúc nào cũng được">
            <select className="form-select" id="status" name="status" defaultValue={item.status == "inactive" ? "inactive" : "active"}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </Field>
        </div>
      </div>

      <FormButtons submitLabel={coupon ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/coupon/list")} isSending={isSending} />
    </form>
  )
}
