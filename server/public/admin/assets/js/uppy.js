const uppyUpload = document.querySelector("#uppy-upload")
if(uppyUpload){
  // Chỉ tải thư viện Uppy ở trang có khung upload
  // Thư viện để sẵn trong server (assets/libs/uppy/v4.18.2), không tải từ CDN bên ngoài:
  // CDN tải chậm hoặc bị chặn thì khung upload không hiện ra
  let Uppy, Dashboard, XHRUpload
  try {
    ({ Uppy, Dashboard, XHRUpload } = await import("/admin/assets/libs/uppy/v4.18.2/uppy.min.mjs"))
  } catch (error) {
    console.error("Không tải được thư viện Uppy", error)
    uppyUpload.innerHTML = `<div class="text-danger">Không tải được khung upload, vui lòng tải lại trang (F5).</div>`
  }

  if(Uppy){
    uppyUpload.innerHTML = "" // xoá dòng "Đang tải khung upload..."

    const uppy = new Uppy()
    uppy.use(Dashboard, {
      target: '#uppy-upload',
      inline: true,
      width: "100%"
    })

    const urlParams = new URLSearchParams(window.location.search)
    const folderPath = urlParams.get("folderPath") || ""

    uppy.use(XHRUpload, { // mặc định method="POST"
      endpoint: `/${pathAdmin}/file-manager/upload?folderPath=${folderPath}`, //link Backend nhận file
      fieldName: "files", // trường files bên Backend nhận
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
}
