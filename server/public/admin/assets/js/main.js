// TinyMCE
const initialTinyMCE = () => {
  tinymce.init({
    selector: '[textarea-mce]',
    plugins: [
      'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
      'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 'powerpaste', 'advtable', 'advcode', 'advtemplate', 'uploadcare', 'mentions', 'tableofcontents', 'footnotes', 'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown','importword', 'exportword', 'exportpdf'
    ],
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | addcomment showcomments | spellcheckdialog a11ycheck typography uploadcare | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat',
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
// End Validate article Create Category Form

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