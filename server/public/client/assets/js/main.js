// JS của trang khách hàng (không dùng jQuery)

// Menu dính trên đầu trang khi cuộn xuống (CSS position: sticky, xem sfoodie.css)
// Đầu trang (logo lớn, ô tìm kiếm) cuộn khuất thì thêm class is-stuck: hiện logo nhỏ, đổ bóng dưới menu
const mainMenu = document.querySelector(".main_menu")
const siteHeader = document.querySelector(".sf-header")
if(mainMenu && siteHeader && "IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    mainMenu.classList.toggle("is-stuck", !entry.isIntersecting)
  })
  headerObserver.observe(siteHeader)
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

// Giao diện sáng / tối
// Giao diện được chọn sẵn trong <head> (layouts/default.pug) để trang không bị nháy màu khi mở
const themeColorMeta = document.querySelector("meta[name='theme-color']")
const updateThemeColor = () => {
  // Màu thanh trình duyệt trên điện thoại theo màu nền trang
  if(themeColorMeta) {
    themeColorMeta.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--sf-bg").trim() || "#FFFFFF")
  }
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
  document.querySelectorAll("[theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", isDark)
  })
}

const setTheme = (theme) => {
  const html = document.documentElement

  // Màu chuyển từ từ cho mượt (bỏ qua nếu khách tắt hiệu ứng chuyển động trong cài đặt máy)
  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    html.classList.add("sf-theme-changing")
    setTimeout(() => html.classList.remove("sf-theme-changing"), 400)
  }

  html.setAttribute("data-theme", theme)
  updateThemeColor()
}

updateThemeColor()

document.querySelectorAll("[theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
    setTheme(newTheme)

    // Nhớ lựa chọn của khách cho các lần mở trang sau
    try {
      localStorage.setItem("sf-theme", newTheme)
    } catch (error) {
      // trình duyệt chặn lưu (chế độ ẩn danh,...) thì chỉ đổi ở trang đang xem
    }
  })
})

// Khách chưa tự chọn giao diện và mặc định là "system": máy khách đổi sáng / tối thì trang đổi theo
const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)")
systemDarkQuery.addEventListener("change", (event) => {
  let savedTheme = null
  try {
    savedTheme = localStorage.getItem("sf-theme")
  } catch (error) {}

  if(!savedTheme && document.body.getAttribute("data-default-theme") === "system") {
    setTheme(event.matches ? "dark" : "light")
  }
})
// Hết Giao diện sáng / tối
