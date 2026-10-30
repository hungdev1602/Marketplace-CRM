// JS của trang khách hàng (không dùng jQuery)

// Menu dính trên đầu trang khi cuộn xuống
const mainMenu = document.querySelector(".main_menu")
if(mainMenu) {
  const toggleMenuFix = () => {
    mainMenu.classList.toggle("menu_fix", window.scrollY > 1)
  }
  toggleMenuFix()
  window.addEventListener("scroll", toggleMenuFix, { passive: true })
}
// Hết Menu dính trên đầu trang khi cuộn xuống

// Nút "Danh mục sản phẩm" ở menu: bấm để mở / đóng danh sách danh mục
const menuCategoryBar = document.querySelector(".menu_category_bar")
if(menuCategoryBar) {
  const menuCategoryArea = menuCategoryBar.closest(".menu_category_area")
  menuCategoryBar.addEventListener("click", () => {
    menuCategoryArea.classList.toggle("show_category")
    menuCategoryBar.classList.toggle("ratate_arrow")
  })

  // Bấm ra ngoài thì đóng lại
  document.addEventListener("click", (event) => {
    if(!menuCategoryArea.contains(event.target)) {
      menuCategoryArea.classList.remove("show_category")
      menuCategoryBar.classList.remove("ratate_arrow")
    }
  })
}
// Hết Nút "Danh mục sản phẩm" ở menu

// Menu điện thoại: bấm danh mục cha để mở danh mục con
const mobileDropdownList = document.querySelectorAll(".mobile_dropdown")
mobileDropdownList.forEach((dropdown) => {
  const innerMenu = dropdown.querySelector(".inner_menu")
  const toggleLink = dropdown.querySelector(":scope > a")

  toggleLink.addEventListener("click", (event) => {
    event.preventDefault()

    const isOpen = dropdown.classList.contains("active")

    // Đóng các danh mục khác đang mở
    mobileDropdownList.forEach((item) => {
      item.classList.remove("active")
      item.querySelector(".inner_menu").style.maxHeight = null
    })

    if(!isOpen) {
      dropdown.classList.add("active")
      innerMenu.style.maxHeight = innerMenu.scrollHeight + "px"
    }
  })
})
// Hết Menu điện thoại

// Bộ lọc sản phẩm
const filterForm = document.querySelector("[filter-form]")
if(filterForm) {
  // Điện thoại: bấm nút "Bộ lọc" để mở / đóng
  const filterToggle = document.querySelector(".sf-filter-toggle")
  if(filterToggle) {
    filterToggle.addEventListener("click", () => {
      const isOpen = filterForm.classList.toggle("show")
      filterToggle.setAttribute("aria-expanded", isOpen)
    })
  }

  // Bỏ các ô trống trước khi gửi, để link gọn (không có ?priceMin=&priceMax=)
  filterForm.addEventListener("formdata", (event) => {
    for (const [name, value] of [...event.formData.entries()]) {
      if(value === "") {
        event.formData.delete(name)
      }
    }
  })
}

// Ô sắp xếp: đổi là tải lại trang ngay
const autoSubmitList = document.querySelectorAll("[auto-submit]")
autoSubmitList.forEach((input) => {
  input.addEventListener("change", () => {
    input.form.requestSubmit()
  })
})
// Hết Bộ lọc sản phẩm

// Ảnh sản phẩm ở trang chi tiết: bấm ảnh nhỏ để xem ảnh lớn
const galleryMain = document.querySelector("[gallery-main]")
if(galleryMain) {
  const thumbList = document.querySelectorAll("[gallery-thumb]")
  thumbList.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      galleryMain.src = thumb.getAttribute("gallery-thumb")
      thumbList.forEach(item => item.classList.remove("active"))
      thumb.classList.add("active")
    })
  })
}
// Hết Ảnh sản phẩm

// Nút cuộn lên đầu trang (vòng tròn hiện tiến độ cuộn trang)
const progressWrap = document.querySelector(".progress-wrap")
if(progressWrap) {
  const progressPath = progressWrap.querySelector("path")
  const pathLength = progressPath.getTotalLength()
  progressPath.style.strokeDasharray = `${pathLength} ${pathLength}`

  const updateProgress = () => {
    const height = document.documentElement.scrollHeight - window.innerHeight
    const progress = height > 0 ? window.scrollY / height : 0
    progressPath.style.strokeDashoffset = pathLength - progress * pathLength
    progressWrap.classList.toggle("active-progress", window.scrollY > 50)
  }
  updateProgress()
  window.addEventListener("scroll", updateProgress, { passive: true })

  progressWrap.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  })
}
// Hết Nút cuộn lên đầu trang
