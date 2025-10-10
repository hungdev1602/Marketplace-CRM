import { Request, Response } from "express"
import FormData from "form-data"
import axios from 'axios';
import { Media } from "../../models/media.model";

export const index = (req: Request, res: Response) => {
  res.render("admin/pages/file-manager", {
    pageTitle: "Quản lý file"
  })
}

export const uploadPost = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
  
    const formData = new FormData()

    files?.forEach(file => {
      formData.append("files", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      })
    })

    const response = await axios.post("http://localhost:4000/file-manager/upload", formData, {
      headers: formData.getHeaders() // nó y hệt với "Content-Type": "multipart/form-data"
    })

    if(response.data.code === "success") {
      await Media.insertMany(response.data.saveLinks) // insertMany lưu nhiều bản ghi 1 lúc, truyền vào 1 mảng
      res.json({
        code: "success",
        message: "Upload thành công"
      })
    }
    else{
      res.json({
        code: "error",
        message: "Lỗi upload"
      })
    }
  } catch (error) {
    res.json({
      code: "error",
      message: "Lỗi upload"
    })
  }
}