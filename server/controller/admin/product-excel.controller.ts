import { Request, Response } from "express"
import moment from "moment"
import slugify from "slugify"
import { Product } from "../../models/product.model"
import { CategoryProduct } from "../../models/category-product.model"
import { ProductImport } from "../../models/product-import.model"
import { ProductImportError } from "../../models/product-import-error.model"
import { writeLog } from "../../helpers/activity-log.helper"
import {
  buildProductWorkbook,
  getProductExcelCategoryList,
  getProductExcelValue,
  isExternalImageLink,
  productExcelColumnList,
  productExcelRequiredExportKeys,
  ProductExcelError,
  sendWorkbook
} from "../../helpers/product-excel.helper"
import {
  checkProductImportFile,
  deleteOldProductImports,
  productImportModeList,
  ProductImportRow,
  runProductImport
} from "../../helpers/product-import.helper"
import { buildProductFind, productSortList } from "./product.controller"
import {
  pathAdmin,
  productImportImageFolder,
  productImportMaxFileSize,
  productImportMaxRows,
  productImportRetentionDays
} from "../../config/variable.config"

// Trạng thái lượt nhập file
// - color: màu nhãn hiển thị ở lịch sử nhập file (class badge của bootstrap)
const importStatusList = [
  { id: "processing", name: "Đang xử lý", color: "bg-warning" },
  { id: "done", name: "Hoàn thành", color: "bg-success" },
  { id: "failed", name: "Thất bại", color: "bg-danger" }
]

const getImportMode = (mode: any) => {
  return productImportModeList.find(item => item.id === mode) || productImportModeList[0]
}

// Tên file tải lên: multer đọc tên file tiếng Việt bị lỗi font (đọc theo latin1), đổi lại sang utf8
const getUploadFileName = (file: Express.Multer.File) => {
  return Buffer.from(file.originalname, "latin1").toString("utf8")
}

// Lỗi do file của người dùng thì hiện đúng lỗi, lỗi khác thì báo chung
const getFileErrorMessage = (error: any) => {
  if(error instanceof ProductExcelError){
    return error.message
  }

  console.log(error)
  return "Không đọc được file, vui lòng kiểm tra lại file Excel!"
}

// Nội dung ô "Lỗi" trong file lỗi
const formatRowError = (row: number, messages: string[]) => {
  return `Dòng ${row}:\n` + messages.map(message => `• ${message}`).join("\n")
}

// Tổng hợp kết quả kiểm tra file
const getCheckSummary = (rows: ProductImportRow[]) => {
  const validRows = rows.filter(item => item.messages.length === 0)

  // Số ảnh cần tải từ link ngoài (mỗi link chỉ tính 1 lần)
  const imageLinkList = validRows.flatMap(item => [item.data.avatar, ...(item.data.images || [])])
  const imageCount = new Set(imageLinkList.filter(link => link && isExternalImageLink(link))).size

  return {
    totalRows: rows.length,
    createCount: validRows.filter(item => item.action === "create").length,
    updateCount: validRows.filter(item => item.action === "update").length,
    errorCount: rows.length - validRows.length,
    imageCount: imageCount
  }
}

// ===== Nhập sản phẩm từ Excel =====

export const importPage = async (req: Request, res: Response) => {
  const importList: any = await ProductImport
    .find({})
    .sort({
      createdAt: "desc"
    })
    .limit(20)

  for (const item of importList) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY")
    item.modeName = getImportMode(item.mode).name
    item.statusInfo = importStatusList.find(status => status.id === item.status)
  }

  res.render("admin/pages/product-import", {
    pageTitle: "Nhập sản phẩm từ Excel",
    importList: importList,
    processingImport: importList.find((item: any) => item.status === "processing"),
    modeList: productImportModeList,
    maxRows: productImportMaxRows,
    maxFileSize: productImportMaxFileSize,
    imageFolder: productImportImageFolder,
    retentionDays: productImportRetentionDays
  })
}

// Tải file mẫu
export const importTemplate = async (req: Request, res: Response) => {
  const workbook = buildProductWorkbook({
    columns: productExcelColumnList,
    categoryList: await getProductExcelCategoryList()
  })

  await sendWorkbook(res, workbook, "mau-nhap-san-pham.xlsx")
}

// Kiểm tra file (chưa nhập), trả về số dòng thêm mới, cập nhật, lỗi và danh sách lỗi
export const importPreview = async (req: Request, res: Response) => {
  try {
    if(!req.file){
      res.json({
        code: "error",
        message: "Vui lòng chọn file Excel!"
      })
      return
    }

    const result = await checkProductImportFile(req.file.buffer, getImportMode(req.body.mode).id)
    const errorRows = result.rows.filter(item => item.messages.length > 0)

    res.json({
      code: "success",
      summary: getCheckSummary(result.rows),
      columnList: result.columns.map(column => column.header),
      ignoredHeaders: result.ignoredHeaders,
      // Chỉ trả về 200 dòng lỗi đầu tiên, xem hết thì tải file lỗi
      errorList: errorRows.slice(0, 200).map(item => ({
        row: item.row,
        sku: item.sku,
        name: item.name,
        messages: item.messages
      }))
    })
  } catch (error) {
    res.json({
      code: "error",
      message: getFileErrorMessage(error)
    })
  }
}

// Tải file lỗi khi kiểm tra file (chưa nhập)
export const importPreviewErrorFile = async (req: Request, res: Response) => {
  try {
    if(!req.file){
      res.json({
        code: "error",
        message: "Vui lòng chọn file Excel!"
      })
      return
    }

    const result = await checkProductImportFile(req.file.buffer, getImportMode(req.body.mode).id)
    const errorRows = result.rows.filter(item => item.messages.length > 0)

    const workbook = buildProductWorkbook({
      columns: result.columns,
      rows: errorRows.map(item => item.values),
      errorList: errorRows.map(item => formatRowError(item.row, item.messages)),
      categoryList: result.categoryList
    })

    const fileName = slugify(getUploadFileName(req.file).replace(/\.xlsx$/i, ""), { lower: true, strict: true })
    await sendWorkbook(res, workbook, `loi-${fileName || "nhap-san-pham"}.xlsx`)
  } catch (error) {
    res.json({
      code: "error",
      message: getFileErrorMessage(error)
    })
  }
}

// Xác nhận nhập: kiểm tra lại file, tạo lượt nhập rồi xử lý ngầm
// Trang nhập file hỏi tiến độ qua importStatus
export const importPost = async (req: Request, res: Response) => {
  try {
    if(!req.file){
      res.json({
        code: "error",
        message: "Vui lòng chọn file Excel!"
      })
      return
    }

    // Mỗi lúc chỉ nhập 1 file, tránh 2 file cùng sửa 1 sản phẩm hoặc cùng tạo 1 mã SKU
    const processingImport = await ProductImport.findOne({
      status: "processing"
    })
    if(processingImport){
      res.json({
        code: "error",
        message: `Đang nhập file "${processingImport.fileName}" (${processingImport.accountFullName}), vui lòng đợi xử lý xong rồi thử lại!`
      })
      return
    }

    const mode = getImportMode(req.body.mode)
    const result = await checkProductImportFile(req.file.buffer, mode.id)
    const summary = getCheckSummary(result.rows)

    if(summary.createCount + summary.updateCount === 0){
      res.json({
        code: "error",
        message: "File không có dòng hợp lệ nào để nhập, vui lòng sửa các dòng lỗi rồi thử lại!"
      })
      return
    }

    await deleteOldProductImports()

    const account = res.locals.account
    const importRecord = await ProductImport.create({
      fileName: getUploadFileName(req.file),
      mode: mode.id,
      columns: result.columns.map(column => column.key),
      totalRows: summary.totalRows,
      processedRows: summary.errorCount,
      failedCount: summary.errorCount,
      accountId: account.id,
      accountFullName: account.fullName
    })

    res.json({
      code: "success",
      message: "Đã bắt đầu nhập file",
      importId: importRecord.id
    })

    // Xử lý ngầm, không chờ (file nhiều dòng, nhiều ảnh cần tải có thể mất vài phút)
    runProductImport(importRecord.id, result.rows, req, res)
  } catch (error) {
    res.json({
      code: "error",
      message: getFileErrorMessage(error)
    })
  }
}

// Tiến độ của 1 lượt nhập
export const importStatus = async (req: Request, res: Response) => {
  try {
    const importRecord = await ProductImport.findOne({
      _id: req.params.id
    })

    if(!importRecord){
      res.json({
        code: "error",
        message: "Không tìm thấy lượt nhập file!"
      })
      return
    }

    res.json({
      code: "success",
      importRecord: {
        status: importRecord.status,
        message: importRecord.message,
        totalRows: importRecord.totalRows,
        processedRows: importRecord.processedRows,
        createdCount: importRecord.createdCount,
        updatedCount: importRecord.updatedCount,
        failedCount: importRecord.failedCount
      }
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Không tìm thấy lượt nhập file!"
    })
  }
}

// Tải file lỗi của 1 lượt nhập (ở lịch sử nhập file)
export const importErrorFile = async (req: Request, res: Response) => {
  try {
    const importRecord = await ProductImport.findOne({
      _id: req.params.id
    })

    if(!importRecord){
      res.redirect(`/${pathAdmin}/product/import`)
      return
    }

    const errorList = await ProductImportError
      .find({
        importId: importRecord.id
      })
      .sort({
        row: "asc"
      })

    // Các cột của file đã nhập (bỏ cột không còn trong danh sách cột, nếu sau này có đổi)
    const columnIndexList = importRecord.columns
      .map((key, index) => ({ index: index, column: productExcelColumnList.find(column => column.key === key) }))
      .filter(item => item.column)

    const workbook = buildProductWorkbook({
      columns: columnIndexList.map(item => item.column!),
      rows: errorList.map(error => columnIndexList.map(item => error.values[item.index] ?? "")),
      errorList: errorList.map(error => formatRowError(error.row || 0, error.messages)),
      categoryList: await getProductExcelCategoryList()
    })

    await sendWorkbook(res, workbook, `loi-nhap-san-pham-${moment(importRecord.createdAt).format("YYYY-MM-DD-HHmm")}.xlsx`)
  } catch (error) {
    res.redirect(`/${pathAdmin}/product/import`)
  }
}

// ===== Xuất sản phẩm ra Excel =====
// - scope: "all" - tất cả sản phẩm, còn lại - theo bộ lọc đang chọn ở trang danh sách sản phẩm
// - groups: nhóm cột cần xuất, cách nhau bằng dấu phẩy (productExcelGroupList), để trống là xuất tất cả
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const allCategory = await CategoryProduct.find({
      deleted: false
    })

    const find = req.query.scope === "all" ? { deleted: false } : buildProductFind(req.query, allCategory)
    const sortItem = productSortList.find(item => item.id === req.query.sort) || productSortList[0]

    const groupList = `${req.query.groups || ""}`.split(",").filter(group => group)
    const columns = productExcelColumnList.filter(column => {
      return productExcelRequiredExportKeys.includes(column.key) || groupList.length === 0 || groupList.includes(column.group)
    })

    const productList = await Product
      .find(find)
      .sort({
        ...sortItem.sort,
        _id: "desc"
      } as any)

    const categoryList = await getProductExcelCategoryList()

    const workbook = buildProductWorkbook({
      columns: columns,
      rows: productList.map(product => columns.map(column => getProductExcelValue(column, product, categoryList))),
      categoryList: categoryList
    })

    await writeLog(req, res, {
      module: "product",
      action: "export",
      description: `Xuất ${productList.length} sản phẩm ra file Excel (${req.query.scope === "all" ? "tất cả sản phẩm" : "theo bộ lọc"})`
    })

    await sendWorkbook(res, workbook, `san-pham-${moment().format("YYYY-MM-DD-HHmm")}.xlsx`)
  } catch (error) {
    console.log(error)
    res.redirect(`/${pathAdmin}/product/list`)
  }
}
