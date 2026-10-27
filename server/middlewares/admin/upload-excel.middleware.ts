import { NextFunction, Request, Response } from "express"
import multer from "multer"
import { productImportMaxFileSize } from "../../config/variable.config"

const upload = multer({
  limits: {
    fileSize: productImportMaxFileSize * 1024 * 1024
  }
}).single("file")

// Nhận 1 file Excel gửi lên ở ô "file" (req.file), giới hạn dung lượng productImportMaxFileSize
// File quá lớn hoặc lỗi khi tải lên thì trả về JSON để hiện thông báo lỗi (không hiện trang lỗi của Express)
export const uploadExcel = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (error: any) => {
    if(error){
      res.json({
        code: "error",
        message: error.code === "LIMIT_FILE_SIZE"
          ? `File quá lớn, tối đa ${productImportMaxFileSize}MB!`
          : "Tải file lên thất bại, vui lòng thử lại!"
      })
      return
    }

    if(req.file && !/\.xlsx$/i.test(req.file.originalname)){
      res.json({
        code: "error",
        message: "Chỉ hỗ trợ file Excel .xlsx (nếu file là .xls hoặc .csv, hãy mở bằng Excel rồi chọn Lưu thành .xlsx)!"
      })
      return
    }

    next()
  })
}
