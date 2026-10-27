import { Request, Response } from "express"
import slugify from "slugify"
import moment from "moment"
import { Product } from "../models/product.model"
import { CategoryProduct } from "../models/category-product.model"
import { ProductImport } from "../models/product-import.model"
import { ProductImportError } from "../models/product-import-error.model"
import { generateRandomString } from "./generate.helper"
import { writeLog } from "./activity-log.helper"
import { createImageDownloader } from "./remote-image.helper"
import {
  getProductExcelCategoryList,
  isExternalImageLink,
  productExcelClearValue,
  parseProductExcelCell,
  readProductWorkbook
} from "./product-excel.helper"
import { productImportRetentionDays } from "../config/variable.config"

// ===== Nhập sản phẩm từ file Excel =====
// Bước 1 - Kiểm tra (checkProductImportFile): đọc file, kiểm tra từng dòng, chưa lưu gì vào database
// Bước 2 - Nhập (runProductImport): chạy ngầm, lưu các dòng hợp lệ, cập nhật tiến độ vào ProductImport

// Chế độ nhập
export const productImportModeList = [
  {
    id: "upsert",
    name: "Thêm mới & cập nhật",
    description: "Sản phẩm đã có (tìm theo ID hoặc Mã SKU) thì cập nhật, chưa có thì thêm mới."
  },
  {
    id: "create",
    name: "Chỉ thêm mới",
    description: "Chỉ thêm sản phẩm mới, dòng trùng ID hoặc Mã SKU của sản phẩm đã có sẽ báo lỗi."
  },
  {
    id: "update",
    name: "Chỉ cập nhật",
    description: "Chỉ cập nhật sản phẩm đã có (tìm theo ID hoặc Mã SKU), không thêm sản phẩm mới. Ô để trống giữ nguyên giá trị cũ."
  }
]

export type ProductImportRow = {
  row: number, // số thứ tự dòng trong file Excel
  values: any[], // giá trị gốc các ô (để tạo file lỗi)
  sku: string, // để hiện ở danh sách lỗi
  name: string,
  hasId: boolean, // có nhập ô ID sản phẩm (kể cả ID sai) => dòng dùng để cập nhật
  action?: "create" | "update",
  product?: any, // sản phẩm đang có (khi cập nhật)
  data: any, // dữ liệu sẽ lưu vào database
  messages: string[] // lỗi của dòng
}

// Tìm kiếm theo tên, tên tiếng Nga, mã SKU, mã vạch, thương hiệu (giống formatProductBody ở product.controller.ts)
// Khi cập nhật, ô không nhập thì lấy giá trị đang có của sản phẩm
const getSearch = (data: any, product?: any) => {
  const getValue = (key: string) => (key in data ? data[key] : product?.[key]) || ""

  return slugify(`${getValue("name")} ${getValue("nameRu")} ${getValue("sku")} ${getValue("barcode")} ${getValue("brand")}`, {
    replacement: " ",
    lower: true
  })
}

// Đường dẫn tự tạo từ tên sản phẩm
// Tên toàn chữ không chuyển được sang chữ Latin (ví dụ tiếng Hàn, tiếng Trung: 신라면, 辛拉面) thì dùng "san-pham"
const getAutoSlug = (name: string) => slugify(name, { lower: true, strict: true }) || "san-pham"

// Kiểm tra file nhập
export const checkProductImportFile = async (buffer: Buffer, mode: string) => {
  const { columns, ignoredHeaders, rows } = await readProductWorkbook(buffer)
  const categoryList = await getProductExcelCategoryList()

  const idIndex = columns.findIndex(column => column.key === "_id")
  const skuIndex = columns.findIndex(column => column.key === "sku")
  const nameIndex = columns.findIndex(column => column.key === "name")

  // Đọc giá trị từng ô
  const importRows: ProductImportRow[] = rows.map(item => {
    const importRow: ProductImportRow = {
      row: item.row,
      values: item.values,
      sku: skuIndex >= 0 ? `${item.values[skuIndex]}` : "",
      name: nameIndex >= 0 ? `${item.values[nameIndex]}` : "",
      hasId: idIndex >= 0 && !["", productExcelClearValue].includes(`${item.values[idIndex]}`),
      data: {},
      messages: []
    }

    columns.forEach((column, index) => {
      const result = parseProductExcelCell(column, item.values[index], categoryList)
      if(result.error){
        importRow.messages.push(result.error)
      }
      else if(result.value !== undefined){
        importRow.data[column.key] = result.value
      }
    })

    return importRow
  })

  // Lấy các sản phẩm liên quan trong database bằng 1 truy vấn (thay vì mỗi dòng 1 truy vấn)
  // Tìm cả sản phẩm trong thùng rác, vì mã SKU, đường dẫn không được trùng với sản phẩm trong thùng rác
  const productList = await Product.find({
    $or: [
      { _id: { $in: importRows.map(item => item.data._id).filter(id => id) } },
      { sku: { $in: importRows.map(item => item.data.sku).filter(sku => sku) } }
    ]
  })
  const productById = new Map(productList.map(product => [product.id, product]))
  const productBySku = new Map(productList.filter(product => product.sku).map(product => [product.sku, product]))

  // Đường dẫn đang được dùng (đường dẫn nhập trong file và đường dẫn tự tạo từ tên sản phẩm mới)
  const slugCandidateList = importRows
    .map(item => item.data.slug || (item.data.name && !item.hasId ? getAutoSlug(item.data.name) : ""))
    .filter(slug => slug)
  const slugProductList = await Product
    .find({
      slug: { $in: slugCandidateList }
    })
    .select("slug")
  const productIdBySlug = new Map(slugProductList.map(product => [product.slug, product.id]))

  // Danh mục đang ở thùng rác: sản phẩm đang thuộc danh mục đó thì giữ nguyên khi cập nhật danh mục
  // (giống resolveCategoryIds ở product.controller.ts, khôi phục danh mục thì sản phẩm vẫn nằm trong danh mục)
  const deletedCategoryIds = (await CategoryProduct.find({ deleted: true }).select("_id")).map(category => category.id)

  // Dùng để kiểm tra trùng giữa các dòng trong file
  const rowByProductId = new Map<string, number>()
  const rowBySku = new Map<string, number>()
  const rowBySlug = new Map<string, number>()

  for (const importRow of importRows) {
    const { data, messages } = importRow
    let product: any

    // Tìm sản phẩm cần cập nhật: theo ID, không có ID thì theo mã SKU
    if(importRow.hasId){
      product = data._id ? productById.get(data._id) : undefined

      if(mode === "create"){
        messages.push(`Chế độ "Chỉ thêm mới": hãy để trống cột ID sản phẩm`)
      }
      else if(data._id && !product){
        messages.push("Không tìm thấy sản phẩm có ID này")
      }
      else if(product?.deleted){
        messages.push("Sản phẩm đang ở thùng rác, hãy khôi phục sản phẩm trước khi cập nhật")
      }

      // Đổi mã SKU: không được trùng với sản phẩm khác
      const skuOwner = data.sku ? productBySku.get(data.sku) : undefined
      if(skuOwner && skuOwner.id !== product?.id){
        messages.push(`Mã SKU "${data.sku}" đã được dùng cho sản phẩm khác`)
      }
    }
    else if(data.sku){
      product = productBySku.get(data.sku)

      if(product && mode === "create"){
        messages.push(`Mã SKU "${data.sku}" đã tồn tại`)
      }
      else if(product?.deleted){
        messages.push(`Mã SKU "${data.sku}" thuộc sản phẩm đang ở thùng rác, hãy khôi phục sản phẩm đó trước khi cập nhật`)
      }
      else if(!product && mode === "update"){
        messages.push(`Không tìm thấy sản phẩm có mã SKU "${data.sku}"`)
      }
    }
    else if(mode === "update"){
      messages.push("Thiếu ID sản phẩm hoặc Mã SKU để tìm sản phẩm cần cập nhật")
    }

    const isUpdate = !!product
    importRow.action = isUpdate ? "update" : "create"

    // 1 sản phẩm chỉ được sửa ở 1 dòng (ví dụ 1 dòng ghi ID, 1 dòng ghi mã SKU của cùng 1 sản phẩm)
    const isDuplicateProduct = isUpdate && rowByProductId.has(product.id)
    if(isDuplicateProduct){
      messages.push(`Trùng sản phẩm với dòng ${rowByProductId.get(product.id)}`)
    }
    else if(isUpdate){
      rowByProductId.set(product.id, importRow.row)
    }
    importRow.product = product
    delete data._id

    if(data.sku){
      // Đã báo trùng sản phẩm thì không báo trùng mã SKU nữa
      if(rowBySku.has(data.sku) && !isDuplicateProduct){
        messages.push(`Mã SKU "${data.sku}" bị trùng với dòng ${rowBySku.get(data.sku)}`)
      }
      rowBySku.set(data.sku, importRow.row)
    }

    // Thông tin bắt buộc (dòng có ID mà không tìm thấy sản phẩm thì đã báo lỗi ID ở trên)
    if(!isUpdate && !importRow.hasId){
      if(!data.name){
        messages.push("Thiếu tên sản phẩm")
      }
      if(typeof data.price !== "number"){
        messages.push("Thiếu giá bán")
      }
    }
    else if(isUpdate){
      if(data.name === ""){
        messages.push("Không được xoá tên sản phẩm")
      }
      if(data.price === null){
        messages.push("Không được xoá giá bán")
      }
    }

    // Giá bán phải cao hơn giá nhập, giá trước khuyến mãi phải cao hơn giá bán
    // Chỉ kiểm tra khi dòng có sửa giá (cột không nhập thì lấy giá đang có của sản phẩm)
    if(["price", "costPrice", "priceOld"].some(key => key in data)){
      const getPrice = (key: string) => key in data ? data[key] : product?.[key]
      const price = getPrice("price")
      const costPrice = getPrice("costPrice")
      const priceOld = getPrice("priceOld")

      if(typeof price === "number"){
        if(typeof costPrice === "number" && price <= costPrice){
          messages.push("Giá bán phải cao hơn giá nhập (giá vốn)")
        }
        if(typeof priceOld === "number" && priceOld <= price){
          messages.push("Giá trước khuyến mãi phải cao hơn giá bán (nhập dấu - nếu muốn bỏ giảm giá)")
        }
      }
    }

    // Đường dẫn (slug)
    if(!isUpdate){
      if(data.slug){
        if(productIdBySlug.has(data.slug) || rowBySlug.has(data.slug)){
          messages.push(`Đường dẫn "${data.slug}" đã tồn tại`)
        }
        rowBySlug.set(data.slug, importRow.row)
      }
      else if(data.name){
        // Tự tạo từ tên sản phẩm, trùng thì thêm chuỗi ngẫu nhiên (giống nút tạo đường dẫn ở form sản phẩm)
        const baseSlug = getAutoSlug(data.name)
        let slug = baseSlug
        while(productIdBySlug.has(slug) || rowBySlug.has(slug)){
          slug = `${baseSlug}-${generateRandomString()}`
        }
        data.slug = slug
        rowBySlug.set(slug, importRow.row)
      }
    }
    else if("slug" in data){
      if(data.slug === ""){
        messages.push("Không được xoá đường dẫn")
      }
      else{
        const slugOwnerId = productIdBySlug.get(data.slug)
        if((slugOwnerId && slugOwnerId !== product.id) || rowBySlug.has(data.slug)){
          messages.push(`Đường dẫn "${data.slug}" đã tồn tại`)
        }
        rowBySlug.set(data.slug, importRow.row)
      }
    }

    // Cập nhật danh mục: giữ lại danh mục đang ở thùng rác của sản phẩm
    if(isUpdate && data.category){
      const oldCategoryIds = (product.category || []).filter((id: string) => deletedCategoryIds.includes(id))
      data.category = [...new Set([...data.category, ...oldCategoryIds])]
    }
  }

  return {
    columns: columns,
    ignoredHeaders: ignoredHeaders,
    categoryList: categoryList,
    rows: importRows
  }
}

// Lưu 1 dòng hợp lệ vào database, trả về "create" hoặc "update"
// - getImagePath: tải ảnh link ngoài về Quản lý file (createImageDownloader)
// - getPosition: vị trí của sản phẩm mới (xếp xuống cuối)
const saveImportRow = async (
  importRow: ProductImportRow,
  getImagePath: (link: string) => Promise<string>,
  getPosition: () => number
) => {
  const data = { ...importRow.data }
  const product = importRow.product

  // Ảnh là link ngoài: tải về server Quản lý file, lưu đường dẫn /media/...
  if(data.avatar && isExternalImageLink(data.avatar)){
    data.avatar = await getImagePath(data.avatar)
  }
  if(data.images){
    data.images = await Promise.all(data.images.map((link: string) => isExternalImageLink(link) ? getImagePath(link) : link))
  }

  // Kiểm tra lại mã SKU, đường dẫn: có thể vừa bị sản phẩm khác dùng trong lúc đang nhập file (tải ảnh lâu)
  const excludeId = product ? { _id: { $ne: product.id } } : {}
  if(data.sku && await Product.exists({ sku: data.sku, ...excludeId })){
    throw new Error(`Mã SKU "${data.sku}" đã tồn tại`)
  }
  if(data.slug && await Product.exists({ slug: data.slug, ...excludeId })){
    throw new Error(`Đường dẫn "${data.slug}" đã tồn tại`)
  }

  data.search = getSearch(data, product)

  if(!product){
    if(data.position === undefined){
      data.position = getPosition()
    }
    await Product.create(data)
    return "create"
  }

  const result = await Product.updateOne({
    _id: product.id,
    deleted: false
  }, data)

  if(result.matchedCount === 0){
    throw new Error("Sản phẩm không còn tồn tại hoặc vừa bị xoá")
  }
  return "update"
}

// Nhập các dòng hợp lệ (chạy ngầm sau khi bấm "Xác nhận nhập"), cập nhật tiến độ vào ProductImport
export const runProductImport = async (importId: string, importRows: ProductImportRow[], req: Request, res: Response) => {
  const errorRows = importRows.filter(item => item.messages.length > 0)
  const validRows = importRows.filter(item => item.messages.length === 0)

  const progress = {
    processedRows: errorRows.length,
    createdCount: 0,
    updatedCount: 0,
    failedCount: errorRows.length
  }

  const saveRowErrors = (rowList: ProductImportRow[]) => {
    return ProductImportError.insertMany(rowList.map(item => ({
      importId: importId,
      row: item.row,
      values: item.values,
      messages: item.messages
    })))
  }

  try {
    // Lưu các dòng lỗi (lỗi khi kiểm tra file) trước
    await saveRowErrors(errorRows)

    let position = await Product.countDocuments({})
    const getImagePath = createImageDownloader()
    let lastSaveProgress = Date.now()

    for (const importRow of validRows) {
      try {
        const action = await saveImportRow(importRow, getImagePath, () => ++position)
        if(action === "create"){
          progress.createdCount++
        }
        else{
          progress.updatedCount++
        }
      } catch (error: any) {
        importRow.messages.push(error.message || "Lỗi không xác định khi lưu sản phẩm")
        await saveRowErrors([importRow])
        progress.failedCount++
      }

      progress.processedRows++

      // Cập nhật tiến độ mỗi giây (không cập nhật từng dòng cho đỡ tốn truy vấn)
      if(Date.now() - lastSaveProgress > 1000){
        await ProductImport.updateOne({ _id: importId }, progress)
        lastSaveProgress = Date.now()
      }
    }

    await ProductImport.updateOne({ _id: importId }, {
      ...progress,
      status: "done",
      finishedAt: new Date()
    })

    const importRecord = await ProductImport.findOne({ _id: importId })
    const modeName = productImportModeList.find(item => item.id === importRecord?.mode)?.name
    await writeLog(req, res, {
      module: "product",
      action: "import",
      description: `Nhập file Excel "${importRecord?.fileName}" (${modeName}): thêm mới ${progress.createdCount}, cập nhật ${progress.updatedCount}, lỗi ${progress.failedCount} dòng`,
      targetId: importId
    })
  } catch (error) {
    console.log("Nhập sản phẩm từ Excel thất bại")
    console.log(error)

    await ProductImport.updateOne({ _id: importId }, {
      ...progress,
      status: "failed",
      message: "Lỗi máy chủ khi đang nhập file. Các dòng đã xử lý trước đó vẫn được lưu, vui lòng kiểm tra lại danh sách sản phẩm.",
      finishedAt: new Date()
    }).catch(() => {})
  }
}

// Xoá lịch sử nhập file (kèm các dòng lỗi) cũ hơn số ngày lưu (productImportRetentionDays)
export const deleteOldProductImports = async () => {
  try {
    const oldImportList = await ProductImport
      .find({
        createdAt: {
          $lt: moment().subtract(productImportRetentionDays, "days").toDate()
        }
      })
      .select("_id")

    if(oldImportList.length === 0){
      return
    }

    const idList = oldImportList.map(item => item.id)
    await ProductImportError.deleteMany({ importId: { $in: idList } })
    await ProductImport.deleteMany({ _id: { $in: idList } })
  } catch (error) {
    console.log("Xoá lịch sử nhập sản phẩm cũ thất bại")
    console.log(error)
  }
}

// Thời điểm server khởi động
const serverStartedAt = new Date()

// Gọi khi khởi động server: lượt nhập đang xử lý dở (server bị tắt giữa chừng) chuyển thành thất bại
// Chỉ tính lượt nhập tạo trước khi server khởi động (không đụng tới lượt nhập vừa bắt đầu trong lúc đang kết nối database)
export const stopInterruptedProductImports = async () => {
  try {
    await ProductImport.updateMany({
      status: "processing",
      createdAt: { $lt: serverStartedAt }
    }, {
      status: "failed",
      message: "Máy chủ bị khởi động lại khi đang nhập file. Các dòng đã xử lý trước đó vẫn được lưu, vui lòng kiểm tra lại danh sách sản phẩm.",
      finishedAt: new Date()
    })
  } catch (error) {
    console.log(error)
  }
}
