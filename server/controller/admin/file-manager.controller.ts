import { Request, Response } from "express"
import FormData from "form-data"
import axios from 'axios';
import { Media } from "../../models/media.model";
import moment from "moment";
import { formatFileSize } from "../../helpers/format.helper";
import { domainFileManager } from "../../config/variable.config";

export const index = async (req: Request, res: Response) => {
  const find: {
    folder?: string
  } = {}

  find.folder = "/media" //mặc định
  if(req.query.folderPath){
    find.folder = find.folder + `/${req.query.folderPath}`
  }

  // Pagination
  const limitItem: number = 20
  let page: number = 1
  if(req.query.page && Number(req.query.page) > 0){
    page = Number(req.query.page)
  }
  const totalRecord = await Media.countDocuments({})
  const totalPage = Math.ceil(totalRecord / limitItem)
  const skip = (page - 1) * limitItem

  const pagination = {
    totalRecord: totalRecord,
    totalPage: totalPage,
    skip: skip,
    currentPage: page
  }
  // End Pagination

  // Danh sách File
  const listFile: any = await Media
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .limit(limitItem)
    .skip(skip)

  for (const item of listFile) {
    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY")
    item.sizeFormat = formatFileSize(item.size)
  }
  // End Danh sách File

  // Danh sách Folder
  let listFolder = []
  const response = await axios.get(`${domainFileManager}/file-manager/folder/list?folderPath=${req.query.folderPath}`)

  if(response.data.code === "success"){
    listFolder = response.data.listFolder

    listFolder.forEach((item: any) => {
      item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY")
    })
  }
  // End Danh sách Folder

  res.render("admin/pages/file-manager", {
    pageTitle: "Quản lý file",
    listFile: listFile,
    listFolder: listFolder,
    pagination: pagination,
    page: page
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

    const folderPath = req.query.folderPath
    if(folderPath){
      formData.append("folderPath", folderPath)
    }

    const response = await axios.post(`${domainFileManager}/file-manager/upload`, formData, {
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

export const changeFileName = async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const newFileName = req.body.fileName

    const existFileById = await Media.findOne({
      _id: id
    })

    if(!existFileById){
      res.json({
        code: "error",
        message: "Không tìm thấy File"
      })
      return
    }

    const formData = new FormData()
    formData.append("folder", existFileById.folder)
    formData.append("oldFileName", existFileById.filename)
    formData.append("newFileName", newFileName)

    const response = await axios.patch(`${domainFileManager}/file-manager/change-file-name`, formData, {
      headers: formData.getHeaders() // nó y hệt với "Content-Type": "multipart/form-data"
    })

    if(response.data.code === "error"){
      res.json({
        code: "error",
        message: response.data.message
      })
      return
    }

    // Update trong DB
    await Media.updateOne({
      _id: id
    }, {
      filename: newFileName
    })

    res.json({
      code: "success",
      message: "Sửa tên file thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Lỗi server"
    })
  }
}

export const deleteFileDel = async(req: Request, res: Response) => {
  try {
    const id = req.params.id

    const existFileById = await Media.findOne({
      _id: id
    })

    if(!existFileById){
      res.json({
        code: "error",
        message: "Không tìm thấy File"
      })
      return
    }

    const formData = new FormData()
    formData.append("folder", existFileById?.folder)
    formData.append("fileName", existFileById?.filename)

    const response = await axios.patch(`${domainFileManager}/file-manager/delete-file`, formData, {
      headers: formData.getHeaders() // nó y hệt với "Content-Type": "multipart/form-data"
    })

    if(response.data.code === "error"){
      res.json({
        code: "error",
        message: response.data.message
      })
      return
    }

    // Xoá trong DB
    await Media.deleteOne({
      _id: id
    })

    res.json({
      code: "success",
      message: "Xoá file thành công!"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Lỗi server"
    })
  }
}

export const folderCreatePost = async (req: Request, res: Response) => {
  try {
    const { folderName, folderPath } = req.body

    if(!folderName){
      res.json({
        code: "error",
        message: "Vui lòng nhập tên Folder"
      })
      return
    }

    // Gửi yêu cầu sang hệ thống "file manager"
    const formData = new FormData()
    formData.append("folderName", folderName)

    if(folderPath){
      formData.append("folderPath", folderPath)
    }

    const response = await axios.post(`${domainFileManager}/file-manager/folder/create`, formData, {
      headers: formData.getHeaders() // nó y hệt với "Content-Type": "multipart/form-data"
    })

    if(response.data.code === "error"){
      res.json({
        code: "error",
        message: response.data.message
      })
      return
    }

    res.json({
      code: "success",
      message: "Tạo folder thành công"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Lỗi server khi tạo Folder EC"
    })
  }
}

export const folderDelete = async (req: Request, res: Response) => {
  try {
    const folderPath = req.query.folderPath

    if(!folderPath){
      res.json({
        code: "error",
        message: "Vui lòng gửi kèm tên Folder"
      })
      return
    }
    
    const formData = new FormData()
    formData.append("folderPath", folderPath)

    const response = await axios.patch(`${domainFileManager}/file-manager/folder/delete`, formData, {
      headers: formData.getHeaders() // nó y hệt với "Content-Type": "multipart/form-data"
    })

    if(response.data.code === "error"){
      res.json({
        code: "error",
        message: response.data.message
      })
      return
    }

    // Xoá các file liên quan trong DB
    const regexFolderPath = new RegExp(`${folderPath}`) // vì khi xoá folder cha, thì trong DB folder con cũng chứa chuỗi của folder cha
    await Media.deleteMany({
      folder: regexFolderPath
    })

    res.json({
      code: "success",
      message: "Xoá Folder thành công"
    })

  } catch (error) {
    res.json({
      code: "error",
      message: "Lỗi server"
    })
  }
}