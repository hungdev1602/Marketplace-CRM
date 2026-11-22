"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import Link from "@/components/client/ShopLink"
import { useRouter } from "next/navigation"
import { cx, formatNumber } from "@/lib/format"
import { createTranslator, type Translator } from "@/lib/i18n"
import { mediaSrcSet, mediaUrl, type ViewCtx } from "@/lib/view-ctx"
import { CartControl } from "../CartControl"
import { ClampText } from "../ClampText"
import { useShop } from "../ShopProvider"
import { useToast } from "../Toast"
import { RatingStars } from "../common"

// ===== Nội dung trang so sánh sản phẩm (/compare) =====
// Bảng: mỗi cột là 1 sản phẩm, mỗi dòng là 1 thông tin (giá, giá cho 1 kg, đánh giá, thành phần,...)
// - Dòng mà không sản phẩm nào có thông tin thì không hiện
// - Ô tốt nhất (rẻ nhất, giá cho 1 kg thấp nhất, đánh giá cao nhất) được tô xanh
// - "Только различия": ẩn các dòng mà mọi sản phẩm giống nhau
// - Sản phẩm thuộc nhiều danh mục: các nút lọc theo danh mục ("Все", "Лапша", "Соусы"...), so sánh trong từng danh mục
// - Nhiều sản phẩm hơn màn hình: kéo / vuốt ngang; máy tính có 2 nút mũi tên to ở 2 mép bảng (luôn nằm giữa màn hình
//   khi cuộn), điện thoại có nút ‹ › phía trên bảng; mép bảng phía còn sản phẩm có bóng mờ để khách biết còn kéo được;
//   cuộn xuống thì hàng tên sản phẩm (ảnh nhỏ, tên, giá) dính ở trên cùng để luôn biết cột nào là sản phẩm nào
// - Điện thoại: tên dòng nằm trên 1 hàng riêng, các cột sản phẩm vuốt ngang
// productList: dữ liệu từ server/controller/client/compare.controller.ts

// 1 ô của bảng
// - content: nội dung hiển thị, null là sản phẩm không có thông tin này (hiện "—")
// - value: dùng để so sánh các sản phẩm có giống nhau không ("" là không có thông tin)
type Cell = { content: React.ReactNode, value: string, isBest?: boolean }

// 1 dòng của bảng, bestLabel: chữ hiện ở ô tốt nhất ("Дешевле всех",...)
type Row = { id: string, label: string, cells: Cell[], bestLabel?: string }

type Section = { id: string, title: string, rows: Row[] }

const hasValue = (value: any) => value !== null && value !== undefined && value !== ""

// Đánh dấu ô tốt nhất: số nhỏ nhất (mode "min") hoặc lớn nhất ("max")
// Chỉ đánh dấu khi có ít nhất 2 sản phẩm có số và các số không bằng nhau hết
const markBest = (cells: Cell[], numbers: (number | null)[], mode: "min" | "max") => {
  const valid = numbers.filter((number): number is number => number !== null)
  if(valid.length < 2) return
  const best = mode === "min" ? Math.min(...valid) : Math.max(...valid)
  if(valid.every(number => number === best)) return
  numbers.forEach((number, index) => {
    if(number === best) cells[index].isBest = true
  })
}

const emptyCell = (): Cell => ({ content: null, value: "" })

const textCell = (text: any): Cell => {
  return hasValue(text) ? { content: `${text}`, value: `${text}` } : emptyCell()
}

// Dựng các mục, các dòng của bảng từ danh sách sản phẩm
const buildSectionList = (productList: any[], ctx: ViewCtx, translator: Translator): Section[] => {
  const { t, tName, tOption, tCount } = translator
  const options = ctx.productOptions || {}

  const row = (id: string, label: string, getCell: (product: any) => Cell): Row => ({
    id: id,
    label: label,
    cells: productList.map(product => getCell(product))
  })

  // Giá: rẻ nhất được tô xanh
  const priceRow = row("price", t("comparePrice"), product => ({
    content: (
      <span className={cx("sf-product-price sf-cmp-price", product.discountPercent && "is-sale")}>
        <span className="sf-price">{product.priceFormat}</span>
        {product.discountPercent ? <del>{product.priceOldFormat}</del> : null}
      </span>
    ),
    value: `${product.price}|${product.priceOld || ""}`
  }))
  priceRow.bestLabel = t("compareCheapest")
  markBest(priceRow.cells, productList.map(product => product.price > 0 ? product.price : null), "min")

  // Giá cho 1 kg / 1 l: chỉ so với sản phẩm cùng đơn vị (kg với kg, l với l)
  const unitPriceRow = row("unitPrice", t("compareUnitPrice"), product => product.unitPriceFormat ? {
    content: `${product.unitPriceFormat} / ${tOption(options.netWeightUnitList, product.unitPriceUnit)}`,
    value: `${product.unitPrice}|${product.unitPriceUnit}`
  } : emptyCell())
  unitPriceRow.bestLabel = t("compareBestValue")
  for (const unit of ["kg", "l"]) {
    markBest(unitPriceRow.cells, productList.map(product => product.unitPriceUnit === unit ? product.unitPrice : null), "min")
  }

  // Đánh giá: cao nhất được tô xanh (chỉ tính sản phẩm đã có đánh giá)
  const ratingRow = row("rating", t("compareRating"), product => product.ratingCount > 0 ? {
    content: (
      <Link href={`/product/${product.slug}#reviews`} className="sf-cmp-rating">
        <RatingStars rating={product.rating} size="sm" lang={ctx.lang} />
        <b>{formatNumber(product.rating)}</b>
        <span>{tCount(product.ratingCount, "ratingCount")}</span>
      </Link>
    ),
    value: `${product.rating}|${product.ratingCount}`
  } : {
    content: <span className="sf-muted">{t("reviewsNone")}</span>,
    value: "none"
  })
  ratingRow.bestLabel = t("compareTopRated")
  markBest(ratingRow.cells, productList.map(product => product.ratingCount > 0 ? product.rating : null), "max")

  const mainRowList: Row[] = [
    priceRow,
    unitPriceRow,
    row("discount", t("compareDiscount"), product => product.discountPercent ? {
      content: (
        <span className="sf-cmp-discount">
          <span className="sf-badge sf-badge-sale">−{product.discountPercent}%</span>
          <span>{t("youSave")} {product.savingFormat}</span>
        </span>
      ),
      value: `${product.discountPercent}`
    } : emptyCell()),
    ratingRow,
    row("stock", t("compareStock"), product => {
      const status = product.stock > 0 ? (product.isLowStock ? "low" : "in") : "out"
      const icon = { in: "fa-check-circle", low: "fa-exclamation-circle", out: "fa-times-circle" }[status]
      const text = { in: t("inStock"), low: t("lowStock"), out: t("outOfStock") }[status]
      return {
        content: (
          <span className={`sf-cmp-stock sf-stock-${status}`}>
            <i className={`fas ${icon}`}></i>
            {text}
          </span>
        ),
        value: status
      }
    }),
    row("brand", t("brand"), product => textCell(product.brand)),
    row("origin", t("origin"), product => textCell(product.origin ? tOption(options.originList, product.origin) : "")),
    row("manufacturer", t("manufacturer"), product => textCell(product.manufacturer)),
    row("category", t("compareCategory"), product => {
      const categoryList: any[] = product.categoryList || []
      if(categoryList.length === 0) return emptyCell()
      return {
        content: (
          <span className="sf-cmp-links">
            {categoryList.map(category => (
              <Link key={category.id} href={`/category/${category.slug}`}>{tName(category)}</Link>
            ))}
          </span>
        ),
        value: categoryList.map(category => category.id).sort().join("|")
      }
    }),
    row("netWeight", t("netWeight"), product => textCell(product.netWeight
      ? `${formatNumber(product.netWeight)} ${tOption(options.netWeightUnitList, product.netWeightUnit)}`
      : "")),
    row("unit", t("unit"), product => textCell(product.unit ? tOption(options.unitList, product.unit) : ""))
  ]

  // Giá trị dinh dưỡng trên 100 g / 100 ml (số 0 vẫn là có thông tin)
  const nutritionRow = (id: string, label: string, unit: string) => row(id, label, product => hasValue(product[id])
    ? { content: `${formatNumber(product[id])} ${unit}`, value: `${product[id]}` }
    : emptyCell())

  const nutritionRowList: Row[] = [
    nutritionRow("calories", t("calories"), t("kcal")),
    nutritionRow("protein", t("protein"), t("gram")),
    nutritionRow("fat", t("fat"), t("gram")),
    nutritionRow("carbohydrate", t("carbohydrate"), t("gram"))
  ]

  // Đặc điểm (cay, chay, halal,...), chất gây dị ứng: hiện dạng nhãn
  const chipRow = (id: string, label: string, field: string, list: any[], chipClass: string) => row(id, label, product => {
    const idList: string[] = (product[field] || []).filter((item: string) => (list || []).some(option => option.id === item))
    if(idList.length === 0) return emptyCell()
    return {
      content: (
        <span className="sf-cmp-chips">
          {idList.map(item => <span key={item} className={cx("sf-chip", chipClass)}>{tOption(list, item)}</span>)}
        </span>
      ),
      value: [...idList].sort().join("|")
    }
  })

  const compositionRowList: Row[] = [
    chipRow("dietTags", t("filterDiet"), "dietTags", options.dietTagList, "sf-chip-static"),
    chipRow("allergens", t("allergens"), "allergens", options.allergenList, "sf-chip-warning"),
    row("ingredients", t("ingredients"), product => product.ingredients ? {
      content: (
        <ClampText moreLabel={t("reviewReadMore")}>
          <p className="sf-pre-line">{product.ingredients}</p>
        </ClampText>
      ),
      value: product.ingredients
    } : emptyCell())
  ]

  const storageRowList: Row[] = [
    row("storage", t("storage"), product => {
      if(!product.storageType) return emptyCell()
      const icon = product.storageType == "frozen" ? "fa-snowflake" : (product.storageType == "chilled" ? "fa-thermometer-quarter" : "fa-box")
      return {
        content: (
          <span className="sf-cmp-storage">
            <i className={`fas ${icon}`}></i>
            {tOption(options.storageList, product.storageType)}
          </span>
        ),
        value: product.storageType
      }
    }),
    row("shelfLife", t("shelfLife"), product => textCell(product.shelfLife && product.shelfLifeKey
      ? tCount(product.shelfLife, product.shelfLifeKey)
      : ""))
  ]

  return [
    { id: "main", title: t("compareSectionMain"), rows: mainRowList },
    { id: "nutrition", title: t("nutrition"), rows: nutritionRowList },
    { id: "composition", title: t("compareSectionComposition"), rows: compositionRowList },
    { id: "storage", title: t("compareSectionStorage"), rows: storageRowList }
  ]
    // Bỏ dòng mà không sản phẩm nào có thông tin, bỏ mục không còn dòng nào
    .map(section => ({ ...section, rows: section.rows.filter(item => item.cells.some(cell => cell.value !== "")) }))
    .filter(section => section.rows.length > 0)
}

// Ô đầu cột của 1 sản phẩm: ảnh, tên, giá, nút giỏ hàng, nút bỏ khỏi so sánh
function ProductHead({ product }: { product: any }) {
  const { ctx, toggleCompare } = useShop()
  const { t, tName } = createTranslator(ctx.lang)
  const [isRemoving, setIsRemoving] = useState(false)
  const productName = tName(product)
  const productUrl = `/product/${product.slug}`

  const handleRemove = async () => {
    if(isRemoving) return
    setIsRemoving(true)
    const data = await toggleCompare(product.id)
    // Bỏ thành công thì cột biến mất; lỗi thì cho bấm lại
    if(data.code !== "success") setIsRemoving(false)
  }

  return (
    <div className={cx("sf-cmp-head", !(product.stock > 0) && "is-out")}>
      <button
        type="button"
        className={cx("sf-cmp-remove", isRemoving && "is-loading")}
        aria-label={`${t("compareRemove")}: ${productName}`}
        title={t("compareRemove")}
        onClick={handleRemove}
      >
        <i className="fas fa-times"></i>
      </button>
      <Link href={productUrl} className="sf-cmp-img">
        <img src={mediaUrl(ctx, product.cardImage, 320)} srcSet={mediaSrcSet(ctx, product.cardImage, 320)} alt={productName} loading="lazy" decoding="async" />
        {product.discountPercent ? <span className="sf-badge sf-badge-sale">−{product.discountPercent}%</span> : null}
      </Link>
      {product.brand && <p className="sf-product-brand">{product.brand}</p>}
      <Link href={productUrl} className="sf-cmp-name">{productName}</Link>
      <div className={cx("sf-product-price", product.discountPercent && "is-sale")}>
        <span className="sf-price">{product.priceFormat}</span>
        {product.discountPercent ? <del>{product.priceOldFormat}</del> : null}
      </div>
      <CartControl product={{ id: product.id, stock: product.stock, name: product.name, nameRu: product.nameRu }} />
    </div>
  )
}


// Vị trí cột sản phẩm trong bảng (px), left tính từ cột sản phẩm đầu tiên
type ColumnLayout = { labelWidth: number, columns: { left: number, width: number }[] }

// Trạng thái nút ‹ ›: đang xem sản phẩm thứ from đến to (đếm từ 1)
type NavState = { from: number, to: number, canPrev: boolean, canNext: boolean }

// Chiều cao phần đầu trang đang dính trên cùng (máy tính: menu, điện thoại: logo + ô tìm kiếm),
// hàng tên sản phẩm dính ngay bên dưới
const getStickyTop = (): number => {
  let top = 0
  document.querySelectorAll<HTMLElement>(".sf-header, .main_menu").forEach(element => {
    const style = getComputedStyle(element)
    if(style.position === "sticky" && style.display !== "none") {
      top = Math.max(top, element.getBoundingClientRect().bottom)
    }
  })
  return Math.max(0, Math.round(top))
}

// "Товары 1–4 из 20" kèm nút ‹ › nhỏ (nút nhỏ chỉ hiện trên điện thoại, máy tính dùng 2 nút to ở 2 mép bảng)
// - withButtons: false thì chỉ có dòng chữ (hàng tên sản phẩm dính trên cùng)
function CompareNav({ nav, total, lang, onMove, withButtons = true }: {
  nav: NavState
  total: number
  lang: string
  onMove: (direction: 1 | -1) => void
  withButtons?: boolean
}) {
  const { t } = createTranslator(lang)
  return (
    <div className="sf-cmp-nav">
      {withButtons && (
        <button type="button" className="sf-cmp-nav-btn" aria-label={t("comparePrev")} title={t("comparePrev")} disabled={!nav.canPrev} onClick={() => onMove(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
      )}
      <span className="sf-cmp-nav-text">
        <i className="fas fa-arrows-alt-h"></i>
        {t("compareShown")
          .replace("{from}", `${nav.from}`)
          .replace("{to}", `${nav.to}`)
          .replace("{total}", `${total}`)}
      </span>
      {withButtons && (
        <button type="button" className="sf-cmp-nav-btn" aria-label={t("compareNext")} title={t("compareNext")} disabled={!nav.canNext} onClick={() => onMove(1)}>
          <i className="fas fa-chevron-right"></i>
        </button>
      )}
    </div>
  )
}

// Bảng so sánh: kéo ngang, nút ‹ ›, hàng tên sản phẩm dính trên cùng khi cuộn xuống
function CompareTable({ productList, sectionList, canAddMore }: { productList: any[], sectionList: Section[], canAddMore: boolean }) {
  const { ctx } = useShop()
  const { t, tName } = createTranslator(ctx.lang)

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const barRowRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<ColumnLayout>({ labelWidth: 0, columns: [] })
  const [layout, setLayout] = useState<ColumnLayout>(layoutRef.current)
  const [nav, setNav] = useState<NavState>({ from: 1, to: productList.length, canPrev: false, canNext: false })
  const [isBarVisible, setIsBarVisible] = useState(false)

  // Đổi sản phẩm / dòng hiển thị thì đo lại vị trí các cột
  const layoutKey = `${productList.map(product => product.id).join(",")}|${sectionList.map(section => section.rows.map(row => row.id).join(",")).join("|")}`

  // Khi kéo ngang: hàng tên sản phẩm dính trên cùng chạy theo bảng, cập nhật "Товары 1–4 из 20" và nút ‹ ›
  // (đổi thẳng style của hàng tên sản phẩm, không dựng lại cả bảng ở mỗi lần cuộn)
  const updateNav = useCallback(() => {
    const scroll = scrollRef.current
    if(!scroll) return
    const { labelWidth, columns } = layoutRef.current
    const left = scroll.scrollLeft
    const viewWidth = scroll.clientWidth - labelWidth

    if(barRowRef.current) barRowRef.current.style.transform = `translateX(${-left}px)`

    // Sản phẩm được tính là đang xem khi hiện quá nửa cột
    let from = 0
    let to = 0
    columns.forEach((column, index) => {
      const visibleWidth = Math.min(column.left + column.width, left + viewWidth) - Math.max(column.left, left)
      if(visibleWidth >= column.width / 2) {
        if(!from) from = index + 1
        to = index + 1
      }
    })

    const next: NavState = {
      from: from || 1,
      to: to || columns.length,
      canPrev: left > 1,
      canNext: left + scroll.clientWidth < scroll.scrollWidth - 1
    }
    setNav(current => current.from === next.from && current.to === next.to
      && current.canPrev === next.canPrev && current.canNext === next.canNext ? current : next)
  }, [])

  // Đo lại vị trí các cột (mở trang, đổi cỡ cửa sổ, bỏ bớt sản phẩm, "Только различия")
  const measure = useCallback(() => {
    const table = tableRef.current
    if(!table) return
    const corner = table.querySelector<HTMLElement>(".sf-cmp-corner")
    const labelWidth = corner ? corner.offsetWidth : 0
    const columns = Array.from(table.querySelectorAll<HTMLElement>("thead .sf-cmp-product")).map(cell => ({
      left: cell.offsetLeft - labelWidth,
      width: cell.offsetWidth
    }))
    const newLayout = { labelWidth, columns }
    if(JSON.stringify(newLayout) !== JSON.stringify(layoutRef.current)) {
      layoutRef.current = newLayout
      setLayout(newLayout)
    }
    updateNav()
  }, [updateNav])

  useEffect(() => {
    measure()
    const table = tableRef.current
    if(!table || !("ResizeObserver" in window)) return
    const observer = new ResizeObserver(() => measure())
    observer.observe(table)
    if(scrollRef.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [measure, layoutKey])

  // Cuộn trang: hàng đầu bảng (ảnh, tên sản phẩm) đã bị cuộn khuất thì hiện hàng tên sản phẩm dính trên cùng
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const table = tableRef.current
      const head = table?.tHead
      if(!table || !head) return
      const top = getStickyTop()
      if(stickyRef.current) stickyRef.current.style.top = `${top}px`
      const headBottom = head.getBoundingClientRect().bottom
      const tableBottom = table.getBoundingClientRect().bottom
      setIsBarVisible(headBottom < top + 8 && tableBottom > top + 140)
    }
    const onScroll = () => {
      if(!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if(frame) cancelAnimationFrame(frame)
    }
  }, [])

  // Bấm ‹ ›: trượt cả 1 màn hình sản phẩm, dừng đúng mép cột
  const move = (direction: 1 | -1) => {
    const scroll = scrollRef.current
    if(!scroll) return
    const { labelWidth, columns } = layoutRef.current
    const left = scroll.scrollLeft
    const viewWidth = scroll.clientWidth - labelWidth
    let target = 0
    if(direction > 0) {
      const nextColumn = columns.find(column => column.left + column.width > left + viewWidth + 1)
      target = nextColumn ? nextColumn.left : scroll.scrollWidth
    }
    else {
      const firstColumn = columns.find(column => column.left >= left - viewWidth - 1)
      target = firstColumn ? firstColumn.left : 0
    }
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    scroll.scrollTo({ left: target, behavior: isReducedMotion ? "auto" : "smooth" })
  }

  const hasOverflow = nav.canPrev || nav.canNext

  // Số cột: cột tên dòng + các sản phẩm + cột "Добавить товар"
  const productColumnCount = productList.length + (canAddMore ? 1 : 0)
  const columnCount = productColumnCount + 1
  // --sf-cmp-cols: số cột sản phẩm trên máy tính (có cột "Добавить товар"), --sf-cmp-products: trên điện thoại (không có)
  const tableStyle = { "--sf-cmp-cols": productColumnCount, "--sf-cmp-products": productList.length } as React.CSSProperties

  return (
    <>
      {hasOverflow && <CompareNav nav={nav} total={productList.length} lang={ctx.lang} onMove={move} />}

      {/* Hàng tên sản phẩm dính trên cùng khi cuộn xuống (chỉ để nhìn, nên ẩn với trình đọc màn hình) */}
      <div ref={stickyRef} className="sf-cmp-sticky">
        <div className={cx("sf-cmp-sticky-bar", isBarVisible && "is-visible")}>
          <div className="sf-cmp-sticky-nav" style={{ width: layout.labelWidth }}>
            {hasOverflow && <CompareNav nav={nav} total={productList.length} lang={ctx.lang} onMove={move} withButtons={false} />}
          </div>
          <div className="sf-cmp-sticky-view" aria-hidden="true">
            <div ref={barRowRef} className="sf-cmp-sticky-row">
              {productList.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="sf-cmp-sticky-item"
                  style={{ width: layout.columns[index]?.width || undefined }}
                  tabIndex={-1}
                >
                  <img src={mediaUrl(ctx, product.cardImage, 160)} alt="" loading="lazy" />
                  <span className="sf-cmp-sticky-name">{tName(product)}</span>
                  <b className={cx(product.discountPercent && "is-sale")}>{product.priceFormat}</b>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* can-prev / can-next: còn sản phẩm bên trái / bên phải => bóng mờ ở mép bảng + nút mũi tên to */}
      <div className={cx("sf-compare-frame", nav.canPrev && "can-prev", nav.canNext && "can-next")}>
        <div ref={scrollRef} className="sf-compare-scroll" role="region" aria-label={t("compare")} tabIndex={0} onScroll={updateNav}>
          <table ref={tableRef} className="sf-compare-table" style={tableStyle}>
            <thead>
              <tr>
                <td className="sf-cmp-corner"></td>
                {productList.map(product => (
                  <th key={product.id} scope="col" className="sf-cmp-product">
                    <ProductHead product={product} />
                  </th>
                ))}
                {canAddMore && (
                  <td className="sf-cmp-add">
                    <Link href="/products" className="sf-cmp-add-box">
                      <i className="fas fa-plus"></i>
                      <span>{t("compareAddMore")}</span>
                    </Link>
                  </td>
                )}
              </tr>
            </thead>
            {sectionList.map(section => (
              <tbody key={section.id}>
                <tr className="sf-cmp-section">
                  <th colSpan={columnCount} scope="colgroup">
                    <span>{section.title}</span>
                  </th>
                </tr>
                {section.rows.map(row => (
                  <Fragment key={row.id}>
                    {/* Điện thoại: tên dòng nằm trên 1 hàng riêng (máy tính dùng ô đầu dòng bên dưới) */}
                    <tr className="sf-cmp-mlabel" aria-hidden="true">
                      <td colSpan={columnCount}>
                        <span>{row.label}</span>
                      </td>
                    </tr>
                    <tr className="sf-cmp-row">
                      <th scope="row">{row.label}</th>
                      {row.cells.map((cell, index) => (
                        <td key={productList[index].id} className={cx(cell.isBest && "is-best")}>
                          {cell.content ?? <span className="sf-cmp-empty">—</span>}
                          {cell.isBest && row.bestLabel && (
                            <span className="sf-cmp-best">
                              <i className="fas fa-check"></i>
                              {row.bestLabel}
                            </span>
                          )}
                        </td>
                      ))}
                      {canAddMore && <td className="sf-cmp-add-cell"></td>}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            ))}
          </table>
        </div>

        {/* Máy tính: 2 nút mũi tên to ở 2 mép bảng, dính giữa màn hình khi cuộn dọc (CSS position: sticky) */}
        {hasOverflow && (
          <div className="sf-cmp-arrows">
            <div className="sf-cmp-arrows-inner">
              <button
                type="button"
                className="sf-cmp-arrow sf-cmp-arrow-prev"
                aria-label={t("comparePrev")}
                title={t("comparePrev")}
                hidden={!nav.canPrev}
                onClick={() => move(-1)}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                type="button"
                className="sf-cmp-arrow sf-cmp-arrow-next"
                aria-label={t("compareNext")}
                title={t("compareNext")}
                hidden={!nav.canNext}
                onClick={() => move(1)}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Danh mục để lọc ở trang so sánh: danh mục đầu tiên của sản phẩm ("" là sản phẩm chưa có danh mục)
const getGroupId = (product: any): string => product.categoryList?.[0]?.id || ""

export function CompareView({ productList: initialList, maxItems }: { productList: any[], maxItems: number }) {
  const router = useRouter()
  const { ctx, state, request, setCompareCount } = useShop()
  const translator = createTranslator(ctx.lang)
  const { t, tName, tCount } = translator
  const { showToast } = useToast()
  const [isOnlyDiff, setIsOnlyDiff] = useState(false)
  const [isCleared, setIsCleared] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null) // null: tất cả danh mục

  // Sản phẩm khách vừa bỏ khỏi so sánh thì ẩn cột đó
  const productList = isCleared ? [] : initialList.filter(product => state.compareMap[product.id] !== false)

  if(productList.length === 0) {
    return (
      <div className="sf-empty">
        <i className="fas fa-balance-scale"></i>
        <h3>{t("compareEmptyTitle")}</h3>
        <p>{t("compareEmptyText")}</p>
        <Link href="/products" className="sf-btn sf-btn-primary">{t("goShopping")}</Link>
      </div>
    )
  }

  // Bỏ hết sản phẩm khỏi so sánh
  const handleClear = async () => {
    if(!confirm(t("clearCompareConfirm"))) return
    const data = await request("/compare/clear", "DELETE")
    if(data.code === "success") {
      setIsCleared(true)
      setCompareCount(0)
      showToast(data.message, "success")
      router.refresh()
    }
    else {
      showToast(data.message, "error")
    }
  }

  // Các danh mục có sản phẩm đang so sánh (theo thứ tự khách thêm), kèm số sản phẩm
  const groupList: { id: string, name: string, count: number }[] = []
  for (const product of productList) {
    const id = getGroupId(product)
    const group = groupList.find(item => item.id === id)
    if(group) {
      group.count++
    }
    else {
      groupList.push({ id: id, name: id ? tName(product.categoryList[0]) : t("compareNoCategory"), count: 1 })
    }
  }

  // Danh mục đang chọn không còn sản phẩm (vừa bỏ hết) thì quay về "Все"
  const activeGroupId = groupList.length > 1 && groupList.some(group => group.id === groupId) ? groupId : null
  const visibleList = activeGroupId === null ? productList : productList.filter(product => getGroupId(product) === activeGroupId)

  const canCompare = visibleList.length > 1
  const canAddMore = productList.length < maxItems
  const sectionList = buildSectionList(visibleList, ctx, translator)
    // "Только различия": bỏ dòng mà mọi sản phẩm giống nhau
    .map(section => ({
      ...section,
      rows: isOnlyDiff && canCompare
        ? section.rows.filter(row => row.cells.some(cell => cell.value !== row.cells[0].value))
        : section.rows
    }))
    .filter(section => section.rows.length > 0)

  return (
    <div className="sf-compare">
      <div className="sf-shop-toolbar sf-compare-toolbar">
        <p>
          <b>{tCount(productList.length, "productCount")}</b>
          <span className="sf-compare-limit">{t("compareLimit").replace("{count}", `${maxItems}`)}</span>
        </p>
        <div className="sf-toolbar-actions">
          {productList.length > 1 && (
            <div className="form-check sf-check sf-compare-diff">
              <input
                className="form-check-input"
                type="checkbox"
                id="compare-only-diff"
                checked={isOnlyDiff}
                onChange={event => setIsOnlyDiff(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="compare-only-diff">{t("compareOnlyDiff")}</label>
            </div>
          )}
          {canAddMore && (
            <Link href="/products" className="sf-btn sf-btn-light sf-btn-sm sf-compare-add-btn">
              <i className="fas fa-plus"></i>
              {t("compareAddMore")}
            </Link>
          )}
          <button type="button" className="sf-link-btn" onClick={handleClear}>
            <i className="far fa-trash-alt"></i>
            {t("clearCompare")}
          </button>
        </div>
      </div>

      {/* Lọc theo danh mục: so mì với mì, nước chấm với nước chấm */}
      {groupList.length > 1 && (
        <div className="sf-cmp-groups" role="group" aria-label={t("categories")}>
          <button
            type="button"
            className={cx("sf-chip", activeGroupId === null && "active")}
            aria-pressed={activeGroupId === null}
            onClick={() => setGroupId(null)}
          >
            {t("compareAllGroups")}
            <span>{productList.length}</span>
          </button>
          {groupList.map(group => (
            <button
              key={group.id || "none"}
              type="button"
              className={cx("sf-chip", activeGroupId === group.id && "active")}
              aria-pressed={activeGroupId === group.id}
              onClick={() => setGroupId(group.id)}
            >
              {group.name}
              <span>{group.count}</span>
            </button>
          ))}
        </div>
      )}

      {!canCompare && (
        <p className="sf-compare-hint">
          <i className="fas fa-info-circle"></i>
          {t("compareAddHint")}
        </p>
      )}

      {/* key: đổi danh mục thì bảng mới bắt đầu lại từ sản phẩm đầu tiên */}
      <CompareTable key={activeGroupId ?? "all"} productList={visibleList} sectionList={sectionList} canAddMore={canAddMore} />

      {sectionList.length === 0 && (
        <p className="sf-compare-hint">
          <i className="fas fa-equals"></i>
          {t("compareNoDiff")}
        </p>
      )}
    </div>
  )
}
