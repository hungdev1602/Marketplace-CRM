import mongoose from "mongoose";

// Lịch sử nhập sản phẩm từ file Excel (trang Nhập sản phẩm từ Excel)
// Mỗi lần bấm "Xác nhận nhập" tạo 1 bản ghi, server xử lý ngầm và cập nhật tiến độ vào đây
// Lịch sử cũ hơn số ngày lưu (productImportRetentionDays) được tự động xoá (helpers/product-import.helper.ts)
const schema = new mongoose.Schema(
  {
    fileName: String, // tên file đã tải lên
    mode: String, // chế độ nhập: productImportModeList trong helpers/product-import.helper.ts
    status: {
      type: String,
      enum: ["processing", "done", "failed"], // processing - Đang xử lý, done - Hoàn thành, failed - Thất bại
      default: "processing"
    },
    message: String, // lý do thất bại (khi status = failed)
    columns: [String], // các cột có trong file (key cột trong helpers/product-excel.helper.ts), dùng để tạo lại file lỗi
    totalRows: {
      type: Number,
      default: 0
    }, // tổng số dòng sản phẩm trong file
    processedRows: {
      type: Number,
      default: 0
    }, // số dòng đã xử lý (để hiện thanh tiến độ)
    createdCount: {
      type: Number,
      default: 0
    }, // số sản phẩm thêm mới
    updatedCount: {
      type: Number,
      default: 0
    }, // số sản phẩm cập nhật
    failedCount: {
      type: Number,
      default: 0
    }, // số dòng lỗi (chi tiết ở ProductImportError)
    accountId: String, // tài khoản nhập file
    accountFullName: String,
    finishedAt: Date
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

schema.index({ createdAt: -1 });

export const ProductImport = mongoose.model('ProductImport', schema, "product-imports");
