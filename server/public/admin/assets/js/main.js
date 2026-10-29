// Trình soạn thảo (Quill)
// Quill có sẵn trong template, chỉ được nhúng ở trang có [textarea-editor] (partials/script-editor.pug)
// Mỗi textarea có thuộc tính [textarea-editor] được thay bằng 1 ô soạn thảo Quill.
// Nếu không tải được Quill thì textarea vẫn hiện để nhập nội dung dạng văn bản thường
const listEditor = {}

// Hỏi đường dẫn ảnh/video, điền sẵn domain của server file-manager
// (chỉ cần dán thêm đường dẫn file đã copy ở trang Quản lý file)
const askMediaLink = async (title) => {
  if(typeof Swal === "undefined") {
    return prompt(title, domainFileManager)
  }

  const result = await Swal.fire({
    title: title,
    input: "text",
    inputValue: domainFileManager,
    showCancelButton: true,
    confirmButtonText: "Chèn",
    cancelButtonText: "Huỷ"
  })

  return result.isConfirmed ? result.value : null
}

// Chèn ảnh/video vào vị trí con trỏ
const insertMedia = async (quill, type) => {
  const range = quill.getSelection(true)

  let link = await askMediaLink(type === "image" ? "Chèn ảnh" : "Chèn video")
  if(!link) {
    return
  }

  // Link YouTube => đổi sang link nhúng để phát được trong bài viết
  const youtube = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if(type === "video" && youtube) {
    link = `https://www.youtube.com/embed/${youtube[1]}`
  }

  quill.insertEmbed(range.index, type, link, "user")
  quill.setSelection(range.index + 1, 0)
}

const listTextareaEditor = document.querySelectorAll("[textarea-editor]")
if(listTextareaEditor.length > 0) {
  if(typeof Quill !== "undefined") {
    // Khi lấy HTML, Quill mặc định đổi video thành thẻ <a>, sửa lại để giữ nguyên thẻ <iframe>
    const Video = Quill.import("formats/video")
    class VideoEmbed extends Video {
      html() {
        return this.domNode.outerHTML
      }
    }
    Quill.register(VideoEmbed, true)

    listTextareaEditor.forEach(textarea => {
      const editorElement = document.createElement("div")
      textarea.after(editorElement)
      textarea.style.display = "none"

      const quill = new Quill(editorElement, {
        theme: "snow",
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, 4, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ align: [] }],
              [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
              ["blockquote", "code-block"],
              ["link", "image", "video"],
              ["clean"]
            ],
            handlers: {
              image: () => insertMedia(quill, "image"),
              video: () => insertMedia(quill, "video")
            }
          },
          // Không chèn ảnh dạng base64 khi kéo thả / dán file ảnh (làm database rất nặng)
          uploader: {
            mimetypes: []
          }
        }
      })

      // Hiển thị nội dung cũ (HTML) đang có trong textarea
      quill.setContents(quill.clipboard.convert({ html: textarea.value }), "silent")
      quill.history.clear()

      listEditor[textarea.id] = quill
    })
  }
  else {
    console.error("Không tải được thư viện Quill")
  }
}

// Lấy nội dung (HTML) của ô soạn thảo; nếu không có Quill thì lấy trực tiếp từ textarea
const getEditorContent = (id) => {
  const quill = listEditor[id]
  if(quill) {
    // Ô soạn thảo trống thì trả về chuỗi rỗng, bỏ các dòng trống thừa ở cuối
    return quill.getLength() > 1 ? quill.getSemanticHTML().replace(/(<p><\/p>)+$/, "") : ""
  }
  return document.getElementById(id).value
}
// End Trình soạn thảo

// Create an instance of Notyf
var notyf
if(typeof Notyf !== "undefined"){
  notyf = new Notyf({
    duration: 3000,
    position: {
      x:'right',
      y:'top'
    },
    dismissible: true
  });
}
else{
  // Không tải được Notyf từ CDN => dùng alert để các tính năng bên dưới vẫn chạy
  console.error("Không tải được thư viện Notyf")
  notyf = {
    success: (message) => alert(message),
    error: (message) => alert(message)
  }
}
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
    .addField('#avatar', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn ảnh'
      }
    ])
    .onSuccess((event) => {
      const name = event.target.name.value
      const slug = event.target.slug.value
      const avatar = event.target.avatar.value 
      const parent = event.target.parent.value
      const description = getEditorContent("description")
      const status = event.target.status.value

      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      formData.append('avatar', avatar)
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
      const avatar = event.target.avatar.value
      const parent = event.target.parent.value
      const description = getEditorContent("description")
      const status = event.target.status.value

      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      formData.append('avatar', avatar)
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

// productCreateCategoryForm, productEditCategoryForm
const getProductCategoryFormData = (form) => {
  const formData = new FormData()
  formData.append("name", form.name.value)
  formData.append("nameRu", form.nameRu.value)
  formData.append("slug", form.slug.value)
  formData.append("avatar", form.avatar.value)
  formData.append("parent", form.parent.value)
  formData.append("position", form.position.value)
  formData.append("status", form.status.value)
  formData.append("description", getEditorContent("description"))
  formData.append("metaTitle", form.metaTitle.value)
  formData.append("metaDescription", form.metaDescription.value)
  return formData
}

const addProductCategoryValidate = (validator) => {
  return validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên danh mục!'
      }
    ])
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn!'
      }
    ])
}

const productCreateCategoryForm = document.querySelector("#productCreateCategoryForm")
if(productCreateCategoryForm) {
  const validator = new JustValidate('#productCreateCategoryForm')

  addProductCategoryValidate(validator)
    .onSuccess((event) => {
      fetch(`/${pathAdmin}/product/category/create`, {
        method: "POST",
        body: getProductCategoryFormData(event.target)
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

const productEditCategoryForm = document.querySelector("#productEditCategoryForm")
if(productEditCategoryForm) {
  const validator = new JustValidate('#productEditCategoryForm')

  addProductCategoryValidate(validator)
    .onSuccess((event) => {
      const id = event.target.id.value

      fetch(`/${pathAdmin}/product/category/edit/${id}`, {
        method: "PATCH",
        body: getProductCategoryFormData(event.target)
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
// End productCreateCategoryForm, productEditCategoryForm

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

// Form Filter (bộ lọc gồm nhiều ô, ví dụ trang nhật ký hoạt động)
// Ô nào có giá trị thì thêm vào URL, ô trống thì bỏ khỏi URL, giá trị đang lọc do server điền sẵn vào ô
const formFilter = document.querySelector("[form-filter]")
if(formFilter) {
  formFilter.addEventListener("submit", (event) => {
    event.preventDefault()

    const url = new URL(window.location.href)
    const formData = new FormData(formFilter)

    formData.forEach((value, key) => {
      value = value.trim()
      if(value){
        url.searchParams.set(key, value)
      }
      else{
        url.searchParams.delete(key)
      }
    })

    // Lọc lại thì quay về trang 1
    url.searchParams.delete("page")

    window.location.href = url.href
  })
}
// End Form Filter

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

// Modal Preview File
const modalPreviewFile = document.querySelector("#previewFileModal")
if(modalPreviewFile){
  const innerPreview = modalPreviewFile.querySelector(".inner-preview")

  let clickedFile = null
  const listButtonPreviewFile = document.querySelectorAll("[button-preview-file]")

  listButtonPreviewFile.forEach(button => {
    button.addEventListener("click", () => {
      clickedFile = button
    })
  })

  // Close modal event
  modalPreviewFile.addEventListener("hidden.bs.modal", (event) => {
    clickedFile = null
    innerPreview.innerHTML = ""
  })

  // Open modal event
  modalPreviewFile.addEventListener("shown.bs.modal", (event) => {
    const dataFile = clickedFile.getAttribute("data-file")
    const fileMimetype = clickedFile.getAttribute("data-mimetype")
    if(fileMimetype.includes("image")){
      innerPreview.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 600px; overflow: hidden;">
          <img src="${dataFile}" alt="" width="auto" height="600px" style="object-fit: cover;">
        </div>
      `
    }
    else if(fileMimetype.includes("video")){
      innerPreview.innerHTML = `
        <video src="${dataFile}" controls width="100%" height="600px"></video>
      `
    }
    else if(fileMimetype.includes("audio")){
      innerPreview.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 600px; overflow: hidden;">
          <audio src="${dataFile}" controls width="100%" height="600px"></audio>
        </div>
      `
    }
    else if(fileMimetype.includes("pdf")){
      innerPreview.innerHTML = `
        <iframe src="${dataFile}" width="100%" height="600px" style="object-fit: cover;"></iframe>
      `
    }
  })
}
// End Modal Preview File

// Modal Change File Name
const modalChangeFileName = document.querySelector("#modalChangeFileName")
if(modalChangeFileName){
  let clickedFile = null
  const listButtonChangeFileName = document.querySelectorAll("[button-change-file-name]")
  const form = modalChangeFileName.querySelector("form")

  listButtonChangeFileName.forEach(button => {
    button.addEventListener("click", () => {
      clickedFile = button
    })
  })

  // Close modal event
  modalChangeFileName.addEventListener("hidden.bs.modal", (event) => {
    clickedFile = null
    form.reset()
  })

  // Open modal event
  modalChangeFileName.addEventListener("shown.bs.modal", (event) => {
    const dataFileName = clickedFile.getAttribute("data-file-name")
    const dataFileId = clickedFile.getAttribute("data-file-id")
    
    form.fileId.value = dataFileId
    form.fileName.value = dataFileName
  })

  // Sự kiện submit form
  form.addEventListener("submit", (event) => {
    event.preventDefault()

    const fileId = form.fileId.value
    const fileName = form.fileName.value

    // có id và tên thì mới gửi lên BE
    if(fileId && fileName){
      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('fileName', fileName)
  
      // gửi data lên BE
      fetch(`/${pathAdmin}/file-manager/change-file-name/${fileId}`, {
        method: "PATCH",
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
    }
  })
}
// End Modal Change File Name

// Button Delete File
const listButtonDeleteFile = document.querySelectorAll("[button-delete-file]")
if(listButtonDeleteFile.length > 0){
  listButtonDeleteFile.forEach(button => {
    button.addEventListener("click", () => {
      const fileId = button.getAttribute("data-file-id")
      const fileName = button.getAttribute("data-file-name")

      Swal.fire({
        title: `Bạn có chắc muốn xoá File: ${fileName}?`,
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Xoá",
        denyButtonText: `Không xoá`
      }).then((result) => {
        if (result.isConfirmed) {
          fetch(`/${pathAdmin}/file-manager/delete-file/${fileId}`, {
            method: "DELETE"
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
  })
}
// End Button Delete File

// Form Create Folder
const formCreateFolder = document.querySelector("[form-create-folder]")
if(formCreateFolder) {
  formCreateFolder.addEventListener("submit", (event) => {
    event.preventDefault()

    const folderName = event.target.folderName.value

    if(!folderName) {
      notyf.error("Vui lòng nhập tên folder")
    }
    else{
      // Tạo form bằng JS
      const formData = new FormData()
      formData.append('folderName', folderName)

      // Check xem có searchParams hay ko
      const searchParams = new URLSearchParams(window.location.search)
      const folderPath = searchParams.get("folderPath")
      if(folderPath){
        formData.append('folderPath', folderPath)
      }
  
      // gửi data lên BE
      fetch(`/${pathAdmin}/file-manager/folder/create`, {
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
    }
  })
}
// End Form Create Folder

// Button To Folder
const listButtonToFolder = document.querySelectorAll("[button-to-folder]")
if(listButtonToFolder.length > 0){
  const url = new URL(window.location.href)

  listButtonToFolder.forEach(button => {
    button.addEventListener("click", () => {
      let folderPath = button.getAttribute("data-folder-path")
      if(folderPath) {

        const searchParams = new URLSearchParams(window.location.search)
        const folderPathCurrent = searchParams.get("folderPath")
        if(folderPathCurrent){
          folderPath = `${folderPathCurrent}/${folderPath}`
        }
        url.searchParams.set("folderPath", folderPath)
      }
      else{
        url.searchParams.delete("folderPath")
      }
      window.location.href = url.href
    })
  })
}
// End Button To Folder

// Breadcrumb Folder
const breadcrumbFolder = document.querySelector("[breadcrumb-folder]")
if(breadcrumbFolder) {
  const searchParams = new URLSearchParams(window.location.search)
  const folderPath = searchParams.get("folderPath") || ""
  const listFolder = folderPath !== "" ? folderPath.split("/") : []

  let htmls = `
    <li class="list-group-item bg-dark">
      <a href="/${pathAdmin}/file-manager">
        <i class="la la-angle-double-right text-info me-2"></i>Quản lý file
      </a>
    </li>
  `

  let path = ""
  listFolder.forEach((item, index) => {
    path += (index > 0 ? "/" : "")  + listFolder[index]
    htmls += `
      <li class="list-group-item bg-dark">
        <a href="/${pathAdmin}/file-manager?folderPath=${path}">
          <i class="la la-angle-double-right text-info me-2"></i>${item}
        </a>
      </li>
    `
  })
  breadcrumbFolder.innerHTML = htmls
}
// End Breadcrumb Folder

// Delete Folder
const listButtonDeleteFolder = document.querySelectorAll("[button-delete-folder]")
if(listButtonDeleteFolder.length > 0){
  listButtonDeleteFolder.forEach(button => {
    button.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search)
      const folderPath = urlParams.get("folderPath") || ""
      const folderName = button.getAttribute("data-folder-name")

      let folderFinal = "/media"
      if(folderPath){
        folderFinal += `/${folderPath}`
      }
      if(folderName){
        folderFinal += `/${folderName}`
      }

      Swal.fire({
        title: `Bạn có chắc muốn xoá Folder ${folderName} không? Sau khi xoá sẽ không khôi phục được dữ liệu`,
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Xoá",
        denyButtonText: `Không xoá`
      }).then((result) => {
        if(result.isConfirmed) {
          fetch(`/${pathAdmin}/file-manager/folder/delete?folderPath=${folderFinal}`, {
            method: "DELETE"
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
  })
}
// End Delete Folder

// form-group-file
// Nhập đường dẫn file thì hiện ảnh xem trước, dùng cho cả ô chọn 1 file và từng dòng của ô chọn nhiều file
const initFormGroupFile = (element) => {
  const inputFile = element.querySelector("[input-file]")
  const previewFile = element.querySelector("[preview-file]")

  inputFile.addEventListener("input", () => {
    const value = inputFile.value
    if(value !== ""){
      previewFile.style.display = "block"
    }
    else{
      previewFile.style.display = "none"
    }
    previewFile.querySelector("img").src = `${domainFileManager}${value}`
  })

  // Hiển thị ảnh mặc định, ở trên là khi chưa có mặc định
  if(inputFile.value !== "") {
    previewFile.style.display = "block"
    previewFile.querySelector("img").src = `${domainFileManager}${inputFile.value}`
  }
}

const listFormGroupFile = document.querySelectorAll("[form-group-file]")
listFormGroupFile.forEach(formGroupFile => initFormGroupFile(formGroupFile))
// End form-group-file

// form-group-file-multiple (chọn nhiều file, ví dụ album ảnh sản phẩm)
const listFormGroupFileMultiple = document.querySelectorAll("[form-group-file-multiple]")
listFormGroupFileMultiple.forEach(formGroupFileMultiple => {
  const fileList = formGroupFileMultiple.querySelector("[file-multiple-list]")
  const template = formGroupFileMultiple.querySelector("[file-multiple-template]")
  const buttonAddFile = formGroupFileMultiple.querySelector("[button-add-file]")

  const initItem = (item) => {
    initFormGroupFile(item)

    item.querySelector("[button-remove-file]").addEventListener("click", () => {
      item.remove()
    })
  }

  fileList.querySelectorAll("[file-multiple-item]").forEach(item => initItem(item))

  buttonAddFile.addEventListener("click", () => {
    const item = template.content.firstElementChild.cloneNode(true)
    fileList.appendChild(item)
    initItem(item)
    item.querySelector("[input-file]").focus()
  })
})

// Lấy danh sách đường dẫn file (bỏ dòng trống) của ô chọn nhiều file
const getFileMultipleList = (name) => {
  const formGroupFileMultiple = document.querySelector(`[form-group-file-multiple="${name}"]`)
  const inputList = formGroupFileMultiple.querySelectorAll("[file-multiple-list] [input-file]")
  const fileList = []
  inputList.forEach(input => {
    const value = input.value.trim()
    if(value){
      fileList.push(value)
    }
  })
  return fileList
}
// End form-group-file-multiple

// Modal File Manager
// iframe quản lý file chỉ được tải khi mở modal lần đầu (không tải ngầm ở mọi trang)
const modalFileManager = document.querySelector("#modalFileManager")
if(modalFileManager){
  modalFileManager.addEventListener("show.bs.modal", () => {
    const iframe = modalFileManager.querySelector("iframe[data-src]")
    if(iframe && !iframe.getAttribute("src")){
      iframe.setAttribute("src", iframe.getAttribute("data-src"))
    }
  })
}
// End Modal File Manager

// Checkbox List
const getCheckboxList = (name) => {
  const checkboxList = document.querySelector(`[checkbox-list="${name}"]`)
  const inputList = checkboxList.querySelectorAll(`input[type="checkbox"]:checked`)
  const idList = []
  inputList.forEach(input => {
    const id = input.getAttribute("value")
    if(id){
      idList.push(id)
    }
  })
  return idList
}
// End Checkbox List

// articleCreateForm
const articleCreateForm = document.querySelector("#articleCreateForm")
if(articleCreateForm) {
  const validator = new JustValidate('#articleCreateForm')

  validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên bài viết!'
      }
    ])
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn!'
      }
    ])
    .onSuccess((event) => {
      event.preventDefault()
      const name = event.target.name.value
      const slug = event.target.slug.value
      const category = getCheckboxList("category")
      const status = event.target.status.value
      const avatar = event.target.avatar.value
      const description = getEditorContent("description")
      const content = getEditorContent("content")

      // Tạo FormData
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("category", JSON.stringify(category));
      formData.append("status", status);
      formData.append("avatar", avatar);
      formData.append("description", description);
      formData.append("content", content);
      
      fetch(`/${pathAdmin}/article/create`, {
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
// End articleCreateForm

// articleEditForm
const articleEditForm = document.querySelector("#articleEditForm")
if(articleEditForm) {
  const validator = new JustValidate('#articleEditForm')

  validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên bài viết!'
      }
    ])
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn!'
      }
    ])
    .onSuccess((event) => {
      event.preventDefault()
      const id = event.target.id.value
      const name = event.target.name.value
      const slug = event.target.slug.value
      const category = getCheckboxList("category")
      const status = event.target.status.value
      const avatar = event.target.avatar.value
      const description = getEditorContent("description")
      const content = getEditorContent("content")

      // Tạo FormData
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("category", JSON.stringify(category));
      formData.append("status", status);
      formData.append("avatar", avatar);
      formData.append("description", description);
      formData.append("content", content);
      
      fetch(`/${pathAdmin}/article/edit/${id}`, {
        method: "PATCH",
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
// End articleEditForm

// productCreateForm, productEditForm
const getProductFormData = (form) => {
  const formData = new FormData()

  // Ô nhập chữ, số, ô chọn
  const fieldList = [
    "name", "nameRu", "slug", "sku", "barcode", "brand", "origin", "manufacturer", "importer",
    "price", "priceOld", "costPrice", "unit", "stock", "vat",
    "netWeight", "netWeightUnit", "shelfLife", "shelfLifeUnit", "storageType", "storageNote",
    "ingredients", "calories", "protein", "fat", "carbohydrate", "usageInstructions",
    "certificateNumber", "grossWeight", "packageLength", "packageWidth", "packageHeight",
    "avatar", "status", "position", "metaTitle", "metaDescription"
  ]
  fieldList.forEach(field => {
    formData.append(field, form.querySelector(`[name="${field}"]`).value.trim())
  })

  // Công tắc bật/tắt
  const switchList = ["markingRequired", "featured", "newArrival"]
  switchList.forEach(field => {
    formData.append(field, form.querySelector(`[name="${field}"]`).checked)
  })

  // Ô chọn nhiều
  formData.append("category", JSON.stringify(getCheckboxList("category")))
  formData.append("dietTags", JSON.stringify(getCheckboxList("dietTags")))
  formData.append("allergens", JSON.stringify(getCheckboxList("allergens")))
  formData.append("images", JSON.stringify(getFileMultipleList("images")))

  // Trình soạn thảo
  formData.append("description", getEditorContent("description"))
  formData.append("content", getEditorContent("content"))

  return formData
}

const addProductValidate = (validator, form) => {
  return validator
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên sản phẩm!'
      }
    ])
    .addField('#slug', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập đường dẫn!'
      }
    ])
    .addField('#barcode', [
      {
        validator: (value) => value.trim() === "" || /^\d{8,14}$/.test(value.trim()),
        errorMessage: 'Mã vạch chỉ gồm 8 đến 14 chữ số!'
      }
    ])
    .addField('#price', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập giá bán!'
      },
      {
        validator: (value) => Number(value) >= 0,
        errorMessage: 'Giá bán không được âm!'
      },
      {
        validator: (value) => form.costPrice.value === "" || Number(value) > Number(form.costPrice.value),
        errorMessage: 'Giá bán phải cao hơn giá nhập (giá vốn)!'
      }
    ], {
      errorsContainer: form.querySelector('#price').closest('.mb-3')
    })
    .addField('#priceOld', [
      {
        validator: (value) => value === "" || Number(value) > Number(form.price.value),
        errorMessage: 'Giá trước khuyến mãi phải cao hơn giá bán (để trống nếu không giảm giá)!'
      }
    ], {
      errorsContainer: form.querySelector('#priceOld').closest('.mb-3')
    })
}

const productCreateForm = document.querySelector("#productCreateForm")
if(productCreateForm) {
  const validator = new JustValidate('#productCreateForm')

  addProductValidate(validator, productCreateForm)
    .onSuccess((event) => {
      fetch(`/${pathAdmin}/product/create`, {
        method: "POST",
        body: getProductFormData(event.target)
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

const productEditForm = document.querySelector("#productEditForm")
if(productEditForm) {
  const validator = new JustValidate('#productEditForm')

  addProductValidate(validator, productEditForm)
    .onSuccess((event) => {
      const id = event.target.id.value

      fetch(`/${pathAdmin}/product/edit/${id}`, {
        method: "PATCH",
        body: getProductFormData(event.target)
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
// End productCreateForm, productEditForm

// Xuất sản phẩm ra Excel (trang danh sách sản phẩm)
// Giữ nguyên bộ lọc, sắp xếp đang chọn trên URL, thêm phạm vi xuất (scope) và nhóm thông tin cần xuất (groups)
const productExportForm = document.querySelector("#productExportForm")
if(productExportForm) {
  productExportForm.addEventListener("submit", (event) => {
    event.preventDefault()

    const groupList = [...productExportForm.querySelectorAll("[name='groups']:checked")].map(input => input.value)
    if(groupList.length === 0) {
      notyf.error("Vui lòng chọn ít nhất 1 nhóm thông tin cần xuất!")
      return
    }

    const scope = productExportForm.scope.value
    const url = new URL(`/${pathAdmin}/product/export`, window.location.origin)
    if(scope === "filter") {
      new URL(window.location.href).searchParams.forEach((value, key) => {
        if(key !== "page") {
          url.searchParams.set(key, value)
        }
      })
    }
    url.searchParams.set("scope", scope)
    url.searchParams.set("groups", groupList.join(","))

    // Server trả về file nên trình duyệt chỉ tải file xuống, vẫn ở trang hiện tại
    window.location.href = url.href

    bootstrap.Modal.getOrCreateInstance(document.querySelector("#modalProductExport")).hide()
    notyf.success("Đang tạo file Excel, file sẽ tự động tải xuống...")
  })
}
// End Xuất sản phẩm ra Excel

// Nhập sản phẩm từ Excel
// Đổi ký tự đặc biệt HTML, dùng khi hiện dữ liệu trong file người dùng tải lên
const escapeHtml = (text) => {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Gọi API trả về file (ví dụ file lỗi) rồi tải xuống; API trả về JSON là bị lỗi
const downloadFileFromApi = (api, formData) => {
  return fetch(api, {
    method: "POST",
    body: formData
  })
    .then(async (res) => {
      if((res.headers.get("Content-Type") || "").includes("application/json")) {
        const data = await res.json()
        notyf.error(data.message)
        return
      }

      // Tên file trong header Content-Disposition
      const disposition = res.headers.get("Content-Disposition") || ""
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="?([^";]+)"?/i)

      const link = document.createElement("a")
      link.href = URL.createObjectURL(await res.blob())
      link.download = match ? decodeURIComponent(match[1]) : "file.xlsx"
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 10000)
    })
}

const productImportForm = document.querySelector("#productImportForm")
if(productImportForm) {
  const previewBox = document.querySelector("[import-preview]")
  const progressBox = document.querySelector("[import-progress]")
  const buttonCheck = productImportForm.querySelector("[button-import-check]")
  const buttonConfirm = previewBox.querySelector("[button-import-confirm]")
  const buttonErrorFile = previewBox.querySelector("[button-import-error-file]")
  let summary = null // kết quả kiểm tra file

  // Dữ liệu gửi lên: file và chế độ nhập
  const getImportFormData = () => {
    const formData = new FormData()
    formData.append("file", productImportForm.file.files[0])
    formData.append("mode", productImportForm.mode.value)
    return formData
  }

  // Đổi file hoặc chế độ nhập thì phải kiểm tra lại
  productImportForm.addEventListener("change", () => {
    previewBox.classList.add("d-none")
  })

  // Hiện kết quả kiểm tra file
  const renderImportPreview = (data) => {
    summary = data.summary

    previewBox.querySelector("[import-total]").textContent = summary.totalRows
    previewBox.querySelector("[import-create]").textContent = summary.createCount
    previewBox.querySelector("[import-update]").textContent = summary.updateCount
    previewBox.querySelector("[import-error]").textContent = summary.errorCount
    previewBox.querySelector("[import-columns]").textContent = `Các cột đọc được (${data.columnList.length}): ${data.columnList.join(", ")}`

    const ignoredBox = previewBox.querySelector("[import-ignored]")
    ignoredBox.classList.toggle("d-none", data.ignoredHeaders.length === 0)
    ignoredBox.textContent = `Các cột sau không khớp tên cột của file mẫu nên bị bỏ qua: ${data.ignoredHeaders.join(", ")}`

    const imageBox = previewBox.querySelector("[import-images]")
    imageBox.classList.toggle("d-none", summary.imageCount === 0)
    imageBox.textContent = `Có ${summary.imageCount} ảnh từ link ngoài sẽ được tải về Quản lý file, quá trình nhập có thể mất vài phút.`

    // Danh sách dòng lỗi
    previewBox.querySelector("[import-error-box]").classList.toggle("d-none", summary.errorCount === 0)
    previewBox.querySelector("[import-error-list]").innerHTML = data.errorList.map(item => `
      <tr>
        <td>${item.row}</td>
        <td>${escapeHtml(item.sku)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="text-danger">${item.messages.map(message => escapeHtml(message)).join("<br>")}</td>
      </tr>
    `).join("")

    const errorMore = previewBox.querySelector("[import-error-more]")
    errorMore.classList.toggle("d-none", summary.errorCount <= data.errorList.length)
    errorMore.textContent = `Đang hiện ${data.errorList.length}/${summary.errorCount} dòng lỗi, tải file lỗi để xem tất cả.`

    const validCount = summary.createCount + summary.updateCount
    buttonConfirm.disabled = validCount === 0
    buttonConfirm.innerHTML = `<i class="fa-solid fa-file-import me-1"></i> Xác nhận nhập ${validCount} dòng hợp lệ`

    previewBox.classList.remove("d-none")
    previewBox.scrollIntoView({ behavior: "smooth" })
  }

  // Bước 2: Kiểm tra file
  productImportForm.addEventListener("submit", (event) => {
    event.preventDefault()

    if(!productImportForm.file.files[0]) {
      notyf.error("Vui lòng chọn file Excel!")
      return
    }

    buttonCheck.disabled = true
    fetch(`/${pathAdmin}/product/import/preview`, {
      method: "POST",
      body: getImportFormData()
    })
      .then(res => res.json())
      .then(data => {
        if(data.code === "error") {
          notyf.error(data.message)
          previewBox.classList.add("d-none")
          return
        }

        renderImportPreview(data)
      })
      .catch(() => notyf.error("Không kết nối được máy chủ, vui lòng thử lại!"))
      .finally(() => {
        buttonCheck.disabled = false
      })
  })

  // Tải file lỗi (các dòng lỗi kèm cột "Lỗi", sửa xong nhập lại file này)
  buttonErrorFile.addEventListener("click", () => {
    buttonErrorFile.disabled = true
    downloadFileFromApi(`/${pathAdmin}/product/import/preview-error-file`, getImportFormData())
      .catch(() => notyf.error("Không tải được file lỗi, vui lòng thử lại!"))
      .finally(() => {
        buttonErrorFile.disabled = false
      })
  })

  // Theo dõi tiến độ nhập file, xong thì tải lại trang để xem kết quả ở lịch sử nhập file
  const trackImportProgress = (importId) => {
    progressBox.classList.remove("d-none")
    buttonCheck.disabled = true

    const progressBar = progressBox.querySelector("[import-progress-bar]")
    const progressText = progressBox.querySelector("[import-progress-text]")

    const checkStatus = () => {
      fetch(`/${pathAdmin}/product/import/status/${importId}`)
        .then(res => res.json())
        .then(data => {
          if(data.code === "error") {
            notyf.error(data.message)
            return
          }

          const item = data.importRecord
          const percent = item.totalRows > 0 ? Math.floor(item.processedRows * 100 / item.totalRows) : 0
          progressBar.style.width = `${percent}%`
          progressBar.textContent = `${percent}%`
          progressText.textContent = `Đã xử lý ${item.processedRows}/${item.totalRows} dòng: thêm mới ${item.createdCount}, cập nhật ${item.updatedCount}, lỗi ${item.failedCount}`

          if(item.status === "done") {
            drawNotify("success", `Nhập file xong: thêm mới ${item.createdCount}, cập nhật ${item.updatedCount}, lỗi ${item.failedCount} dòng`)
            return
          }

          if(item.status === "failed") {
            drawNotify("error", item.message || "Nhập file thất bại!")
            return
          }

          setTimeout(checkStatus, 1500)
        })
        .catch(() => setTimeout(checkStatus, 3000)) // mất kết nối thì thử lại
    }

    checkStatus()
  }

  // Bước 3: Xác nhận nhập
  const startImport = () => {
    buttonConfirm.disabled = true
    buttonCheck.disabled = true

    fetch(`/${pathAdmin}/product/import`, {
      method: "POST",
      body: getImportFormData()
    })
      .then(res => res.json())
      .then(data => {
        if(data.code === "error") {
          notyf.error(data.message)
          buttonConfirm.disabled = false
          buttonCheck.disabled = false
          return
        }

        previewBox.classList.add("d-none")
        trackImportProgress(data.importId)
      })
      .catch(() => {
        notyf.error("Không kết nối được máy chủ, vui lòng thử lại!")
        buttonConfirm.disabled = false
        buttonCheck.disabled = false
      })
  }

  buttonConfirm.addEventListener("click", () => {
    const message = `Thêm mới ${summary.createCount} và cập nhật ${summary.updateCount} sản phẩm. Các dòng lỗi sẽ bị bỏ qua.`

    if(typeof Swal === "undefined") {
      if(confirm(message)) {
        startImport()
      }
      return
    }

    Swal.fire({
      title: "Xác nhận nhập file?",
      text: message,
      showCancelButton: true,
      confirmButtonText: "Nhập",
      cancelButtonText: "Huỷ"
    }).then((result) => {
      if(result.isConfirmed) {
        startImport()
      }
    })
  })

  // Đang có lượt nhập chưa xong (ví dụ tải lại trang khi đang nhập) thì tiếp tục theo dõi
  const processingImportId = progressBox.getAttribute("data-import-id")
  if(processingImportId) {
    trackImportProgress(processingImportId)
  }
}
// End Nhập sản phẩm từ Excel

// couponCreateForm, couponEditForm
// Chọn sản phẩm áp dụng mã giảm giá: tìm sản phẩm rồi bấm "Chọn", trả về hàm lấy danh sách id đã chọn
const initCouponProductPicker = (picker) => {
  const searchInput = picker.querySelector("[product-search-input]")
  const searchButton = picker.querySelector("[product-search-button]")
  const resultBox = picker.querySelector("[product-search-result]")
  const selectedBox = picker.querySelector("[product-selected-list]")
  const selectedCount = picker.querySelector("[product-selected-count]")

  // Sản phẩm đã chọn (trang sửa: server điền sẵn vào data-products)
  let selectedList = JSON.parse(selectedBox.getAttribute("data-products") || "[]")
  let resultList = []

  // Ảnh, tên, SKU, giá của 1 sản phẩm
  const productInfoHtml = (product) => `
    <div class="d-flex align-items-center gap-2 flex-grow-1">
      ${product.avatar
        ? `<img src="${escapeHtml(domainFileManager + product.avatar)}" class="thumb-md rounded" style="object-fit: contain;">`
        : `<span class="thumb-md rounded bg-light d-inline-block"></span>`}
      <div>
        <div class="fw-medium">
          ${escapeHtml(product.name || "")}
          ${product.deleted ? `<span class="badge bg-danger ms-1">Trong thùng rác</span>` : ""}
          ${product.status === "inactive" ? `<span class="badge bg-secondary ms-1">Ngừng bán</span>` : ""}
        </div>
        <div class="small text-muted">
          ${product.sku ? `SKU: ${escapeHtml(product.sku)} · ` : ""}${escapeHtml(product.priceFormat || "")}
        </div>
      </div>
    </div>
  `

  const renderSelected = () => {
    selectedCount.textContent = selectedList.length

    if(selectedList.length === 0){
      selectedBox.innerHTML = `<div class="list-group-item text-muted small">Chưa chọn sản phẩm nào, hãy tìm sản phẩm ở ô bên trên rồi bấm "Chọn"</div>`
      return
    }

    selectedBox.innerHTML = selectedList.map(product => `
      <div class="list-group-item d-flex align-items-center gap-2">
        ${productInfoHtml(product)}
        <span class="btn btn-sm btn-outline-danger" button-remove-product="${escapeHtml(product.id)}" title="Bỏ chọn">
          <i class="fa-solid fa-xmark"></i>
        </span>
      </div>
    `).join("")

    selectedBox.querySelectorAll("[button-remove-product]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("button-remove-product")
        selectedList = selectedList.filter(product => product.id !== id)
        renderSelected()
        renderResult()
      })
    })
  }

  const renderResult = () => {
    if(resultList.length === 0){
      resultBox.innerHTML = ""
      return
    }

    resultBox.innerHTML = resultList.map(product => {
      const isSelected = selectedList.some(item => item.id === product.id)
      return `
        <div class="list-group-item d-flex align-items-center gap-2">
          ${productInfoHtml(product)}
          ${isSelected
            ? `<span class="btn btn-sm btn-success disabled"><i class="fa-solid fa-check me-1"></i>Đã chọn</span>`
            : `<span class="btn btn-sm btn-outline-primary" button-choose-product="${escapeHtml(product.id)}">Chọn</span>`}
        </div>
      `
    }).join("")

    resultBox.querySelectorAll("[button-choose-product]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("button-choose-product")
        const product = resultList.find(item => item.id === id)
        if(product && !selectedList.some(item => item.id === id)){
          selectedList.push(product)
        }
        renderSelected()
        renderResult()
      })
    })
  }

  const search = () => {
    const keyword = searchInput.value.trim()

    fetch(`/${pathAdmin}/coupon/product-search?keyword=${encodeURIComponent(keyword)}`)
      .then(res => res.json())
      .then(data => {
        if(data.code === "error") {
          notyf.error(data.message)
          return
        }

        resultList = data.productList
        renderResult()

        if(resultList.length === 0){
          resultBox.innerHTML = `<div class="list-group-item text-muted small">Không tìm thấy sản phẩm nào</div>`
        }
      })
      .catch(() => {
        notyf.error("Tìm sản phẩm thất bại, vui lòng tải lại trang và thử lại!")
      })
  }

  searchButton.addEventListener("click", search)

  // Nhấn Enter ở ô tìm kiếm thì tìm sản phẩm (không gửi form)
  searchInput.addEventListener("keydown", (event) => {
    if(event.key === "Enter"){
      event.preventDefault()
      search()
    }
  })

  renderSelected()

  return () => selectedList.map(product => product.id)
}

const initCouponForm = (form) => {
  // Dùng getAttribute vì form sửa có ô tên "id", nên form.id là ô nhập đó chứ không phải id của form
  const formId = form.getAttribute("id")

  // Ẩn/hiện ô nhập theo loại giảm giá và phạm vi áp dụng
  const isFieldVisible = (field) => !form.querySelector(`[coupon-field="${field}"]`).classList.contains("d-none")

  // Lời nhắc dưới ô "Giảm tối đa" (loại giảm theo %): đơn từ bao nhiêu thì được giảm đủ mức tối đa
  // Ví dụ giảm 15% tối đa 500 ₽: đơn từ 3 334 ₽ mới được giảm đủ 500 ₽, đơn 300 ₽ chỉ được giảm 45 ₽
  const maxDiscountHint = form.querySelector("[max-discount-hint]")

  // Định dạng tiền rúp kiểu Nga giống trang danh sách, ví dụ: 3334 => "3 334 ₽", 49.95 => "49,95 ₽"
  const formatRub = (price) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price) + " ₽"

  const updateMaxDiscountHint = () => {
    const percent = Number(form.querySelector(`[name="discountValue"]`).value)
    const maxDiscountValue = form.querySelector(`[name="maxDiscount"]`).value.trim()
    const minOrderValue = form.querySelector(`[name="minOrderValue"]`).value.trim()
    const maxDiscount = Number(maxDiscountValue)

    // Chưa nhập đủ số % hoặc giảm tối đa thì ẩn lời nhắc
    if(!isFieldVisible("maxDiscount") || maxDiscountValue === "" || !(maxDiscount > 0) || !(percent > 0 && percent <= 100)){
      maxDiscountHint.classList.add("d-none")
      return
    }

    // Đơn nhỏ nhất được giảm đủ mức tối đa, làm tròn lên đến rúp (toFixed để bỏ sai số khi chia số thập phân)
    const fullDiscountOrder = Math.ceil(Number((maxDiscount * 100 / percent).toFixed(2)))
    let hint = `Đơn từ ${formatRub(fullDiscountOrder)} mới được giảm đủ ${formatRub(maxDiscount)}, đơn nhỏ hơn được giảm ${percent}%.`

    const minOrder = Number(minOrderValue)
    if(minOrderValue !== "" && minOrder > 0){
      const minOrderDiscount = minOrder * percent / 100
      hint = minOrderDiscount >= maxDiscount
        ? `Đơn tối thiểu ${formatRub(minOrder)} đã được giảm đủ ${formatRub(maxDiscount)}, nên mọi đơn dùng mã đều được giảm đúng ${formatRub(maxDiscount)}.`
        : `${hint} Ví dụ đơn ${formatRub(minOrder)} (tối thiểu) được giảm ${formatRub(minOrderDiscount)}.`
    }

    maxDiscountHint.textContent = hint
    maxDiscountHint.classList.remove("d-none")
  }

  const updateCouponFields = () => {
    const discountType = form.querySelector(`[name="discountType"]`).value
    const applyTo = form.querySelector(`[name="applyTo"]`).value

    const fieldVisible = {
      discountValue: discountType !== "free-shipping",
      maxDiscount: discountType === "percent",
      freeShippingNote: discountType === "free-shipping",
      applyTo: discountType !== "free-shipping",
      categories: discountType !== "free-shipping" && applyTo === "category",
      products: discountType !== "free-shipping" && applyTo === "product"
    }
    for (const field in fieldVisible) {
      form.querySelector(`[coupon-field="${field}"]`).classList.toggle("d-none", !fieldVisible[field])
    }

    form.querySelector("[discount-unit]").textContent = discountType === "percent" ? "%" : "₽"

    updateMaxDiscountHint()
  }

  form.querySelector(`[name="discountType"]`).addEventListener("change", updateCouponFields)
  form.querySelector(`[name="applyTo"]`).addEventListener("change", updateCouponFields)
  updateCouponFields()

  // Nhập số % giảm, giảm tối đa, đơn tối thiểu thì tính lại lời nhắc
  const hintFieldList = ["discountValue", "maxDiscount", "minOrderValue"]
  hintFieldList.forEach(field => {
    form.querySelector(`[name="${field}"]`).addEventListener("input", updateMaxDiscountHint)
  })

  // Tạo mã ngẫu nhiên 8 ký tự (bỏ các ký tự dễ nhầm: 0 - O, 1 - I - L)
  form.querySelector("[button-random-code]").addEventListener("click", () => {
    const characters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 8; i++) {
      code += characters[Math.floor(Math.random() * characters.length)]
    }
    form.querySelector(`[name="code"]`).value = code
  })

  const getProductIds = initCouponProductPicker(form.querySelector("[coupon-product-picker]"))

  // Dữ liệu gửi lên, ô đang ẩn gửi giá trị trống
  const getCouponFormData = () => {
    const formData = new FormData()

    const fieldList = [
      "code", "name", "description", "discountType", "discountValue", "maxDiscount",
      "minOrderValue", "applyTo", "usageLimit", "usageLimitPerCustomer", "startAt", "endAt", "status"
    ]
    fieldList.forEach(field => {
      formData.append(field, form.querySelector(`[name="${field}"]`).value.trim())
    })

    // Mã luôn là chữ in hoa
    formData.set("code", formData.get("code").toUpperCase())

    // Miễn phí giao hàng không có mức giảm, áp dụng cho cả đơn hàng; giảm tối đa chỉ dùng cho loại giảm theo %
    if(!isFieldVisible("discountValue")) formData.set("discountValue", "")
    if(!isFieldVisible("maxDiscount")) formData.set("maxDiscount", "")
    if(!isFieldVisible("applyTo")) formData.set("applyTo", "all")

    formData.append("categories", JSON.stringify(isFieldVisible("categories") ? getCheckboxList("categories") : []))
    formData.append("products", JSON.stringify(isFieldVisible("products") ? getProductIds() : []))

    return formData
  }

  const validator = new JustValidate(`#${formId}`)

  validator
    .addField('#code', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập mã giảm giá!'
      },
      {
        validator: (value) => /^[A-Za-z0-9_-]{3,30}$/.test(value.trim()),
        errorMessage: 'Mã gồm 3 - 30 ký tự: chữ cái Latin không dấu, chữ số, dấu - hoặc _ (không có khoảng trắng)!'
      }
    ], {
      errorsContainer: form.querySelector('#code').closest('.mb-3')
    })
    .addField('#name', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập tên chương trình!'
      }
    ])
    .addField('#discountValue', [
      {
        validator: (value) => !isFieldVisible("discountValue") || value !== "",
        errorMessage: 'Vui lòng nhập mức giảm!'
      },
      {
        validator: (value) => {
          if(!isFieldVisible("discountValue")) return true
          const discountType = form.querySelector(`[name="discountType"]`).value
          return discountType === "percent" ? Number(value) > 0 && Number(value) <= 100 : Number(value) > 0
        },
        errorMessage: 'Mức giảm phải lớn hơn 0 (giảm theo % thì không quá 100)!'
      }
    ], {
      errorsContainer: form.querySelector('#discountValue').closest('.mb-3')
    })
    .addField('#startAt', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng chọn thời gian bắt đầu!'
      }
    ])
    .addField('#endAt', [
      {
        validator: (value) => value === "" || value > form.querySelector(`[name="startAt"]`).value,
        errorMessage: 'Thời gian kết thúc phải sau thời gian bắt đầu!'
      }
    ])
    .onSuccess(() => {
      if(isFieldVisible("categories") && getCheckboxList("categories").length === 0){
        notyf.error("Vui lòng chọn ít nhất 1 danh mục được áp dụng mã!")
        return
      }

      if(isFieldVisible("products") && getProductIds().length === 0){
        notyf.error("Vui lòng chọn ít nhất 1 sản phẩm được áp dụng mã!")
        return
      }

      const api = formId === "couponEditForm"
        ? `/${pathAdmin}/coupon/edit/${form.querySelector(`[name="id"]`).value}`
        : `/${pathAdmin}/coupon/create`

      fetch(api, {
        method: formId === "couponEditForm" ? "PATCH" : "POST",
        body: getCouponFormData()
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

const couponCreateForm = document.querySelector("#couponCreateForm")
if(couponCreateForm) {
  initCouponForm(couponCreateForm)
}

const couponEditForm = document.querySelector("#couponEditForm")
if(couponEditForm) {
  initCouponForm(couponEditForm)
}
// End couponCreateForm, couponEditForm

// roleCreateForm
const roleCreateForm = document.querySelector("#roleCreateForm")
if(roleCreateForm){
  const validation = new JustValidate("#roleCreateForm")

  validation
    .addField("#name", [
      {
        rule: "required",
        errorMessage: "Vui lòng nhập tên nhóm quyền!"
      }
    ])
    .onSuccess((event) => {
      const name = event.target.name.value
      const description = event.target.description.value
      const permissions = getCheckboxList("permissions")
      const status = event.target.status.value

      // Tạo formData
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("permissions", JSON.stringify(permissions))
      formData.append("status", status)

      fetch(`/${pathAdmin}/role/create`, {
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
// End roleCreateForm

// roleEditForm
const roleEditForm = document.querySelector("#roleEditForm")
if(roleEditForm){
  const validation = new JustValidate("#roleEditForm")

  validation
    .addField("#name", [
      {
        rule: "required",
        errorMessage: "Vui lòng nhập tên nhóm quyền!"
      }
    ])
    .onSuccess((event) => {
      const id = event.target.id.value
      const name = event.target.name.value
      const description = event.target.description.value
      const permissions = getCheckboxList("permissions")
      const status = event.target.status.value

      // Tạo formData
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("permissions", JSON.stringify(permissions))
      formData.append("status", status)

      fetch(`/${pathAdmin}/role/edit/${id}`, {
        method: "PATCH",
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
// End roleEditForm

// accountAdminCreateForm
const accountAdminCreateForm = document.querySelector("#accountAdminCreateForm")
if(accountAdminCreateForm){
  const validation = new JustValidate("#accountAdminCreateForm")

  validation
    .addField("#fullName", [
      {
        rule: "required",
        errorMessage: "Vui lòng nhập họ tên!"
      },
      {
        rule: "minLength",
        value: 5,
        errorMessage: "Họ tên phải có ít nhất 5 ký tự"
      },
      {
        rule: "maxLength",
        value: 50,
        errorMessage: "Họ tên không được vượt quá 50 ký tự"
      }
    ])
    .addField("#email", [
      {
        rule: "required",
        errorMessage: "Vui lòng nhập email!"
      },
      {
        rule: "email",
        errorMessage: "Email không đúng định dạng"
      }
    ])
    .addField('#password', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập mật khẩu!',
      },
      {
        validator: (value) => value.length >= 8,
        errorMessage: 'Mật khẩu phải chứa ít nhất 8 ký tự!',
      },
      {
        validator: (value) => /[A-Z]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ cái in hoa!',
      },
      {
        validator: (value) => /[a-z]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ cái thường!',
      },
      {
        validator: (value) => /\d/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ số!',
      },
      {
        validator: (value) => /[@$!%*?&]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt!',
      },
    ])

    .onSuccess((event) => {
      const fullName = event.target.fullName.value;
      const email = event.target.email.value;
      const password = event.target.password.value;
      const status = event.target.status.value;
      const avatar = event.target.avatar.value;
      const roles = getCheckboxList("roles");

      // Tạo formData
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("status", status);
      formData.append("avatar", avatar);
      formData.append("roles", JSON.stringify(roles));


      fetch(`/${pathAdmin}/account-admin/create`, {
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
// End roleCreateForm

// accountAdminEditForm
const accountAdminEditForm = document.querySelector("#accountAdminEditForm");
if(accountAdminEditForm) {
  const validation = new JustValidate('#accountAdminEditForm');

  validation
    .addField('#fullName', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập họ tên!'
      },
      {
        rule: 'minLength',
        value: 5,
        errorMessage: 'Họ tên phải có ít nhất 5 ký tự!',
      },
      {
        rule: 'maxLength',
        value: 50,
        errorMessage: 'Họ tên không được vượt quá 50 ký tự!',
      },
    ])
    .addField('#email', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập email của bạn!',
      },
      {
        rule: 'email',
        errorMessage: 'Email không đúng định dạng!',
      },
    ])
    .onSuccess((event) => {
      const id = event.target.id.value;
      const fullName = event.target.fullName.value;
      const email = event.target.email.value;
      const status = event.target.status.value;
      const avatar = event.target.avatar.value;
      const roles = getCheckboxList("roles");

      // Tạo FormData
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      formData.append("status", status);
      formData.append("avatar", avatar);
      formData.append("roles", JSON.stringify(roles));
      
      fetch(`/${pathAdmin}/account-admin/edit/${id}`, {
        method: "PATCH",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if(data.code == "error") {
            notyf.error(data.message);
          }

          if(data.code == "success") {
            drawNotify(data.code, data.message)
          }
        })
    })
  ;
}

// End accountAdminEditForm

// Nút con mắt ẩn/hiện mật khẩu
// Thêm thuộc tính [button-toggle-password="#idÔMậtKhẩu"] vào nút là dùng được
const listButtonTogglePassword = document.querySelectorAll("[button-toggle-password]");
listButtonTogglePassword.forEach(button => {
  const input = document.querySelector(button.getAttribute("button-toggle-password"));
  const icon = button.querySelector("i");

  button.addEventListener("click", () => {
    const isHidden = input.type === "password";
    const title = isHidden ? "Ẩn mật khẩu" : "Hiện mật khẩu";

    // Đổi ô nhập: password (dấu chấm) <=> text (chữ thường)
    input.type = isHidden ? "text" : "password";

    // Đổi icon: mắt mở <=> mắt gạch chéo
    icon.classList.toggle("fa-eye", !isHidden);
    icon.classList.toggle("fa-eye-slash", isHidden);

    button.title = title;
    button.setAttribute("aria-label", title);
  })
})
// End Nút con mắt ẩn/hiện mật khẩu

// loginForm
const loginForm = document.querySelector("#loginForm");
if(loginForm) {
  const submitLogin = (form) => {
    const email = form.email.value;
    const password = form.password.value;
    const rememberPassword = form.rememberPassword.checked;

    // Tạo FormData
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("rememberPassword", rememberPassword);

    fetch(`/${pathAdmin}/account/login`, {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if(data.code == "error") {
          notyf.error(data.message);
        }

        if(data.code == "success") {
          // Lưu thông báo vào session, sang trang tổng quan sẽ hiện thông báo
          sessionStorage.setItem("notify", JSON.stringify({
            type: data.code,
            message: data.message
          }))
          window.location.href = `/${pathAdmin}/dashboard`;
        }
      })
  }

  if(typeof JustValidate !== "undefined") {
    const validation = new JustValidate('#loginForm');

    validation
      .addField('#email', [
        {
          rule: 'required',
          errorMessage: 'Vui lòng nhập email!',
        },
        {
          rule: 'email',
          errorMessage: 'Email không đúng định dạng!',
        },
      ])
      .addField('#password', [
        {
          rule: 'required',
          errorMessage: 'Vui lòng nhập mật khẩu!',
        },
      ], {
        errorsContainer: '#passwordError',
      })
      .onSuccess((event) => {
        submitLogin(event.target)
      })
    ;
  }
  else {
    // Không tải được JustValidate từ CDN => vẫn đăng nhập được, server sẽ kiểm tra dữ liệu
    console.error("Không tải được thư viện JustValidate")
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault()
      submitLogin(loginForm)
    })
  }
}
// End loginForm

// accountAdminChangePasswordForm
const accountAdminChangePasswordForm = document.querySelector("#accountAdminChangePasswordForm");
if(accountAdminChangePasswordForm) {
  const validation = new JustValidate('#accountAdminChangePasswordForm');

  validation
    .addField('#password', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng nhập mật khẩu!',
      },
      {
        validator: (value) => value.length >= 8,
        errorMessage: 'Mật khẩu phải chứa ít nhất 8 ký tự!',
      },
      {
        validator: (value) => /[A-Z]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ cái in hoa!',
      },
      {
        validator: (value) => /[a-z]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ cái thường!',
      },
      {
        validator: (value) => /\d/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một chữ số!',
      },
      {
        validator: (value) => /[@$!%*?&]/.test(value),
        errorMessage: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt!',
      },
    ])
    .addField('#confirmPassword', [
      {
        rule: 'required',
        errorMessage: 'Vui lòng xác nhận mật khẩu!',
      },
      {
        validator: (value) => value === accountAdminChangePasswordForm.password.value,
        errorMessage: 'Mật khẩu xác nhận không khớp!',
      },
    ])
    .onSuccess((event) => {
      const id = event.target.id.value;
      const password = event.target.password.value;
      const confirmPassword = event.target.confirmPassword.value;

      // Tạo FormData
      const formData = new FormData();
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);

      fetch(`/${pathAdmin}/account-admin/change-password/${id}`, {
        method: "PATCH",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if(data.code == "error") {
            notyf.error(data.message);
          }

          if(data.code == "success") {
            drawNotify(data.code, data.message)
          }
        })
    })
  ;
}
// End accountAdminChangePasswordForm

// Biểu đồ trang tổng quan
// Mỗi ô [dashboard-chart] là 1 biểu đồ cột ngang (ApexCharts, chỉ nhúng ở trang tổng quan)
// Dữ liệu do server điền vào data-chart: { labels: ["Mì - Bún - Phở", ...], values: [12, ...] }
const listDashboardChart = document.querySelectorAll("[dashboard-chart]")
if(listDashboardChart.length > 0) {
  // Màu theo giao diện sáng / tối đang chọn
  const isDarkTheme = document.documentElement.getAttribute("data-bs-theme") === "dark"
  const chartTextColor = getComputedStyle(document.body).getPropertyValue("--bs-secondary-color").trim() || "#8997bd"
  const chartBarColor = isDarkTheme ? "#3987e5" : "#2a78d6"

  listDashboardChart.forEach(element => {
    const { labels, values } = JSON.parse(element.getAttribute("data-chart"))

    if(values.length === 0) {
      element.innerHTML = `<p class="text-muted text-center my-4">Chưa có sản phẩm</p>`
      return
    }

    // Không tải được thư viện biểu đồ thì hiện dạng danh sách
    if(typeof ApexCharts === "undefined") {
      element.innerHTML = labels.map((label, index) => `
        <div class="d-flex justify-content-between border-bottom py-1">
          <span>${escapeHtml(label)}</span><span class="fw-semibold">${values[index]}</span>
        </div>
      `).join("")
      return
    }

    const chart = new ApexCharts(element, {
      chart: {
        type: "bar",
        height: labels.length * 36 + 30, // mỗi cột cao khoảng 36px
        toolbar: { show: false },
        fontFamily: "inherit",
        foreColor: chartTextColor,
        background: "transparent"
      },
      series: [{
        name: "Số sản phẩm",
        data: values
      }],
      colors: [chartBarColor],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "60%",
          borderRadius: 4,
          borderRadiusApplication: "end",
          dataLabels: { position: "top" }
        }
      },
      // Số sản phẩm ở cuối mỗi cột
      dataLabels: {
        enabled: true,
        offsetX: 22,
        style: {
          colors: [chartTextColor],
          fontWeight: 500
        }
      },
      // Số đã hiện ở cuối mỗi cột nên ẩn trục số, chừa 20% bên phải để số không đè lên cột dài nhất
      xaxis: {
        categories: labels,
        max: Math.max(...values) * 1.2,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { maxWidth: 160 }
      },
      grid: {
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: false } },
        padding: { top: -10, bottom: -10 }
      },
      tooltip: {
        theme: isDarkTheme ? "dark" : "light",
        y: {
          formatter: (value) => `${value} sản phẩm`
        }
      },
      legend: { show: false }
    })

    chart.render()
  })
}
// End Biểu đồ trang tổng quan
