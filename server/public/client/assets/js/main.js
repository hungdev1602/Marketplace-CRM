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

// Menu điện thoại (bấm nút ☰): nhiều tầng, bấm mục có dấu › để mở tầng danh mục con
const mobileNav = document.querySelector("[mnav]")
if(mobileNav) {
  const panelStack = ["main"] // các tầng đã mở, tầng cuối là tầng đang xem
  const getPanel = (id) => mobileNav.querySelector(`[mnav-panel="${id}"]`)

  const showPanel = (panel) => {
    panel.classList.remove("is-behind")
    panel.classList.add("is-active")
    panel.removeAttribute("aria-hidden")
    panel.scrollTop = 0
  }

  const hidePanel = (panel, isBehind) => {
    panel.classList.remove("is-active")
    panel.classList.toggle("is-behind", isBehind)
    panel.setAttribute("aria-hidden", "true")
  }

  // Mở tầng danh mục con
  mobileNav.querySelectorAll("[mnav-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = getPanel(button.getAttribute("mnav-open"))
      if(!panel) return

      hidePanel(getPanel(panelStack[panelStack.length - 1]), true)
      showPanel(panel)
      panelStack.push(button.getAttribute("mnav-open"))
      panel.querySelector("[mnav-back]").focus({ preventScroll: true })
    })
  })

  // Quay lại tầng trước
  mobileNav.querySelectorAll("[mnav-back]").forEach((button) => {
    button.addEventListener("click", () => {
      if(panelStack.length <= 1) return

      hidePanel(getPanel(panelStack.pop()), false)
      showPanel(getPanel(panelStack[panelStack.length - 1]))
    })
  })

  // Đóng menu thì lần mở sau bắt đầu lại từ tầng đầu tiên
  mobileNav.addEventListener("hidden.bs.offcanvas", () => {
    while(panelStack.length > 1) {
      hidePanel(getPanel(panelStack.pop()), false)
    }
    showPanel(getPanel("main"))
  })

  // Nút kính lúp: mở / đóng ô tìm kiếm
  const searchToggle = mobileNav.querySelector("[mnav-search-toggle]")
  const searchForm = mobileNav.querySelector(".sf-mnav-search")
  searchToggle.addEventListener("click", () => {
    const isOpen = searchForm.classList.toggle("is-open")
    searchToggle.setAttribute("aria-expanded", isOpen)
    if(isOpen) {
      searchForm.querySelector("input").focus()
    }
  })
}
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

// Ảnh / video sản phẩm ở trang chi tiết: bấm vào danh sách nhỏ để xem ở khung lớn
const galleryMainImage = document.querySelector("[gallery-main-image]")
const galleryMainVideo = document.querySelector("[gallery-main-video]")
if(galleryMainImage && galleryMainVideo) {
  const thumbList = document.querySelectorAll("[gallery-thumb]")
  thumbList.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const src = thumb.getAttribute("gallery-thumb")

      if(thumb.getAttribute("gallery-type") === "video") {
        galleryMainImage.hidden = true
        galleryMainVideo.hidden = false
        if(galleryMainVideo.getAttribute("src") !== src) {
          galleryMainVideo.src = src
        }
        galleryMainVideo.play().catch(() => {
          // trình duyệt chặn tự phát thì khách bấm nút ▶ trên video
        })
      }
      else {
        galleryMainVideo.pause()
        galleryMainVideo.hidden = true
        galleryMainImage.hidden = false
        galleryMainImage.src = src
      }

      thumbList.forEach(item => item.classList.remove("active"))
      thumb.classList.add("active")
    })
  })
}
// Hết Ảnh / video sản phẩm

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
