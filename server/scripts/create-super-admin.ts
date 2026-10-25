// Tạo tài khoản Super Admin (tài khoản đầu tiên để đăng nhập trang admin)
// Chạy trong thư mục server: yarn create-super-admin
// - Email chưa có tài khoản: tạo tài khoản Super Admin mới
// - Email đã có tài khoản: nâng tài khoản đó lên Super Admin, đặt lại mật khẩu và kích hoạt lại
//   (dùng khi quên mật khẩu Super Admin)
import dotenv from "dotenv"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import slugify from "slugify"
import Joi from "joi"
import readline from "readline/promises"
import { AccountAdmin } from "../models/account-admin.model"
import { passwordSchema } from "../validates/admin/account-admin.validate"

// Load biến môi trường env
dotenv.config()

const schema = Joi.object({
  fullName: Joi.string()
    .required()
    .min(5)
    .max(50)
    .messages({
      "string.empty": "Vui lòng nhập họ tên!",
      "string.min": "Họ tên phải có ít nhất 5 ký tự!",
      "string.max": "Họ tên không được vượt quá 50 ký tự!",
    }),
  email: Joi.string()
    .required()
    .email()
    .messages({
      "string.empty": "Vui lòng nhập email!",
      "string.email": "Email không đúng định dạng!"
    }),
  password: passwordSchema
})

const main = async () => {
  if(!process.env.MONGO_URL){
    console.log("Chưa có MONGO_URL trong file server/.env")
    process.exit(1)
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  console.log("=== TẠO TÀI KHOẢN SUPER ADMIN ===")
  const fullName = (await rl.question("Họ tên: ")).trim()
  const email = (await rl.question("Email: ")).trim()
  const password = await rl.question("Mật khẩu (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt @$!%*?&): ")
  rl.close()

  const { error } = schema.validate({ fullName, email, password })
  if(error){
    console.log(error.details[0].message)
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URL)

  const data = {
    fullName: fullName,
    email: email,
    password: await bcrypt.hash(password, 10),
    isSuperAdmin: true,
    status: "active",
    deleted: false,
    search: slugify(`${fullName} ${email}`, {
      replacement: " ",
      lower: true
    })
  }

  const existAccount = await AccountAdmin.findOne({
    email: email
  })

  if(existAccount){
    await AccountAdmin.updateOne({
      _id: existAccount.id
    }, data)
    console.log(`Đã cập nhật tài khoản ${email} thành Super Admin và đặt lại mật khẩu`)
  }
  else{
    const newRecord = new AccountAdmin(data)
    await newRecord.save()
    console.log(`Tạo tài khoản Super Admin ${email} thành công`)
  }

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.log("Tạo tài khoản Super Admin thất bại :((")
  console.log(error)
  await mongoose.disconnect()
  process.exit(1)
})
