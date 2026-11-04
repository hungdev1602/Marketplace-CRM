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

// Menu tài khoản ở menu máy tính (đã đăng nhập): bấm tên khách để mở / đóng, trong menu có "Личный кабинет", "Выйти"
// Bấm ra ngoài hoặc nhấn Esc thì đóng lại
const accountMenu = document.querySelector("[account-menu]")
if(accountMenu) {
  const accountToggle = accountMenu.querySelector("[account-menu-toggle]")
  const accountPanel = accountMenu.querySelector("[account-menu-panel]")

  const setAccountMenuOpen = (isOpen) => {
    accountPanel.hidden = !isOpen
    accountToggle.setAttribute("aria-expanded", isOpen)
  }

  accountToggle.addEventListener("click", () => {
    setAccountMenuOpen(accountPanel.hidden)
  })

  document.addEventListener("click", (event) => {
    if(!accountMenu.contains(event.target)) setAccountMenuOpen(false)
  })

  document.addEventListener("keydown", (event) => {
    if(event.key === "Escape" && !accountPanel.hidden) {
      setAccountMenuOpen(false)
      accountToggle.focus()
    }
  })
}
// Hết Menu tài khoản

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

// ===== Giỏ hàng, yêu thích =====
// Server trả về JSON dạng { code: "success" | "error", message, ... } (controller/client/cart.controller.ts, wishlist.controller.ts)
// Câu báo lỗi khi mất mạng / server lỗi (theo ngôn ngữ đang chọn, có sẵn trong thẻ body)
const errorText = document.body.getAttribute("data-error-text") || "Error"

// Thông báo nhỏ ở cuối màn hình, tự ẩn sau vài giây
// - type: "success", "warning", "error"
// - link: { url, text } hiện thêm link, ví dụ "Перейти в корзину"
const toastArea = document.querySelector("[toast-area]")
const showToast = (message, type = "success", link = null) => {
  if(!toastArea || !message) return

  const toast = document.createElement("div")
  toast.className = `sf-toast sf-toast-${type}`
  toast.setAttribute("role", type === "error" ? "alert" : "status")

  const icon = document.createElement("i")
  icon.className = type === "success" ? "fas fa-check-circle" : "fas fa-exclamation-circle"
  const text = document.createElement("span")
  text.textContent = message // textContent: không chèn HTML lạ vào trang
  toast.append(icon, text)

  if(link && link.url) {
    const linkElement = document.createElement("a")
    linkElement.href = link.url
    linkElement.textContent = link.text
    toast.append(linkElement)
  }

  toastArea.append(toast)
  // Chỉ giữ 3 thông báo mới nhất
  while(toastArea.children.length > 3) {
    toastArea.firstElementChild.remove()
  }

  requestAnimationFrame(() => toast.classList.add("is-show"))
  setTimeout(() => {
    toast.classList.remove("is-show")
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// Gửi dữ liệu JSON lên server, mất mạng / server lỗi thì trả về lỗi chung
const sendJson = async (url, method, data) => {
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: data ? JSON.stringify(data) : undefined
    })
    return await response.json()
  } catch (error) {
    return { code: "error", message: errorText }
  }
}

// Số trên biểu tượng giỏ hàng [cart-count] / yêu thích [wishlist-count] (đầu trang, menu, menu điện thoại)
const updateCount = (selector, count) => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = count > 99 ? "99+" : count
    element.hidden = !(count > 0)
  })
}

// --- Nút "В корзину" và ô chọn số lượng (mixins/cart-control.pug) ---
// Hiện số lượng của 1 sản phẩm ở tất cả ô chọn số lượng của sản phẩm đó trên trang
// (1 sản phẩm có thể hiện ở nhiều mục, ví dụ "Nổi bật" và "Đang giảm giá" ở trang chủ)
const setProductQuantity = (productId, quantity, maxQuantity) => {
  document.querySelectorAll(`[cart-control="${productId}"]`).forEach((control) => {
    if(maxQuantity !== undefined) {
      control.setAttribute("data-max", maxQuantity)
    }
    const min = Number(control.getAttribute("data-min")) || 0
    const max = Number(control.getAttribute("data-max")) || 0
    const input = control.querySelector("[cart-qty]")

    input.value = quantity
    input.max = max
    control.querySelector("[cart-minus]").disabled = quantity <= min
    control.querySelector("[cart-plus]").disabled = quantity >= max
    control.classList.toggle("in-cart", quantity > 0)
  })
}

// Số lượng khách chọn trong khoảng nhỏ nhất - lớn nhất của ô chọn
const clampQuantity = (control, quantity) => {
  const min = Number(control.getAttribute("data-min")) || 0
  const max = Number(control.getAttribute("data-max")) || 0
  if(!Number.isFinite(quantity)) return min
  return Math.min(max, Math.max(min, Math.floor(quantity)))
}

// Gửi số lượng mới lên server
// Đợi khách ngừng bấm 0,4 giây mới gửi (bấm + nhiều lần liên tiếp chỉ gửi 1 lần)
const cartTimers = {}
const cartRequestIds = {}
const sendCartQuantity = (productId, quantity) => {
  clearTimeout(cartTimers[productId])
  cartTimers[productId] = setTimeout(async () => {
    // Bỏ qua kết quả của yêu cầu cũ nếu đã có yêu cầu mới hơn
    const requestId = (cartRequestIds[productId] || 0) + 1
    cartRequestIds[productId] = requestId

    const data = await sendJson("/cart/update", "PATCH", {
      productId: productId,
      quantity: quantity
    })
    if(requestId !== cartRequestIds[productId]) return

    if(data.code === "success") {
      setProductQuantity(productId, data.quantity, data.maxQuantity)
      updateCount("[cart-count]", data.cartQuantity)
      showToast(data.message, data.quantity > 0 ? "warning" : "success")
    }
    else {
      showToast(data.message, "error")
    }
    document.dispatchEvent(new CustomEvent("cart:changed"))
  }, 400)
}

document.addEventListener("click", async (event) => {
  // Bấm "В корзину": thêm 1 cái vào giỏ
  const addButton = event.target.closest("[cart-add]")
  if(addButton) {
    const control = addButton.closest("[cart-control]")
    if(!control || addButton.classList.contains("is-loading")) return

    const productId = control.getAttribute("cart-control")
    addButton.classList.add("is-loading")
    const data = await sendJson("/cart/add", "POST", {
      productId: productId,
      quantity: 1
    })
    addButton.classList.remove("is-loading")

    if(data.code === "success") {
      const hadFocus = document.activeElement === addButton
      setProductQuantity(productId, data.quantity, data.maxQuantity)
      updateCount("[cart-count]", data.cartQuantity)
      showToast(data.message, "success", data.link)
      // Nút "В корзину" vừa bị ẩn: đưa con trỏ bàn phím sang nút +
      if(hadFocus) {
        control.querySelector("[cart-plus]").focus({ preventScroll: true })
      }
      document.dispatchEvent(new CustomEvent("cart:changed"))
    }
    else {
      showToast(data.message, "error")
    }
    return
  }

  // Bấm + / −
  const stepButton = event.target.closest("[cart-plus], [cart-minus]")
  if(stepButton) {
    const control = stepButton.closest("[cart-control]")
    const productId = control.getAttribute("cart-control")
    const input = control.querySelector("[cart-qty]")
    const step = stepButton.hasAttribute("cart-plus") ? 1 : -1
    const quantity = clampQuantity(control, (Number(input.value) || 0) + step)

    setProductQuantity(productId, quantity)
    // Giảm về 0 thì hiện lại nút "В корзину", đưa con trỏ bàn phím sang nút đó
    if(quantity === 0) {
      control.querySelector("[cart-add]").focus({ preventScroll: true })
    }
    sendCartQuantity(productId, quantity)
  }
})

// Gõ số lượng vào ô (gửi khi gõ xong: bấm Enter hoặc bấm ra ngoài)
document.addEventListener("change", (event) => {
  const input = event.target.closest("[cart-qty]")
  if(!input) return

  const control = input.closest("[cart-control]")
  const productId = control.getAttribute("cart-control")
  const quantity = clampQuantity(control, Number(input.value))

  setProductQuantity(productId, quantity)
  sendCartQuantity(productId, quantity)
})

// Bấm Enter trong ô số lượng: coi như gõ xong (ô không nằm trong form nên trình duyệt không tự gửi)
document.addEventListener("keydown", (event) => {
  if(event.key === "Enter" && event.target.closest("[cart-qty]")) {
    event.preventDefault()
    event.target.blur()
  }
})

// --- Nút ♡ yêu thích (mixins/cart-control.pug) ---
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[wishlist-toggle]")
  if(!button) return

  event.preventDefault()
  if(button.classList.contains("is-loading")) return

  const productId = button.getAttribute("wishlist-toggle")
  button.classList.add("is-loading")
  const data = await sendJson("/wishlist/toggle", "POST", {
    productId: productId
  })
  button.classList.remove("is-loading")

  if(data.code !== "success") {
    showToast(data.message, "error")
    return
  }

  document.querySelectorAll(`[wishlist-toggle="${productId}"]`).forEach((item) => {
    item.classList.toggle("is-active", data.added)
    item.setAttribute("aria-pressed", data.added)
  })
  updateCount("[wishlist-count]", data.wishlistCount)
  showToast(data.message, "success", data.link)

  // Trang yêu thích: bỏ ♡ thì sản phẩm biến mất khỏi trang
  const wishlistPage = document.querySelector("[wishlist-page]")
  if(wishlistPage && !data.added) {
    wishlistPage.querySelectorAll(`[wishlist-toggle="${productId}"]`).forEach((item) => {
      const card = item.closest(".sf-product-card, [wishlist-item]")
      if(card) card.remove()
    })

    // Mục không còn sản phẩm nào thì ẩn cả tiêu đề của mục
    wishlistPage.querySelectorAll(".sf-product-grid, .sf-wish-unavailable").forEach((list) => {
      if(list.children.length === 0) {
        const title = list.previousElementSibling
        if(title && title.classList.contains("sf-cart-subtitle")) title.remove()
        list.remove()
      }
    })

    const countElement = wishlistPage.querySelector("[wishlist-page-count]")
    if(countElement) countElement.textContent = data.wishlistCountText

    // Hết sản phẩm thì tải lại trang để hiện "В избранном пока пусто"
    if(data.wishlistCount === 0) location.reload()
  }
})

// --- Trang yêu thích: thêm tất cả vào giỏ, xoá hết ---
const wishlistAddAll = document.querySelector("[wishlist-add-all]")
if(wishlistAddAll) {
  wishlistAddAll.addEventListener("click", async () => {
    wishlistAddAll.disabled = true
    const data = await sendJson("/wishlist/add-to-cart", "POST")

    if(data.code === "success") {
      data.items.forEach((item) => setProductQuantity(item.productId, item.quantity, item.maxQuantity))
      updateCount("[cart-count]", data.cartQuantity)
      showToast(data.message, "success", data.link)
      wishlistAddAll.hidden = true
    }
    else {
      showToast(data.message, "error")
      wishlistAddAll.disabled = false
    }
  })
}

const wishlistClear = document.querySelector("[wishlist-clear]")
if(wishlistClear) {
  wishlistClear.addEventListener("click", async () => {
    if(!confirm(wishlistClear.getAttribute("data-confirm"))) return

    const data = await sendJson("/wishlist/clear", "DELETE")
    if(data.code === "success") {
      location.reload()
    }
    else {
      showToast(data.message, "error")
    }
  })
}

// --- Trang giỏ hàng ---
// Sau mỗi thay đổi, tải lại phần nội dung giỏ hàng (/cart?partial=1) để cập nhật tiền, mã giảm giá
const cartPage = document.querySelector("[cart-page]")
if(cartPage) {
  let refreshTimer = null

  const refreshCartPage = () => {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(async () => {
      // Khách đang gõ số lượng thì đợi gõ xong mới tải lại (tránh mất số đang gõ)
      const activeElement = document.activeElement
      if(activeElement && activeElement.matches("[cart-qty]") && cartPage.contains(activeElement)) {
        activeElement.addEventListener("blur", refreshCartPage, { once: true })
        return
      }

      // Nhớ nút đang được chọn bằng bàn phím (+, −) để chọn lại sau khi tải lại
      let focusSelector = ""
      const focusControl = activeElement && activeElement.closest("[cart-control]")
      if(focusControl && cartPage.contains(focusControl)) {
        const attribute = ["cart-plus", "cart-minus"].find(name => activeElement.hasAttribute(name))
        if(attribute) {
          focusSelector = `[cart-control="${focusControl.getAttribute("cart-control")}"] [${attribute}]`
        }
      }

      try {
        const response = await fetch("/cart?partial=1", {
          headers: { "Accept": "text/html" }
        })
        if(!response.ok) throw new Error(response.statusText)

        cartPage.innerHTML = await response.text()

        const content = cartPage.querySelector("[cart-content]")
        if(content) {
          updateCount("[cart-count]", Number(content.getAttribute("data-cart-quantity")))
        }
        if(focusSelector) {
          const focusElement = cartPage.querySelector(focusSelector)
          if(focusElement && !focusElement.disabled) focusElement.focus({ preventScroll: true })
        }
      } catch (error) {
        location.reload()
      }
    }, 150)
  }

  document.addEventListener("cart:changed", refreshCartPage)

  cartPage.addEventListener("click", async (event) => {
    // Xoá 1 sản phẩm
    const removeButton = event.target.closest("[cart-remove]")
    if(removeButton) {
      const item = removeButton.closest(".sf-cart-item")
      if(item) item.classList.add("is-removing")

      const data = await sendJson("/cart/update", "PATCH", {
        productId: removeButton.getAttribute("cart-remove"),
        quantity: 0
      })
      if(data.code === "success") {
        updateCount("[cart-count]", data.cartQuantity)
        showToast(data.message)
      }
      else {
        showToast(data.message, "error")
      }
      refreshCartPage()
      return
    }

    // Xoá hết giỏ hàng
    const clearButton = event.target.closest("[cart-clear]")
    if(clearButton) {
      if(!confirm(clearButton.getAttribute("data-confirm"))) return

      const data = await sendJson("/cart/clear", "DELETE")
      if(data.code === "success") {
        updateCount("[cart-count]", 0)
        showToast(data.message)
      }
      else {
        showToast(data.message, "error")
      }
      refreshCartPage()
      return
    }

    // Bỏ mã giảm giá
    const couponRemoveButton = event.target.closest("[cart-coupon-remove]")
    if(couponRemoveButton) {
      const data = await sendJson("/cart/coupon", "DELETE")
      showToast(data.message, data.code === "success" ? "success" : "error")
      refreshCartPage()
    }
  })

  // Nhập mã giảm giá
  cartPage.addEventListener("submit", async (event) => {
    const form = event.target.closest("[cart-coupon-form]")
    if(!form) return

    event.preventDefault()
    const input = form.querySelector("[name='code']")
    const submitButton = form.querySelector("[type='submit']")
    const message = cartPage.querySelector("[cart-coupon-message]")

    submitButton.disabled = true
    const data = await sendJson("/cart/coupon", "POST", {
      code: input.value
    })
    submitButton.disabled = false

    if(data.code === "success") {
      showToast(data.message)
      refreshCartPage()
    }
    else {
      message.textContent = data.message
      message.hidden = false
      input.focus()
    }
  })

  // Gõ lại mã thì ẩn lời báo lỗi cũ
  cartPage.addEventListener("input", (event) => {
    if(event.target.closest("[cart-coupon-form]")) {
      const message = cartPage.querySelector("[cart-coupon-message]")
      if(message) message.hidden = true
    }
  })
}

// Khách bấm "Quay lại" trên trình duyệt, trang được lấy từ bộ nhớ đệm (số lượng giỏ hàng có thể đã cũ): tải lại trang
window.addEventListener("pageshow", (event) => {
  if(event.persisted) location.reload()
})
// Hết Giỏ hàng, yêu thích

// ===== Tài khoản khách: đăng nhập, đăng ký, sửa thông tin, đổi mật khẩu =====
// Form có thuộc tính account-form: gửi bằng fetch (JSON) tới action của form
// - data-method: PATCH,... (mặc định POST)
// - data-reset: gửi thành công thì xoá trắng form (form đổi mật khẩu)
// Server trả về { code, message, field, redirect }: field là ô bị lỗi (tô đỏ, đưa con trỏ vào ô đó),
// redirect là trang chuyển tới sau khi thành công (ví dụ quay lại giỏ hàng sau khi đăng nhập)
document.querySelectorAll("[account-form]").forEach((form) => {
  const message = form.querySelector("[form-message]")
  const submitButton = form.querySelector("[type='submit']")

  const showMessage = (text, type) => {
    if(!message) return
    message.textContent = text
    message.className = `sf-form-message is-${type}`
    message.hidden = !text
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()

    // Bỏ tô đỏ của lần gửi trước
    form.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"))
    showMessage("", "error")

    // Ô tick không được tick thì FormData không có ô đó (server hiểu là chưa đồng ý)
    const data = Object.fromEntries(new FormData(form))

    submitButton.disabled = true
    const result = await sendJson(form.getAttribute("action"), form.getAttribute("data-method") || "POST", data)

    if(result.code === "success") {
      if(result.redirect) {
        // Giữ nút bị khoá trong lúc chuyển trang để khách không bấm 2 lần
        location.href = result.redirect
        return
      }
      showMessage(result.message, "success")
      if(form.hasAttribute("data-reset")) form.reset()
    }
    else {
      showMessage(result.message, "error")
      const input = result.field && form.querySelector(`[name="${result.field}"]`)
      if(input) {
        input.setAttribute("aria-invalid", "true")
        input.focus()
      }
      // Phiên đăng nhập đã hết (trang tài khoản): chuyển về trang đăng nhập
      if(result.redirect) {
        location.href = result.redirect
        return
      }
    }
    submitButton.disabled = false
  })

  // Khách sửa ô bị lỗi thì bỏ tô đỏ
  form.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid")
  })
})

// Nút 👁 hiện / ẩn mật khẩu
document.querySelectorAll("[password-toggle]").forEach((button) => {
  const input = button.parentElement.querySelector("input")
  const icon = button.querySelector("i")

  button.addEventListener("click", () => {
    const isShown = input.type === "text"
    input.type = isShown ? "password" : "text"
    button.setAttribute("aria-pressed", !isShown)
    icon.className = isShown ? "far fa-eye" : "far fa-eye-slash"
  })
})
// Hết Tài khoản khách
