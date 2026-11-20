"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cx } from "@/lib/format"
import { createTranslator } from "@/lib/i18n"
import { startTopLoader } from "@/lib/top-loader"

// Bộ lọc ở trang danh sách sản phẩm (cột bên trái) và ô sắp xếp
// Gửi form là chuyển sang đường dẫn có bộ lọc, ví dụ /products?origin=VN&priceMax=500

const formId = "sf-filter-form"

type Props = {
  lang: string
  formAction: string // "/products" hoặc "/category/slug"
  keyword: string // từ khoá đang tìm (giữ lại khi lọc)
  searchCategorySlug: string // danh mục chọn ở ô tìm kiếm (giữ lại khi lọc)
  resetUrl: string
  hasFilter: boolean
  filter: any
  category: any | null
  categoryPath: any[]
  categoryTree: any[]
  originFilterList: any[]
  storageList: any[]
  dietTagList: any[]
}

export function ProductFilter(props: Props) {
  const router = useRouter()
  const { t, tName } = createTranslator(props.lang)
  const { filter, category, categoryPath } = props
  const [isOpen, setIsOpen] = useState(false) // điện thoại: bấm nút "Bộ lọc" để mở / đóng

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Bỏ các ô trống để link gọn (không có ?priceMin=&priceMax=)
    const params = new URLSearchParams()
    for (const [name, value] of new FormData(event.currentTarget).entries()) {
      if(typeof value === "string" && value !== "") params.append(name, value)
    }
    const query = params.toString()
    setIsOpen(false)
    const url = props.formAction + (query ? `?${query}` : "")
    startTopLoader(url)
    router.push(url)
  }

  const checkbox = (name: string, value: string, label: string, checked: boolean) => {
    const inputId = `filter-${name}-${value}`
    return (
      <div className="form-check sf-check" key={inputId}>
        <input className="form-check-input" type="checkbox" id={inputId} name={name} value={value} defaultChecked={checked} />
        <label className="form-check-label" htmlFor={inputId}>{label}</label>
      </div>
    )
  }

  return (
    <aside className="sf-filter">
      <button
        type="button"
        className="sf-filter-toggle d-lg-none"
        aria-controls={formId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-sliders-h"></i>
        {t("filter")}
        {props.hasFilter && <span className="sf-filter-dot"></span>}
      </button>
      <form
        id={formId}
        // Đổi bộ lọc / đổi trang thì dựng lại form theo bộ lọc mới
        key={`${props.formAction}|${JSON.stringify(filter)}`}
        action={props.formAction}
        method="GET"
        className={cx("sf-filter-form", isOpen && "show")}
        onSubmit={handleSubmit}
      >
        {props.keyword && <input type="hidden" name="keyword" value={props.keyword} />}
        {props.searchCategorySlug && <input type="hidden" name="category" value={props.searchCategorySlug} />}

        <div className="sf-filter-group">
          <h3>{t("filterCategory")}</h3>
          <ul className="sf-filter-category">
            {props.categoryTree.map(item => {
              const activeRoot = category && (category.id == item.id || (categoryPath[0] && categoryPath[0].id == item.id))
              return (
                <li key={item.id}>
                  <Link href={`/category/${item.slug}`} className={category && category.id == item.id ? "active" : ""}>{tName(item)}</Link>
                  {activeRoot && item.children.length > 0 && (
                    <ul>
                      {item.children.map((child: any) => (
                        <li key={child.id}>
                          <Link
                            href={`/category/${child.slug}`}
                            className={categoryPath.some(path => path.id == child.id) ? "active" : ""}
                          >
                            {tName(child)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="sf-filter-group">
          <h3>{t("filterPrice")}</h3>
          <div className="sf-price-range">
            <input
              type="number"
              name="priceMin"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder={t("priceFrom")}
              defaultValue={filter.priceMin === null || filter.priceMin === undefined ? "" : filter.priceMin}
              aria-label={`${t("filterPrice")} ${t("priceFrom")}`}
            />
            <span>—</span>
            <input
              type="number"
              name="priceMax"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder={t("priceTo")}
              defaultValue={filter.priceMax === null || filter.priceMax === undefined ? "" : filter.priceMax}
              aria-label={`${t("filterPrice")} ${t("priceTo")}`}
            />
          </div>
          {checkbox("inStock", "1", t("filterInStock"), Boolean(filter.inStock))}
          {checkbox("onSale", "1", t("filterOnSale"), Boolean(filter.onSale))}
        </div>

        {props.originFilterList.length > 0 && (
          <div className="sf-filter-group">
            <h3>{t("filterOrigin")}</h3>
            {props.originFilterList.map(item => checkbox("origin", item.id, tName(item), (filter.origin || []).includes(item.id)))}
          </div>
        )}

        <div className="sf-filter-group">
          <h3>{t("filterStorage")}</h3>
          {props.storageList.map(item => checkbox("storageType", item.id, tName(item), (filter.storageType || []).includes(item.id)))}
        </div>

        <div className="sf-filter-group">
          <h3>{t("filterDiet")}</h3>
          {props.dietTagList.map(item => checkbox("dietTags", item.id, tName(item), (filter.dietTags || []).includes(item.id)))}
        </div>

        <div className="sf-filter-buttons">
          <button type="submit" className="sf-btn sf-btn-primary">{t("filterApply")}</button>
          {props.hasFilter && <Link href={props.resetUrl} className="sf-btn sf-btn-outline">{t("filterReset")}</Link>}
        </div>
      </form>
    </aside>
  )
}

// Ô sắp xếp: đổi là lọc lại ngay (thuộc form bộ lọc nên giữ nguyên các bộ lọc đang chọn)
export function SortSelect({ lang, sortList, sort }: { lang: string, sortList: { id: string, key: string }[], sort: string }) {
  const { t } = createTranslator(lang)
  return (
    <label className="sf-sort">
      <span>{t("sortBy")}</span>
      <select
        name="sort"
        form={formId}
        key={sort}
        defaultValue={sort}
        onChange={event => event.currentTarget.form?.requestSubmit()}
      >
        {sortList.map(item => (
          <option key={item.id} value={item.id}>{t(item.key)}</option>
        ))}
      </select>
    </label>
  )
}
