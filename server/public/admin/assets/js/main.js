// TinyMCE
const initialTinyMCE = () => {
  tinymce.init({
    selector: '[textarea-mce]',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat | image',
  });
}

initialTinyMCE()
// End TinyMCE

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

const drawNotify = (type, message) => {
  // lưu vào session
  sessionStorage.setItem("notify", JSON.stringify({
    type: type,
    message: message
  }))
  // sau đó load lại trang
  location.reload()
}

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

// article Create Category Form
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
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn'
      }
    ])
    .onSuccess((event) => {
      const name = event.target.name.value
      const slug = event.target.slug.value
      const parent = event.target.parent.value
      const description = tinymce.get("description").getContent()
      const status = event.target.status.value

      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      formData.append('parent', parent)
      formData.append('description', description)
      formData.append('status', status)

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
            drawNotify(data.code, data.message)
          }
        })
    })
}
// End article Create Category Form

// btn-generate-slug
const btnGenerateSlug = document.querySelector("[btn-generate-slug]")
if(btnGenerateSlug){
  btnGenerateSlug.addEventListener("click", () => {
    const modelName = btnGenerateSlug.getAttribute("model") //model cho bên BE
    const from = btnGenerateSlug.getAttribute("from") // lấy data ở đâu để tạo slug
    const to = btnGenerateSlug.getAttribute("to") // sau khi có slug thì paste vào đâu

    const string = document.querySelector(`[name='${from}']`).value
    
    const dataFinal = {
      string,
      modelName
    }

    fetch(`/${pathAdmin}/helper/generate-slug`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataFinal)
    })
      .then(res => res.json())
      .then(data => {
        if(data.code === "error") {
          notyf.error(data.message)
        }
        else if(data.code === "success") {
          const slugInput = document.querySelector(`[name='${to}']`)
          slugInput.value = data.slug
        }
      })
  })
}
// End btn-generate-slug

// article edit Category Form
const articleEditCategoryForm = document.querySelector("#articleEditCategoryForm")
if(articleEditCategoryForm) {
  const validator = new JustValidate('#articleEditCategoryForm')

  validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên danh mục'
      }
    ])
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn'
      }
    ])
    .onSuccess((event) => {
      const id = event.target.id.value
      const name = event.target.name.value
      const slug = event.target.slug.value
      const parent = event.target.parent.value
      const description = tinymce.get("description").getContent()
      const status = event.target.status.value

      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      formData.append('parent', parent)
      formData.append('description', description)
      formData.append('status', status)

      // gửi data lên BE
      fetch(`/${pathAdmin}/article/category/edit/${id}`, {
        method: "PATCH",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if(data.code === "error") {
            notyf.error(data.message)
          }

          if(data.code === "success") {
            notyf.success(data.message)
          }
        })
    })
}
// End article edit Category Form

// button API
const listButtonApi = document.querySelectorAll("[button-api]")
if(listButtonApi.length > 0){
  listButtonApi.forEach(button => {
    button.addEventListener("click", () => {
      const method = button.getAttribute("data-method")
      if(method == "DELETE"){
        Swal.fire({
          title: "Bạn có chắc muốn xoá không? Sau khi xoá sẽ không khôi phục được dữ liệu",
          showDenyButton: true,
          showCancelButton: false,
          confirmButtonText: "Xoá",
          denyButtonText: `Không xoá`
        }).then((result) => {
          if (result.isConfirmed) {
            const method = button.getAttribute("data-method")
            const api = button.getAttribute("data-api")

            fetch(api, {
              method: method || "GET"
            })
              .then(res => res.json())
              .then(data => {
                if(data.code === "error") {
                  notyf.error(data.message)
                }

                if(data.code === "success") {
                  drawNotify(data.code, data.message)
                }
              })
          }
        })
      }
      else{
        const method = button.getAttribute("data-method")
        const api = button.getAttribute("data-api")

        fetch(api, {
          method: method || "GET"
        })
          .then(res => res.json())
          .then(data => {
            if(data.code === "error") {
              notyf.error(data.message)
            }

            if(data.code === "success") {
              drawNotify(data.code, data.message)
            }
          })
      }
    })
  })
}
// End button API

// Form Search
const formSearch = document.querySelector("[form-search]")
if(formSearch) {
  const url = new URL(window.location.href)

  formSearch.addEventListener("submit", (event) => {
    event.preventDefault()

    const value = event.target.keyword.value
    
    if(value){
      url.searchParams.set("keyword", value)
    }
    else{
      url.searchParams.delete("keyword")
    }

    window.location.href = url.href
  })

  // Hiển thị giá trị mặc định vào ô input của search
  const valueCurrent = url.searchParams.get("keyword")
  if(valueCurrent){
    formSearch.keyword.value = valueCurrent
  }
}
// ENd Form Search

// Pagination
const pagination = document.querySelector("[pagination]")
if(pagination) {
  const allButtonPagination = pagination.querySelectorAll("[button-pagination]")
  const url = new URL(window.location.href)
  const currentPage = parseInt(url.searchParams.get("page")) || 1
  
  // Xử lý click pagination
  allButtonPagination.forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault()
      
      if(button.parentElement.classList.contains("disabled")) {
        return // Không làm gì nếu button bị disabled
      }
      
      const page = parseInt(button.getAttribute("page"))
      if(page && page > 0) {
        url.searchParams.set("page", page)
        window.location.href = url.href
      }
    })
  })

  // Xử lý active state và disabled state
  allButtonPagination.forEach(button => {
    const buttonPage = parseInt(button.getAttribute("page"))
    const liElement = button.parentElement
    
    // Remove existing classes
    liElement.classList.remove("active", "disabled")
    
    // Check if this is the current page
    if(buttonPage === currentPage) {
      liElement.classList.add("active")
    }
    
    // Check for previous/next buttons disabled state
    const ariaLabel = button.getAttribute("aria-label")
    if(ariaLabel === "Previous" && currentPage === 1) {
      liElement.classList.add("disabled")
    }
    if(ariaLabel === "Next" && currentPage === parseInt(pagination.getAttribute("data-total-pages") || currentPage)) {
      liElement.classList.add("disabled")
    }
  })
}
// End Pagination

// Button copy
const listButtonCopy = document.querySelectorAll("[button-copy]")
if(listButtonCopy.length > 0){
  listButtonCopy.forEach(button => {
    button.addEventListener("click", () => {
      const contentCopy = button.getAttribute("content-copy")
      navigator.clipboard.writeText(contentCopy)

      notyf.success("Đã copy!")
    })
  })
}
// End Button copy