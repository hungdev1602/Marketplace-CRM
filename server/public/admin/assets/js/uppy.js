import { Uppy, Dashboard, XHRUpload  } from "https://releases.transloadit.com/uppy/v4.18.2/uppy.min.mjs"

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

uppy.on('complete', (result) => {
  if(result.failed.length > 0){
    notyf.error(`Upload ${result.successful.length} file thất bại`)
  }
  if(result.successful.length > 0){
    drawNotify("success", `Upload ${result.successful.length} file thành công`)
  }
});