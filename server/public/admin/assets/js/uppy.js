import { Uppy, Dashboard, XHRUpload  } from "https://releases.transloadit.com/uppy/v4.18.2/uppy.min.mjs"

const uppyUpload = document.querySelector("#uppy-upload")
if(uppyUpload){
  const uppy = new Uppy()
  uppy.use(Dashboard, { 
    target: '#uppy-upload', 
    inline: true,
    width: "100%"
  })

  uppy.use(XHRUpload, { // mặc định method="POST"
    endpoint: `/${pathAdmin}/file-manager/upload`, //link Backend nhận file
    fieldName: "files", // trường file bên Backend nhận
    bundle: true // cho gửi nhiều file
  })

  uppy.on('upload-success', (file, response) => {
    const res = response.body
    if(res.code === "success"){
      drawNotify("success", `Upload file thành công`)
    }
    else{
      notyf.error(`Upload file thất bại`)
    }
  });
}