import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URL}`)
    console.log("Kết nối database thành công <3")
  } catch (error) {
    console.log("Kết nối database thất bại :((")
    console.log(error)
  }
}