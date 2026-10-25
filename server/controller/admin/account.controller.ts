import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { AccountAdmin } from "../../models/account-admin.model"
import { pathAdmin } from "../../config/variable.config"

export const login = async (req: Request, res: Response) => {
  res.render("admin/pages/account-login", {
    pageTitle: "Đăng nhập"
  })
}

export const loginPost = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const rememberPassword = req.body.rememberPassword === "true"

    const existAccount = await AccountAdmin.findOne({
      email: email,
      deleted: false
    })

    // Không nói rõ sai email hay sai mật khẩu, để người lạ không dò được email nào đã có tài khoản
    if(!existAccount){
      res.json({
        code: "error",
        message: "Email hoặc mật khẩu không đúng"
      })
      return
    }

    const isPasswordValid = await bcrypt.compare(password, `${existAccount.password}`)
    if(!isPasswordValid){
      res.json({
        code: "error",
        message: "Email hoặc mật khẩu không đúng"
      })
      return
    }

    if(existAccount.status !== "active"){
      res.json({
        code: "error",
        message: "Tài khoản chưa được kích hoạt hoặc đang bị tạm dừng"
      })
      return
    }

    // Tạo JWT chứa id tài khoản, ký bằng JWT_SECRET trong file .env
    // Ghi nhớ đăng nhập: 30 ngày, không ghi nhớ: 1 ngày
    const token = jwt.sign(
      {
        id: existAccount.id
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: rememberPassword ? "30d" : "1d"
      }
    )

    // Lưu token vào cookie
    // - httpOnly: JS trên trình duyệt không đọc được cookie => không bị lấy cắp token qua lỗi XSS
    // - sameSite lax: trang web khác không gửi kèm được cookie khi gọi POST/PATCH/DELETE tới server
    res.cookie("token", token, {
      maxAge: (rememberPassword ? 30 : 1) * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax"
    })

    await AccountAdmin.updateOne({
      _id: existAccount.id
    }, {
      lastLoginAt: Date.now()
    })

    res.json({
      code: "success",
      message: "Đăng nhập thành công"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: "error",
      message: "Lỗi server, vui lòng thử lại sau"
    })
  }
}

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token")
  res.redirect(`/${pathAdmin}/account/login`)
}
