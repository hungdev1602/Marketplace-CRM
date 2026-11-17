"use client"

import { useRef } from "react"
import { adminUrl } from "@/lib/admin"
import {
  CheckboxTree, Editor, Field, FileInput, FileMultiple, FormButtons, SlugField, TextField, TreeOptions,
  custom, getFileList, required, toFormData, useAdminSubmit, type EditorHandle
} from "../form"

// ===== Form sản phẩm và danh mục sản phẩm (tạo mới / chỉnh sửa) =====

const numberValue = (value: any) => value === null || value === undefined ? "" : value

// Ô số có đơn vị phía sau (₽, g, cm,...)
function UnitInput({ name, unit, step = "1", defaultValue, placeholder, prefix, ariaLabel }: {
  name: string
  unit: string
  step?: string
  defaultValue?: any
  placeholder?: string
  prefix?: string
  ariaLabel?: string
}) {
  return (
    <div className="input-group">
      {prefix && <span className="input-group-text">{prefix}</span>}
      <input
        className="form-control"
        id={name}
        type="number"
        name={name}
        min="0"
        step={step}
        defaultValue={numberValue(defaultValue)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <span className="input-group-text">{unit}</span>
    </div>
  )
}

function SectionTitle({ children, note }: { children: React.ReactNode, note?: string }) {
  return (
    <div className="col-12">
      <h5 className="border-bottom pb-2 mb-3 mt-2">{children}</h5>
      {note && <p className="text-muted small mb-2">{note}</p>}
    </div>
  )
}

// Các ô gửi lên server (giống getProductFormData ở giao diện cũ)
const textFieldList = [
  "name", "nameRu", "slug", "sku", "barcode", "brand", "origin", "manufacturer", "importer",
  "price", "priceOld", "costPrice", "unit", "stock", "vat",
  "netWeight", "netWeightUnit", "shelfLife", "shelfLifeUnit", "storageType", "storageNote",
  "ingredients", "calories", "protein", "fat", "carbohydrate", "usageInstructions",
  "certificateNumber", "grossWeight", "packageLength", "packageWidth", "packageHeight",
  "avatar", "status", "position", "metaTitle", "metaDescription"
]
const switchFieldList = ["markingRequired", "featured", "newArrival"]

// Form sản phẩm: /admin/product/create, /admin/product/edit/:id
// - options: các danh sách lựa chọn (xuất xứ, đơn vị, VAT,...) ở server/config/variable.config.ts
// - receiptVatNone: cửa hàng không chịu VAT (Kết nối API => Т-Банк)
export function ProductForm({ product, categoryList, options, receiptVatNone }: {
  product?: any
  categoryList: any[]
  options: any
  receiptVatNone?: boolean
}) {
  const item = product || {}
  const descriptionRef = useRef<EditorHandle>(null)
  const contentRef = useRef<EditorHandle>(null)

  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: product ? `/product/edit/${product.id}` : "/product/create",
    method: product ? "PATCH" : "POST",
    rules: {
      name: [required("Vui lòng nhập tên sản phẩm!")],
      slug: [required("Vui lòng nhập đường dẫn!")],
      barcode: [custom(value => value.trim() === "" || /^\d{8,14}$/.test(value.trim()), "Mã vạch chỉ gồm 8 đến 14 chữ số!")],
      price: [
        required("Vui lòng nhập giá bán!"),
        custom(value => Number(value) >= 0, "Giá bán không được âm!"),
        custom((value, values) => !values.costPrice || Number(value) > Number(values.costPrice), "Giá bán phải cao hơn giá nhập (giá vốn)!")
      ],
      priceOld: [
        custom((value, values) => value === "" || Number(value) > Number(values.price), "Giá trước khuyến mãi phải cao hơn giá bán (để trống nếu không giảm giá)!")
      ]
    },
    build: (values, raw) => {
      const data: { [name: string]: string } = {}
      textFieldList.forEach(name => { data[name] = `${values[name] ?? ""}`.trim() })
      switchFieldList.forEach(name => { data[name] = `${values[name] === "on"}` })
      data.category = JSON.stringify(raw.getAll("category"))
      data.dietTags = JSON.stringify(raw.getAll("dietTags"))
      data.allergens = JSON.stringify(raw.getAll("allergens"))
      data.images = JSON.stringify(getFileList(raw, "images"))
      data.description = descriptionRef.current?.getContent() || ""
      data.content = contentRef.current?.getContent() || ""
      return toFormData(data)
    }
  })

  const select = (name: string, list: any[], placeholder?: string, defaultValue?: string) => (
    <select className="form-select" id={name} name={name} defaultValue={defaultValue ?? item[name] ?? ""}>
      {placeholder && <option value="">{placeholder}</option>}
      {(list || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  )

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <SectionTitle>Thông tin cơ bản</SectionTitle>
        <div className="col-md-6">
          <TextField label="Tên sản phẩm *" name="name" defaultValue={item.name} placeholder="Ví dụ: Mì Hảo Hảo tôm chua cay 75g" error={errors.name} />
        </div>
        <div className="col-md-6">
          <TextField label="Tên tiếng Nga" name="nameRu" defaultValue={item.nameRu} placeholder="Ví dụ: Лапша быстрого приготовления Hao Hao" hint="Tên in trên nhãn phụ tiếng Nga, khách Nga tìm kiếm bằng tên này" />
        </div>
        <div className="col-md-6">
          <SlugField model="Product" defaultValue={item.slug} error={errors.slug} />
        </div>
        <div className="col-md-3">
          <TextField label="Mã sản phẩm (SKU)" name="sku" maxLength={50} defaultValue={item.sku} placeholder="Ví dụ: MI-HAOHAO-75" />
        </div>
        <div className="col-md-3">
          <TextField label="Mã vạch (штрихкод)" name="barcode" inputMode="numeric" maxLength={14} defaultValue={item.barcode} placeholder="EAN-13" error={errors.barcode} />
        </div>
        <div className="col-md-4">
          <TextField label="Thương hiệu" name="brand" defaultValue={item.brand} placeholder="Ví dụ: Acecook, Nongshim, Cholimex" />
        </div>
        <div className="col-md-4">
          <Field label="Xuất xứ" htmlFor="origin">{select("origin", options.originList, "-- Chọn xuất xứ --")}</Field>
        </div>
        <div className="col-md-4">
          <TextField label="Nhà sản xuất" name="manufacturer" defaultValue={item.manufacturer} placeholder="Tên, địa chỉ nhà sản xuất" />
        </div>
        <div className="col-md-12">
          <TextField label="Nhà nhập khẩu tại Nga (импортёр)" name="importer" defaultValue={item.importer} placeholder="Tên công ty, địa chỉ tại Nga (bắt buộc ghi trên nhãn hàng nhập khẩu)" />
        </div>
        <div className="col-md-6">
          <Field label="Danh mục">
            <div className="checkbox-list">
              <CheckboxTree list={categoryList} name="category" checked={item.category || []} />
            </div>
          </Field>
        </div>
        <div className="col-md-6">
          <Field label="Đặc điểm">
            <div className="checkbox-list">
              <CheckboxTree list={options.dietTagList} name="dietTags" checked={item.dietTags || []} idPrefix="dietTag-" />
            </div>
          </Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle>Giá &amp; kho hàng</SectionTitle>
        <div className="col-md-4">
          <Field label="Giá nhập (giá vốn)" htmlFor="costPrice" hint="Chỉ hiện trong trang quản trị, khách không thấy">
            <UnitInput name="costPrice" unit="₽" step="0.01" defaultValue={item.costPrice} />
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Giá bán *" htmlFor="price" hint="Giá khách trả, phải cao hơn giá nhập" error={errors.price}>
            <UnitInput name="price" unit="₽" step="0.01" defaultValue={item.price} />
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Giá trước khuyến mãi" htmlFor="priceOld" hint={<>Chỉ nhập khi giảm giá, hiện gạch ngang: <del>79&nbsp;₽</del> 59&nbsp;₽</>} error={errors.priceOld}>
            <UnitInput name="priceOld" unit="₽" step="0.01" defaultValue={item.priceOld} />
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Đơn vị bán" htmlFor="unit">{select("unit", options.unitList, "-- Chọn đơn vị --")}</Field>
        </div>
        <div className="col-md-4">
          <TextField label="Tồn kho" name="stock" type="number" min="0" step="1" defaultValue={numberValue(item.stock)} placeholder="0" />
        </div>
        <div className="col-md-4">
          <Field
            label="Thuế VAT (НДС)"
            htmlFor="vat"
            hint={receiptVatNone ? "Cửa hàng đang chọn «Không chịu VAT» (Kết nối API → Т-Банк): ô này không dùng, mọi dòng trên чек là «без НДС»." : undefined}
          >
            {select("vat", options.vatList, "-- Chọn mức thuế --")}
          </Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle>Thông tin thực phẩm</SectionTitle>
        <div className="col-md-4">
          <Field label="Khối lượng tịnh / thể tích" htmlFor="netWeight">
            <div className="input-group">
              <input className="form-control" id="netWeight" type="number" name="netWeight" min="0" step="0.01" defaultValue={numberValue(item.netWeight)} placeholder="Ví dụ: 75" />
              <select className="form-select" id="netWeightUnit" name="netWeightUnit" style={{ maxWidth: "90px" }} defaultValue={item.netWeightUnit || options.netWeightUnitList?.[0]?.id}>
                {(options.netWeightUnitList || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Hạn sử dụng" htmlFor="shelfLife" hint="Tính từ ngày sản xuất">
            <div className="input-group">
              <input className="form-control" id="shelfLife" type="number" name="shelfLife" min="0" step="1" defaultValue={numberValue(item.shelfLife)} placeholder="Ví dụ: 6" />
              <select className="form-select" id="shelfLifeUnit" name="shelfLifeUnit" style={{ maxWidth: "110px" }} defaultValue={item.shelfLifeUnit || "month"}>
                {(options.shelfLifeUnitList || []).map((option: any) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Điều kiện bảo quản" htmlFor="storageType">{select("storageType", options.storageList, "-- Chọn điều kiện bảo quản --")}</Field>
        </div>
        <div className="col-md-12">
          <TextField label="Hướng dẫn bảo quản thêm" name="storageNote" defaultValue={item.storageNote} placeholder="Ví dụ: Sau khi mở nắp bảo quản trong tủ lạnh, dùng trong 30 ngày" />
        </div>
        <div className="col-md-12">
          <Field label="Thành phần (состав)" htmlFor="ingredients">
            <textarea className="form-control" id="ingredients" name="ingredients" rows={3} defaultValue={item.ingredients} placeholder="Ví dụ: Bột mì, dầu cọ, muối, đường, bột ngọt..."></textarea>
          </Field>
        </div>
        <div className="col-md-12">
          <Field label="Chất gây dị ứng" hint="Bắt buộc ghi trên nhãn theo quy chuẩn ЕАЭС ТР ТС 022/2011">
            <div className="checkbox-list checkbox-list-grid">
              <CheckboxTree list={options.allergenList} name="allergens" checked={item.allergens || []} idPrefix="allergen-" />
            </div>
          </Field>
        </div>
        <div className="col-12">
          <label className="form-label">Giá trị dinh dưỡng trên 100g / 100ml (КБЖУ)</label>
        </div>
        <div className="col-6 col-md-3">
          <div className="mb-3"><UnitInput name="calories" prefix="Năng lượng" unit="kcal" step="0.1" defaultValue={item.calories} ariaLabel="Năng lượng" /></div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mb-3"><UnitInput name="protein" prefix="Đạm" unit="g" step="0.1" defaultValue={item.protein} ariaLabel="Chất đạm" /></div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mb-3"><UnitInput name="fat" prefix="Béo" unit="g" step="0.1" defaultValue={item.fat} ariaLabel="Chất béo" /></div>
        </div>
        <div className="col-6 col-md-3">
          <div className="mb-3"><UnitInput name="carbohydrate" prefix="Carb" unit="g" step="0.1" defaultValue={item.carbohydrate} ariaLabel="Carbohydrate" /></div>
        </div>
        <div className="col-md-12">
          <Field label="Hướng dẫn sử dụng / cách chế biến" htmlFor="usageInstructions">
            <textarea className="form-control" id="usageInstructions" name="usageInstructions" rows={3} defaultValue={item.usageInstructions} placeholder="Ví dụ: Cho mì vào bát, chế 400ml nước sôi, đậy nắp 3 phút"></textarea>
          </Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle>Pháp lý tại Nga</SectionTitle>
        <div className="col-md-8">
          <TextField label="Số tờ khai / giấy chứng nhận hợp chuẩn ЕАЭС" name="certificateNumber" defaultValue={item.certificateNumber} placeholder="Ví dụ: ЕАЭС N RU Д-VN.РА01.В.12345/24" hint="Декларация / сертификат о соответствии" />
        </div>
        <div className="col-md-4">
          <Field label="Mã Честный знак">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" id="markingRequired" type="checkbox" name="markingRequired" defaultChecked={Boolean(item.markingRequired)} />
              <label className="form-check-label" htmlFor="markingRequired">Hàng bắt buộc dán mã Честный знак</label>
            </div>
          </Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle note="Dùng để tính phí giao hàng (СДЭК, Почта России, Яндекс Доставка...)">Vận chuyển</SectionTitle>
        <div className="col-6 col-md-3">
          <Field label="Khối lượng cả bao bì" htmlFor="grossWeight"><UnitInput name="grossWeight" unit="g" defaultValue={item.grossWeight} /></Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Dài" htmlFor="packageLength"><UnitInput name="packageLength" unit="cm" step="0.1" defaultValue={item.packageLength} /></Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Rộng" htmlFor="packageWidth"><UnitInput name="packageWidth" unit="cm" step="0.1" defaultValue={item.packageWidth} /></Field>
        </div>
        <div className="col-6 col-md-3">
          <Field label="Cao" htmlFor="packageHeight"><UnitInput name="packageHeight" unit="cm" step="0.1" defaultValue={item.packageHeight} /></Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle>Hình ảnh &amp; mô tả</SectionTitle>
        <div className="col-md-6">
          <div className="mb-3">
            <FileInput label="Ảnh đại diện" name="avatar" defaultValue={item.avatar} placeholder="Đường dẫn file..." />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <FileMultiple label="Album ảnh / video" name="images" defaultValues={item.images || []} buttonText="Thêm ảnh / video" />
            <div className="form-text">Video (MP4) hiện đầu tiên trong album ở trang khách hàng, ảnh đại diện vẫn là ảnh.</div>
          </div>
        </div>
        <div className="col-md-12">
          <Field label="Mô tả ngắn"><Editor ref={descriptionRef} defaultValue={item.description} /></Field>
        </div>
        <div className="col-md-12">
          <Field label="Mô tả chi tiết"><Editor ref={contentRef} defaultValue={item.content} /></Field>
        </div>
      </div>

      <div className="row">
        <SectionTitle>Hiển thị &amp; SEO</SectionTitle>
        <div className="col-md-4">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={item.status == "inactive" ? "inactive" : "active"}>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
          </Field>
        </div>
        <div className="col-md-4">
          <TextField label="Vị trí" name="position" type="number" min="0" step="1" defaultValue={numberValue(item.position)} placeholder="Tự động" hint="Số nhỏ hiển thị trước, để trống thì xếp cuối" />
        </div>
        <div className="col-md-4">
          <Field label="Nhãn">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" id="featured" type="checkbox" name="featured" defaultChecked={Boolean(item.featured)} />
              <label className="form-check-label" htmlFor="featured">Sản phẩm nổi bật</label>
            </div>
            <div className="form-check form-switch">
              <input className="form-check-input" id="newArrival" type="checkbox" name="newArrival" defaultChecked={Boolean(item.newArrival)} />
              <label className="form-check-label" htmlFor="newArrival">Hàng mới về</label>
            </div>
          </Field>
        </div>
        <div className="col-md-6">
          <TextField label="Tiêu đề SEO" name="metaTitle" maxLength={70} defaultValue={item.metaTitle} placeholder="Để trống thì dùng tên sản phẩm" hint="Tối đa 70 ký tự" />
        </div>
        <div className="col-md-6">
          <Field label="Mô tả SEO" htmlFor="metaDescription" hint="Tối đa 200 ký tự">
            <textarea className="form-control" id="metaDescription" name="metaDescription" rows={2} maxLength={200} defaultValue={item.metaDescription}></textarea>
          </Field>
        </div>
      </div>

      <FormButtons submitLabel={product ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/product/list")} isSending={isSending} />
    </form>
  )
}

// Form danh mục sản phẩm: /admin/product/category/create, /admin/product/category/edit/:id
export function ProductCategoryForm({ category, categoryTree }: { category?: any, categoryTree: any[] }) {
  const item = category || {}
  const descriptionRef = useRef<EditorHandle>(null)

  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: category ? `/product/category/edit/${category.id}` : "/product/category/create",
    method: category ? "PATCH" : "POST",
    rules: {
      name: [required("Vui lòng nhập tên danh mục!")],
      slug: [required("Vui lòng nhập đường dẫn!")]
    },
    build: (values) => toFormData({
      name: values.name,
      nameRu: values.nameRu,
      slug: values.slug,
      avatar: values.avatar,
      parent: values.parent,
      position: values.position,
      status: values.status,
      description: descriptionRef.current?.getContent(),
      metaTitle: values.metaTitle,
      metaDescription: values.metaDescription
    })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <TextField label="Tên danh mục *" name="name" defaultValue={item.name} placeholder="Ví dụ: Mì - Bún - Phở khô" error={errors.name} />
        </div>
        <div className="col-md-6 col-lg-6">
          <TextField label="Tên tiếng Nga" name="nameRu" defaultValue={item.nameRu} placeholder="Ví dụ: Лапша и вермишель" />
        </div>
        <div className="col-md-6 col-lg-6">
          <SlugField model="CategoryProduct" defaultValue={item.slug} error={errors.slug} />
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Danh mục cha" htmlFor="parent">
            <select className="form-select" id="parent" name="parent" defaultValue={item.parent || ""}>
              <option value="">---</option>
              <TreeOptions list={categoryTree} />
            </select>
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <div className="mb-3">
            <FileInput label="Ảnh đại diện" name="avatar" defaultValue={item.avatar} placeholder="Đường dẫn file..." />
          </div>
        </div>
        <div className="col-md-3 col-lg-3">
          <TextField label="Vị trí" name="position" type="number" min="0" step="1" defaultValue={numberValue(item.position)} placeholder="Tự động" hint="Số nhỏ hiển thị trước, để trống thì xếp cuối" />
        </div>
        <div className="col-md-3 col-lg-3">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={item.status || "active"}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </Field>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Mô tả"><Editor ref={descriptionRef} defaultValue={item.description} /></Field>
        </div>
        <SectionTitle>SEO (Google, Yandex)</SectionTitle>
        <div className="col-md-6 col-lg-6">
          <TextField label="Tiêu đề SEO" name="metaTitle" maxLength={70} defaultValue={item.metaTitle} placeholder="Để trống thì dùng tên danh mục" hint="Tối đa 70 ký tự" />
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Mô tả SEO" htmlFor="metaDescription" hint="Tối đa 200 ký tự">
            <textarea className="form-control" id="metaDescription" name="metaDescription" rows={2} maxLength={200} defaultValue={item.metaDescription}></textarea>
          </Field>
        </div>
      </div>
      <FormButtons submitLabel={category ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/product/category")} isSending={isSending} />
    </form>
  )
}
