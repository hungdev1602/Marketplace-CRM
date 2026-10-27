import mongoose from "mongoose";

// Các dòng lỗi của 1 lần nhập sản phẩm từ Excel (ProductImport), dùng để tạo "file lỗi" cho người dùng sửa rồi nhập lại
// Lưu riêng mỗi dòng 1 bản ghi (không lưu chung trong ProductImport) vì file nhiều dòng lỗi có thể vượt giới hạn 16MB của 1 bản ghi
const schema = new mongoose.Schema(
  {
    importId: String, // id lần nhập (ProductImport)
    row: Number, // số thứ tự dòng trong file Excel
    values: [mongoose.Schema.Types.Mixed], // giá trị các ô của dòng, theo thứ tự cột ProductImport.columns
    messages: [String] // danh sách lỗi của dòng (không đặt tên "errors" vì trùng tên có sẵn của mongoose)
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

schema.index({ importId: 1, row: 1 });

export const ProductImportError = mongoose.model('ProductImportError', schema, "product-import-errors");
