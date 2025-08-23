// Create an instance of Notyf
var notyf = new Notyf({
  duration: 3000,
  position: {
    x:'right',
    y:'top'
  },
  dismissible: true
});
// End Notyf

// Kiểm tra xem trong session có notify hay ko
const notifyData = sessionStorage.getItem("notify")
if(notifyData){
  const { type, message } = JSON.parse(notifyData)

  if(type === "success"){
    notyf.success(message)
  } 
  else if(type === "error"){
    notyf.error(message)
  }
  
  sessionStorage.removeItem("notify")
}

// Validate article Create Category Form
const articleCreateCategoryForm = document.querySelector("#articleCreateCategoryForm")
if(articleCreateCategoryForm) {
  const validator = new JustValidate('#articleCreateCategoryForm')

  validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên danh mục'
      }
    ])
    .onSuccess((event) => {
      const name = event.target.name.value
      const parent = event.target.parent.value
      const description = event.target.description.value

      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('name', name)
      formData.append('parent', parent)
      formData.append('description', description)

      // gửi data lên BE
      fetch(`/${pathAdmin}/article/category/create`, {
        method: "POST",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if(data.code === "error") {
            notyf.error(data.message)
          }

          if(data.code === "success") {
            // lưu vào session
            sessionStorage.setItem("notify", JSON.stringify({
              type: data.code,
              message: data.message
            }))
            // sau đó load lại trang
            location.reload()
          }
        })
    })
}

// End Validate article Create Category Form