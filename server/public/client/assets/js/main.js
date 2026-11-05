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

// ===== Tìm kiếm nâng cao (ô tìm kiếm ở đầu trang: views/client/mixins/search-box.pug) =====
// - Gõ từ khoá: khung gợi ý sản phẩm, danh mục, thương hiệu, từ khoá hay tìm (server: /search/suggest)
//   Server tự sửa từ khoá gõ nhầm bàn phím / sai chính tả, ví dụ "kfgif" => "лапша"
// - Bấm vào ô còn trống: lịch sử tìm kiếm (lưu trên trình duyệt) và "Часто ищут" (server: /search/popular)
// - Phím ↑ ↓ để chọn gợi ý, Enter để mở, Esc để đóng; máy tính: nhấn phím "/" để bắt đầu tìm
// - Nút micro: tìm bằng giọng nói (trình duyệt có Web Speech API: Chrome, Edge, Safari; Firefox chưa có)
// - Nút mã vạch: quét mã vạch bằng camera (điện thoại có BarcodeDetector: Chrome trên Android)
// Các nút chỉ hiện khi trình duyệt của khách hỗ trợ
const searchBox = document.querySelector("[search-box]")
if(searchBox) {
  const searchForm = searchBox.querySelector("[search-form]")
  const searchInput = searchBox.querySelector("[search-input]")
  const searchCategory = searchBox.querySelector("[search-category]")
  const dropdown = searchBox.querySelector("[search-dropdown]")

  // Từ ngữ theo ngôn ngữ đang chọn (có sẵn trong trang)
  let searchText = {}
  try {
    searchText = JSON.parse(searchBox.querySelector("[search-text]").textContent)
  } catch (error) {}

  const cleanText = (text) => `${text || ""}`.replace(/\s+/g, " ").trim()
  const getKeyword = () => cleanText(searchInput.value)
  const isSearchFocused = () => searchBox.contains(document.activeElement)
  const searchUrl = (keyword) => `/products?keyword=${encodeURIComponent(keyword)}`

  // Tạo thẻ HTML, chữ gán bằng textContent (không chèn HTML lạ vào trang)
  const createElement = (tag, className, text) => {
    const element = document.createElement(tag)
    if(className) element.className = className
    if(text !== undefined && text !== null) element.textContent = text
    return element
  }
  const createIcon = (className) => {
    const icon = createElement("i", className)
    icon.setAttribute("aria-hidden", "true")
    return icon
  }

  // --- Lịch sử tìm kiếm (localStorage, tối đa 8 từ khoá, mới nhất lên đầu) ---
  const historyKey = "sf-search-history"
  const historyMax = 8

  const getHistory = () => {
    try {
      const list = JSON.parse(localStorage.getItem(historyKey) || "[]")
      return Array.isArray(list) ? list.filter(item => typeof item === "string" && cleanText(item)).slice(0, historyMax) : []
    } catch (error) {
      return []
    }
  }

  const saveHistory = (list) => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(list.slice(0, historyMax)))
    } catch (error) {
      // trình duyệt chặn lưu (chế độ ẩn danh,...) thì bỏ qua
    }
  }

  const addHistory = (keyword) => {
    keyword = cleanText(keyword).slice(0, 100)
    if(!keyword) return
    saveHistory([keyword, ...getHistory().filter(item => item.toLowerCase() !== keyword.toLowerCase())])
  }

  // Trang kết quả tìm kiếm: lưu từ khoá vừa tìm (kể cả tìm bằng giọng nói, mã vạch, bấm gợi ý)
  const historyAddElement = document.querySelector("[search-history-add]")
  if(historyAddElement) {
    addHistory(historyAddElement.getAttribute("search-history-add"))
  }

  // --- "Часто ищут": chỉ tải 1 lần khi khách bấm vào ô tìm kiếm lần đầu ---
  let popularPromise = null
  const getPopular = () => {
    if(!popularPromise) {
      popularPromise = fetch("/search/popular", { headers: { "Accept": "application/json" } })
        .then(response => response.json())
        .then(data => Array.isArray(data.queries) ? data.queries : [])
        .catch(() => {
          popularPromise = null // lỗi mạng thì lần sau tải lại
          return []
        })
    }
    return popularPromise
  }

  // --- Tô đậm chữ khớp từ khoá (không phân biệt hoa thường, có dấu / không dấu) ---
  // Đổi từng chữ về dạng không dấu, nhớ vị trí chữ gốc để tô đúng chỗ trong tên gốc
  const foldText = (text) => {
    let folded = ""
    const indexList = []
    for (let i = 0; i < text.length; i++) {
      const char = text[i].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      for (const item of char) {
        folded += item
        indexList.push(i)
      }
    }
    return { folded, indexList }
  }

  const highlightText = (text, keyword) => {
    text = `${text || ""}`
    const fragment = document.createDocumentFragment()
    const { folded, indexList } = foldText(text)
    const wordList = foldText(cleanText(keyword)).folded.split(" ").filter(Boolean)

    const markList = new Array(text.length).fill(false)
    for (const word of wordList) {
      let position = folded.indexOf(word)
      while(position !== -1) {
        for (let i = position; i < position + word.length; i++) {
          markList[indexList[i]] = true
        }
        position = folded.indexOf(word, position + word.length)
      }
    }

    let start = 0
    while(start < text.length) {
      const isMark = markList[start]
      let end = start
      while(end < text.length && markList[end] === isMark) end++
      const part = text.slice(start, end)
      fragment.append(isMark ? createElement("mark", "", part) : document.createTextNode(part))
      start = end
    }
    return fragment
  }

  // --- Khung gợi ý: mở / đóng, chọn bằng phím ↑ ↓ ---
  let activeIndex = -1
  let optionCount = 0

  const getOptionList = () => [...dropdown.querySelectorAll("[search-option]")]

  const setActive = (index) => {
    const optionList = getOptionList()
    activeIndex = index
    optionList.forEach((option, optionIndex) => {
      option.classList.toggle("is-active", optionIndex === index)
      option.setAttribute("aria-selected", optionIndex === index)
    })

    const activeOption = optionList[index]
    if(activeOption) {
      searchInput.setAttribute("aria-activedescendant", activeOption.id)
      activeOption.scrollIntoView({ block: "nearest" })
    }
    else {
      searchInput.removeAttribute("aria-activedescendant")
    }
  }

  const searchHeader = searchBox.closest(".sf-header")
  const setOpen = (isOpen) => {
    dropdown.hidden = !isOpen
    searchInput.setAttribute("aria-expanded", isOpen)
    searchBox.classList.toggle("is-open", isOpen)
    // Đầu trang nằm dưới menu dính: đưa đầu trang lên trên để khung gợi ý không bị menu che
    if(searchHeader) searchHeader.classList.toggle("is-search-open", isOpen)
    if(!isOpen) setActive(-1)
  }

  // Xoá nội dung cũ của khung gợi ý
  const clearDropdown = () => {
    dropdown.replaceChildren()
    activeIndex = -1
    searchInput.removeAttribute("aria-activedescendant")
  }

  // Mục chọn được bằng phím ↑ ↓
  const asOption = (element) => {
    element.id = `sf-search-option-${optionCount++}`
    element.setAttribute("role", "option")
    element.setAttribute("aria-selected", "false")
    element.setAttribute("search-option", "")
    element.tabIndex = -1
    return element
  }

  // 1 nhóm trong khung gợi ý: tiêu đề (+ nút bên phải) và danh sách
  const createSection = (title, actionButton) => {
    const section = createElement("div", "sf-sd-section")
    section.setAttribute("role", "group")
    section.setAttribute("aria-label", title)
    const head = createElement("div", "sf-sd-head")
    head.setAttribute("role", "presentation")
    head.append(createElement("span", "sf-sd-title", title))
    if(actionButton) head.append(actionButton)
    section.append(head)
    return section
  }

  // Từ khoá dạng nút tròn (lịch sử, "Часто ищут", thương hiệu)
  const createChip = (text, url, iconClass, keyword) => {
    const chip = asOption(createElement("a", "sf-sd-chip"))
    chip.href = url
    if(iconClass) chip.append(createIcon(iconClass))
    const label = createElement("span")
    label.append(keyword ? highlightText(text, keyword) : text)
    chip.append(label)
    return chip
  }

  // Ô còn trống: lịch sử tìm kiếm + "Часто ищут"
  const renderEmptyState = async () => {
    const historyList = getHistory()
    const popularList = await getPopular()
    // Trong lúc chờ khách đã gõ thêm / đã bấm ra ngoài
    if(getKeyword().length >= 2 || !isSearchFocused() || searchBox.classList.contains("is-listening")) return

    clearDropdown()

    if(historyList.length > 0) {
      const clearButton = createElement("button", "sf-sd-action", searchText.clearHistory)
      clearButton.type = "button"
      clearButton.setAttribute("search-history-clear", "")

      const section = createSection(searchText.recent, clearButton)
      const list = createElement("ul", "sf-sd-history")
      for (const keyword of historyList) {
        const item = createElement("li")
        const link = asOption(createElement("a", "sf-sd-history-link"))
        link.href = searchUrl(keyword)
        link.append(createIcon("fas fa-history"), createElement("span", "", keyword))

        const removeButton = createElement("button", "sf-sd-remove")
        removeButton.type = "button"
        removeButton.setAttribute("search-history-remove", keyword)
        removeButton.setAttribute("aria-label", `${searchText.removeHistory}: ${keyword}`)
        removeButton.title = searchText.removeHistory
        removeButton.append(createIcon("fas fa-times"))

        item.append(link, removeButton)
        list.append(item)
      }
      section.append(list)
      dropdown.append(section)
    }

    if(popularList.length > 0) {
      const section = createSection(searchText.popular)
      const chipList = createElement("div", "sf-sd-chips")
      popularList.forEach((keyword, index) => {
        chipList.append(createChip(keyword, searchUrl(keyword), index < 3 ? "fas fa-fire" : "fas fa-search"))
      })
      section.append(chipList)
      dropdown.append(section)
    }

    setOpen(dropdown.childElementCount > 0)
  }

  // Có từ khoá: gợi ý từ server
  const renderSuggestions = (data) => {
    clearDropdown()
    const keyword = data.usedKeyword || data.keyword

    // Từ khoá đã được sửa: "Показаны результаты по запросу «лапша»", bấm vào để tìm bằng từ khoá đúng
    if(data.corrected) {
      const note = asOption(createElement("a", "sf-sd-note"))
      note.href = searchUrl(data.usedKeyword)
      const text = createElement("span")
      text.append(document.createTextNode(`${searchText.corrected} `), createElement("b", "", `«${data.usedKeyword}»`))
      note.append(createIcon("fas fa-spell-check"), text)
      dropdown.append(note)
    }

    // Từ khoá hay tìm, bắt đầu bằng chữ đang gõ
    if(data.queries.length > 0) {
      const section = createSection(searchText.queries)
      const list = createElement("div", "sf-sd-list")
      for (const query of data.queries) {
        const link = asOption(createElement("a", "sf-sd-query"))
        link.href = searchUrl(query)
        link.append(createIcon("fas fa-search"), createElement("span"))
        link.lastChild.append(highlightText(query, keyword))
        list.append(link)
      }
      section.append(list)
      dropdown.append(section)
    }

    // Danh mục, thương hiệu
    if(data.categories.length > 0 || data.brands.length > 0) {
      const section = createSection(data.categories.length > 0 ? searchText.categories : searchText.brands)
      const chipList = createElement("div", "sf-sd-chips")
      for (const category of data.categories) {
        const chip = createChip(category.name, category.url, "fas fa-th-large", keyword)
        if(category.image) {
          const image = createElement("img")
          image.src = category.image
          image.alt = ""
          image.loading = "lazy"
          chip.firstChild.replaceWith(image)
        }
        chipList.append(chip)
      }
      for (const brand of data.brands) {
        chipList.append(createChip(brand.name, brand.url, "fas fa-tag", keyword))
      }
      section.append(chipList)
      dropdown.append(section)
    }

    // Sản phẩm
    if(data.products.length > 0) {
      const section = createSection(searchText.products)
      const list = createElement("div", "sf-sd-list")
      for (const product of data.products) {
        const link = asOption(createElement("a", "sf-sd-product" + (product.inStock ? "" : " is-out")))
        link.href = product.url

        const image = createElement("img")
        image.src = product.image
        image.alt = ""
        image.loading = "lazy"

        const info = createElement("span", "sf-sd-product-info")
        const name = createElement("span", "sf-sd-product-name")
        name.append(highlightText(product.name, keyword))
        info.append(name)
        if(product.meta) info.append(createElement("span", "sf-sd-product-meta", product.meta))
        if(!product.inStock) info.append(createElement("span", "sf-sd-product-out", searchText.outOfStock))

        const price = createElement("span", "sf-sd-product-price" + (product.priceOld ? " is-sale" : ""))
        price.append(createElement("b", "", product.price))
        if(product.priceOld) price.append(createElement("del", "", product.priceOld))

        link.append(image, info, price)
        list.append(link)
      }
      section.append(list)
      dropdown.append(section)
    }

    if(data.total > 0) {
      // "Показать все результаты (12)": gửi form (giữ danh mục đang chọn)
      const showAll = asOption(createElement("button", "sf-sd-all"))
      showAll.type = "button"
      showAll.setAttribute("search-show-all", "")
      showAll.append(createElement("span", "", `${searchText.showAll} (${data.total})`), createIcon("fas fa-arrow-right"))
      dropdown.append(showAll)
    }
    else if(dropdown.childElementCount === 0 || (data.corrected && dropdown.childElementCount === 1)) {
      const empty = createElement("p", "sf-sd-empty")
      empty.append(createIcon("fas fa-search"), document.createTextNode(`${searchText.nothingFound} `), createElement("b", "", `«${data.keyword}»`))
      dropdown.append(empty)
    }

    setOpen(true)
  }

  // --- Gọi server lấy gợi ý: đợi khách ngừng gõ 0,2 giây, lưu lại kết quả đã có ---
  const suggestCache = new Map()
  let suggestTimer = null
  let suggestController = null

  const requestSuggestions = () => {
    clearTimeout(suggestTimer)
    const keyword = getKeyword()

    if(keyword.length < 2) {
      if(suggestController) suggestController.abort()
      searchBox.classList.remove("is-loading")
      renderEmptyState()
      return
    }

    const category = searchCategory ? searchCategory.value : ""
    const cacheKey = `${category}|${keyword.toLowerCase()}`
    if(suggestCache.has(cacheKey)) {
      renderSuggestions(suggestCache.get(cacheKey))
      return
    }

    suggestTimer = setTimeout(async () => {
      if(suggestController) suggestController.abort()
      const controller = new AbortController()
      suggestController = controller
      searchBox.classList.add("is-loading")

      try {
        const params = new URLSearchParams({ keyword: keyword })
        if(category) params.set("category", category)
        const response = await fetch(`/search/suggest?${params}`, {
          headers: { "Accept": "application/json" },
          signal: controller.signal
        })
        const data = await response.json()
        if(data.code !== "success") throw new Error(data.message)

        suggestCache.set(cacheKey, data)
        // Chỉ giữ 50 kết quả gần nhất
        if(suggestCache.size > 50) suggestCache.delete(suggestCache.keys().next().value)

        // Khách đã gõ tiếp / đã bấm ra ngoài thì bỏ qua
        if(getKeyword() === keyword && isSearchFocused() && !searchBox.classList.contains("is-listening")) {
          renderSuggestions(data)
        }
      } catch (error) {
        // Lỗi mạng: không hiện gì, khách vẫn bấm Enter để tìm được
      } finally {
        if(suggestController === controller) searchBox.classList.remove("is-loading")
      }
    }, 200)
  }

  searchInput.addEventListener("input", requestSuggestions)
  searchInput.addEventListener("focus", requestSuggestions)
  if(searchCategory) {
    searchCategory.addEventListener("change", () => {
      if(getKeyword().length >= 2) {
        searchInput.focus()
        requestSuggestions()
      }
    })
  }

  // Phím ↑ ↓ Enter Esc trong ô tìm kiếm
  searchInput.addEventListener("keydown", (event) => {
    const optionList = getOptionList()

    if(event.key === "ArrowDown" || event.key === "ArrowUp") {
      if(dropdown.hidden) {
        requestSuggestions()
        return
      }
      if(optionList.length === 0) return
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      let index = activeIndex + step
      if(index >= optionList.length) index = -1 // xuống quá mục cuối thì quay về ô nhập
      if(index < -1) index = optionList.length - 1
      setActive(index)
      return
    }

    if(event.key === "Enter" && !dropdown.hidden && optionList[activeIndex]) {
      event.preventDefault()
      optionList[activeIndex].click()
      return
    }

    if(event.key === "Escape" && !dropdown.hidden) {
      event.preventDefault()
      setOpen(false)
    }
  })

  // Bấm trong khung gợi ý: giữ con trỏ ở ô tìm kiếm (không làm khung bị đóng trước khi mở link)
  dropdown.addEventListener("mousedown", (event) => {
    event.preventDefault()
  })

  dropdown.addEventListener("click", (event) => {
    // Xoá 1 từ khoá khỏi lịch sử
    const removeButton = event.target.closest("[search-history-remove]")
    if(removeButton) {
      const keyword = removeButton.getAttribute("search-history-remove")
      saveHistory(getHistory().filter(item => item !== keyword))
      searchInput.focus()
      renderEmptyState()
      return
    }

    // Xoá hết lịch sử
    if(event.target.closest("[search-history-clear]")) {
      saveHistory([])
      searchInput.focus()
      renderEmptyState()
      return
    }

    // "Показать все результаты": gửi form tìm kiếm
    if(event.target.closest("[search-show-all]")) {
      event.preventDefault()
      setOpen(false)
      searchForm.requestSubmit()
    }
  })

  // Bấm ra ngoài / chuyển sang phần khác của trang thì đóng khung gợi ý
  document.addEventListener("click", (event) => {
    if(!searchBox.contains(event.target)) setOpen(false)
  })
  searchBox.addEventListener("focusout", (event) => {
    if(!searchBox.contains(event.relatedTarget) && !searchBox.classList.contains("is-listening")) {
      setOpen(false)
    }
  })

  // Gửi form: bỏ danh mục trống để link gọn (/products?keyword=лапша)
  searchForm.addEventListener("formdata", (event) => {
    if(event.formData.get("category") === "") event.formData.delete("category")
    event.formData.set("keyword", getKeyword())
  })

  // Phím "/": đưa con trỏ vào ô tìm kiếm (khi không đang gõ ở ô khác)
  document.addEventListener("keydown", (event) => {
    if(event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    if(event.key !== "/" && event.code !== "Slash") return
    if(event.target.closest && event.target.closest("input, textarea, select, [contenteditable]")) return
    if(searchInput.offsetParent === null) return // ô tìm kiếm đang bị ẩn

    event.preventDefault()
    searchInput.focus()
    searchInput.select()
  })

  // --- Tìm bằng giọng nói (Web Speech API) ---
  // Nói xong thì tự tìm. Trình duyệt gửi giọng nói tới dịch vụ nhận dạng (Google, Apple), cần mạng và trang chạy HTTPS
  const voiceButton = searchBox.querySelector("[search-voice]")
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if(voiceButton && SpeechRecognition) {
    voiceButton.hidden = false
    searchBox.classList.add("has-voice")

    const voiceLangList = { ru: "ru-RU", vi: "vi-VN" }
    const voiceErrorList = {
      "not-allowed": searchText.voiceErrorPermission,
      "service-not-allowed": searchText.voiceErrorUnavailable,
      "language-not-supported": searchText.voiceErrorUnavailable,
      "audio-capture": searchText.voiceErrorNoMic,
      "no-speech": searchText.voiceErrorNoSpeech,
      "network": searchText.voiceErrorNetwork
    }
    let recognition = null

    // Khung "Говорите…" kèm chữ đang nghe được
    const renderListening = (text) => {
      clearDropdown()
      const panel = createElement("div", "sf-sd-voice")
      const icon = createElement("span", "sf-sd-voice-icon")
      icon.append(createIcon("fas fa-microphone"))
      const content = createElement("div")
      content.append(createElement("b", "", searchText.listening), createElement("p", "", text || searchText.voiceHint))
      const stopButton = createElement("button", "sf-btn sf-btn-outline sf-sd-voice-stop", searchText.voiceStop)
      stopButton.type = "button"
      stopButton.addEventListener("click", () => {
        if(recognition) recognition.stop()
      })
      panel.append(icon, content, stopButton)
      dropdown.append(panel)
      setOpen(true)
    }

    const setListening = (isListening) => {
      searchBox.classList.toggle("is-listening", isListening)
      voiceButton.setAttribute("aria-pressed", isListening)
    }

    voiceButton.addEventListener("click", () => {
      // Bấm lần nữa khi đang nghe: dừng lại và tìm theo chữ đã nghe được
      if(recognition) {
        recognition.stop()
        return
      }

      const startValue = searchInput.value
      let finalText = ""
      let errorCode = ""

      recognition = new SpeechRecognition()
      recognition.lang = voiceLangList[document.documentElement.lang] || "ru-RU"
      recognition.interimResults = true
      recognition.continuous = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let text = ""
        finalText = ""
        for (const result of event.results) {
          text += result[0].transcript
          if(result.isFinal) finalText += result[0].transcript
        }
        searchInput.value = cleanText(text)
        renderListening(cleanText(text))
      }

      recognition.onerror = (event) => {
        errorCode = event.error
      }

      recognition.onend = () => {
        recognition = null
        setListening(false)
        const keyword = cleanText(finalText) || (errorCode ? "" : getKeyword())

        if(keyword && keyword !== cleanText(startValue)) {
          // Nghe được: tìm luôn
          searchInput.value = keyword
          setOpen(false)
          searchForm.requestSubmit()
          return
        }

        searchInput.value = startValue
        setOpen(false)
        if(errorCode && errorCode !== "aborted") {
          showToast(voiceErrorList[errorCode] || searchText.errorGeneral, "error")
        }
      }

      try {
        recognition.start()
        setListening(true)
        renderListening("")
      } catch (error) {
        recognition = null
        setListening(false)
        showToast(searchText.voiceErrorUnavailable, "error")
      }
    })
  }

  // --- Quét mã vạch bằng camera (BarcodeDetector) ---
  // Chỉ hiện trên điện thoại / máy tính bảng có trình duyệt hỗ trợ (Chrome trên Android)
  // Quét được thì mở /products?keyword=mã: mã vạch đúng của 1 sản phẩm thì server mở luôn trang sản phẩm đó
  const scanButton = searchBox.querySelector("[search-scan]")
  const scanDialog = document.querySelector("[scan-dialog]")
  const canScan = scanButton && scanDialog
    && "BarcodeDetector" in window
    && navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    && typeof scanDialog.showModal === "function"
    && window.matchMedia("(pointer: coarse)").matches

  if(canScan) {
    window.BarcodeDetector.getSupportedFormats().then((supportedList) => {
      const formatList = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"].filter(format => supportedList.includes(format))
      if(!formatList.includes("ean_13")) return

      scanButton.hidden = false
      searchBox.classList.add("has-scan")

      const video = scanDialog.querySelector("[scan-video]")
      const message = scanDialog.querySelector("[scan-message]")
      const hintText = message.textContent
      let detector = null
      let stream = null
      let scanTimer = null

      const stopScan = () => {
        clearTimeout(scanTimer)
        scanTimer = null
        if(stream) {
          stream.getTracks().forEach(track => track.stop())
          stream = null
        }
        video.srcObject = null
      }

      // Cứ 0,25 giây đọc 1 lần cho đến khi thấy mã vạch
      const detectLoop = async () => {
        if(!stream) return
        try {
          if(video.readyState >= 2) {
            const codeList = await detector.detect(video)
            const code = codeList.map(item => item.rawValue).find(value => value)
            if(code && stream) {
              stopScan()
              message.textContent = `${searchText.scanFound} ${code}`
              if(navigator.vibrate) navigator.vibrate(80)
              location.href = searchUrl(code)
              return
            }
          }
        } catch (error) {
          // khung hình lỗi thì đọc khung tiếp theo
        }
        scanTimer = setTimeout(detectLoop, 250)
      }

      scanButton.addEventListener("click", async () => {
        setOpen(false)
        message.textContent = hintText
        message.classList.remove("is-error")
        scanDialog.showModal()

        try {
          detector = detector || new window.BarcodeDetector({ formats: formatList })
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } }, // camera sau
            audio: false
          })
          // Khách đã đóng khung trong lúc chờ cho phép dùng camera
          if(!scanDialog.open) {
            stopScan()
            return
          }
          video.srcObject = stream
          await video.play()
          detectLoop()
        } catch (error) {
          stopScan()
          message.textContent = error.name === "NotAllowedError" ? searchText.scanErrorPermission
            : (error.name === "NotFoundError" || error.name === "OverconstrainedError") ? searchText.scanErrorNoCamera
            : searchText.errorGeneral
          message.classList.add("is-error")
        }
      })

      scanDialog.querySelector("[scan-close]").addEventListener("click", () => scanDialog.close())
      // Bấm ra ngoài khung thì đóng
      scanDialog.addEventListener("click", (event) => {
        if(event.target === scanDialog) scanDialog.close()
      })
      // Đóng khung (nút ✕, phím Esc, nút Back) thì tắt camera
      scanDialog.addEventListener("close", stopScan)
    }).catch(() => {})
  }
}
// Hết Tìm kiếm nâng cao

// ===== Trang đặt hàng (/checkout: views/client/pages/checkout.pug) =====
// 1. Khách chọn giao tận cửa / giao tới điểm nhận hàng, nhập địa chỉ, bấm "Рассчитать доставку"
//    => server hỏi ApiShip giá của các hãng vận chuyển (POST /checkout/delivery), hiện danh sách để chọn
// 2. Giao tới điểm nhận hàng: chọn hãng xong thì tải danh sách điểm nhận hàng của hãng (GET /checkout/points)
// 3. Bấm "Перейти к оплате": gửi đơn hàng (POST /checkout), server trả về link trang thanh toán YooKassa
// Giá giao hàng không gửi từ trình duyệt lên: server lưu kết quả tính phí (quoteId), khách chỉ gửi số thứ tự hãng đã chọn
const checkoutForm = document.querySelector("[checkout-form]")
if(checkoutForm) {
  let checkoutText = {}
  try {
    checkoutText = JSON.parse(document.querySelector("[checkout-text]").textContent)
  } catch (error) {}

  const goodsTotal = Number(checkoutForm.getAttribute("data-goods-total")) || 0
  const courierFields = checkoutForm.querySelector("[checkout-courier-fields]")
  const calcButton = checkoutForm.querySelector("[checkout-calc]")
  const deliveryMessage = checkoutForm.querySelector("[checkout-delivery-message]")
  const optionsBox = checkoutForm.querySelector("[checkout-options]")
  const optionList = checkoutForm.querySelector("[checkout-option-list]")
  const pointsBox = checkoutForm.querySelector("[checkout-points]")
  const pointSearch = checkoutForm.querySelector("[checkout-point-search]")
  const pointCount = checkoutForm.querySelector("[checkout-point-count]")
  const pointList = checkoutForm.querySelector("[checkout-point-list]")
  const quoteInput = checkoutForm.querySelector("[name='quoteId']")
  const optionInput = checkoutForm.querySelector("[name='optionIndex']")
  const pointInput = checkoutForm.querySelector("[name='pointId']")
  const commentField = checkoutForm.querySelector(".sf-comment-field")
  const deliveryCostElement = checkoutForm.querySelector("[checkout-delivery-cost]")
  const totalElement = checkoutForm.querySelector("[checkout-total]")
  const formMessage = checkoutForm.querySelector("[form-message]")
  const submitButton = checkoutForm.querySelector("[type='submit']")
  const addressNames = ["city", "region", "postIndex", "street", "house"]
  const deliveryFieldNames = ["quoteId", "optionIndex", "pointId"]

  let currentOptions = []
  let points = []
  let pointsRequestId = 0
  let calcRequestId = 0

  const formatPriceText = (value) => {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " ₽"
  }

  const getDeliveryType = () => {
    const checked = checkoutForm.querySelector("[checkout-type]:checked")
    return checked ? checked.value : "point"
  }

  const setMessage = (element, text, type = "error") => {
    if(!element) return
    element.textContent = text || ""
    element.className = `sf-form-message is-${type}`
    element.hidden = !text
  }

  // Phí giao hàng, tổng tiền ở khung bên phải: cost = null là chưa chọn hãng
  const setDeliverySummary = (cost) => {
    const span = document.createElement("span")
    if(cost === null) {
      span.className = "sf-muted"
      span.textContent = checkoutText.choose || ""
    }
    else if(cost === 0) {
      span.className = "sf-free"
      span.textContent = checkoutText.free || "0 ₽"
    }
    else {
      span.textContent = formatPriceText(cost)
    }
    deliveryCostElement.replaceChildren(span)
    totalElement.textContent = formatPriceText(Math.round((goodsTotal + (cost || 0)) * 100) / 100)
  }

  // Bỏ kết quả tính phí cũ (đổi cách giao hàng, đổi địa chỉ)
  const resetDelivery = (message = "") => {
    calcRequestId++
    pointsRequestId++
    currentOptions = []
    points = []
    quoteInput.value = ""
    optionInput.value = ""
    pointInput.value = ""
    optionList.replaceChildren()
    pointList.replaceChildren()
    optionsBox.hidden = true
    pointsBox.hidden = true
    setDeliverySummary(null)
    setMessage(deliveryMessage, message, "warning")
  }

  // Giao tận cửa mới cần mã bưu chính, đường, số nhà, ghi chú cho người giao hàng
  const updateTypeFields = () => {
    const isCourier = getDeliveryType() === "courier"
    courierFields.hidden = !isCourier
    if(commentField) commentField.hidden = !isCourier
  }

  const markInvalid = (name) => {
    const input = checkoutForm.querySelector(`[name="${name}"]`)
    if(!input) return

    if(deliveryFieldNames.includes(name)) {
      // Chưa chọn hãng / điểm nhận hàng: cuộn tới phần giao hàng
      const target = name === "pointId" && !pointsBox.hidden ? pointsBox : calcButton
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    input.setAttribute("aria-invalid", "true")
    input.focus()
  }

  // --- Tính phí giao hàng ---
  const calculateDelivery = async () => {
    const requestId = ++calcRequestId
    checkoutForm.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"))
    setMessage(deliveryMessage, checkoutText.loading, "info")
    optionsBox.hidden = true
    pointsBox.hidden = true
    calcButton.disabled = true

    const data = { deliveryType: getDeliveryType() }
    addressNames.forEach((name) => {
      data[name] = checkoutForm.elements[name] ? checkoutForm.elements[name].value : ""
    })

    const result = await sendJson("/checkout/delivery", "POST", data)
    if(requestId !== calcRequestId) return
    calcButton.disabled = false

    if(result.code !== "success") {
      resetDelivery()
      setMessage(deliveryMessage, result.message, "error")
      if(result.field) markInvalid(result.field)
      if(result.reload) setTimeout(() => location.reload(), 2000)
      return
    }

    setMessage(deliveryMessage, "")
    quoteInput.value = result.quoteId
    currentOptions = result.options || []
    renderOptions()

    // Chọn sẵn hãng rẻ nhất (khách đổi được)
    if(currentOptions.length > 0) {
      const firstInput = optionList.querySelector("input")
      firstInput.checked = true
      selectOption(currentOptions[0].index)
    }
  }

  const renderOptions = () => {
    optionList.replaceChildren()
    currentOptions.forEach((option) => {
      const label = document.createElement("label")
      label.className = "sf-option"

      const input = document.createElement("input")
      input.type = "radio"
      input.name = "deliveryOption"
      input.value = option.index

      const box = document.createElement("span")
      box.className = "sf-option-box"

      const main = document.createElement("span")
      main.className = "sf-option-main"
      const provider = document.createElement("b")
      provider.textContent = option.providerName
      const tariff = document.createElement("small")
      tariff.textContent = option.tariffName
      main.append(provider, tariff)

      const side = document.createElement("span")
      side.className = "sf-option-side"
      const cost = document.createElement("b")
      cost.textContent = option.costFormat
      if(option.cost === 0) cost.className = "sf-free"
      side.append(cost)
      if(option.daysText) {
        const days = document.createElement("small")
        days.textContent = option.daysText
        side.append(days)
      }

      box.append(main, side)
      label.append(input, box)
      optionList.append(label)
    })
    optionsBox.hidden = currentOptions.length === 0
  }

  const selectOption = (index) => {
    const option = currentOptions.find(item => item.index === Number(index))
    if(!option) return

    optionInput.value = option.index
    pointInput.value = ""
    setDeliverySummary(option.cost)
    setMessage(formMessage, "")

    if(getDeliveryType() === "point") {
      loadPoints(option.index)
    }
    else {
      pointsBox.hidden = true
    }
  }

  // --- Điểm nhận hàng ---
  const loadPoints = async (index) => {
    const requestId = ++pointsRequestId
    points = []
    pointsBox.hidden = false
    pointList.replaceChildren()
    pointSearch.value = ""
    pointCount.textContent = checkoutText.loading || ""

    let result
    try {
      const response = await fetch(`/checkout/points?quoteId=${encodeURIComponent(quoteInput.value)}&option=${index}`, {
        headers: { "Accept": "application/json" }
      })
      result = await response.json()
    } catch (error) {
      result = { code: "error", message: errorText }
    }
    if(requestId !== pointsRequestId) return

    if(result.code !== "success") {
      pointCount.textContent = result.message
      return
    }

    points = result.points || []
    renderPoints()
  }

  // Hiện tối đa 100 điểm (thành phố lớn có hàng trăm điểm), khách gõ địa chỉ để tìm
  const renderPoints = () => {
    const keyword = pointSearch.value.trim().toLowerCase()
    const list = keyword
      ? points.filter(point => `${point.address} ${point.name} ${point.code}`.toLowerCase().includes(keyword))
      : points

    pointList.replaceChildren()
    if(list.length === 0) {
      pointCount.textContent = checkoutText.noPoints || ""
      return
    }

    pointCount.textContent = `${checkoutText.pointCount || ""} ${list.length}` + (list.length > 100 ? `. ${checkoutText.pointMore || ""}` : "")

    list.slice(0, 100).forEach((point) => {
      const item = document.createElement("li")
      const label = document.createElement("label")
      label.className = "sf-point"

      const input = document.createElement("input")
      input.type = "radio"
      input.name = "deliveryPoint"
      input.value = point.id
      input.checked = pointInput.value === `${point.id}`

      const box = document.createElement("span")
      box.className = "sf-point-box"
      const address = document.createElement("b")
      address.textContent = point.address
      box.append(address)
      if(point.name && point.name !== point.address) {
        const name = document.createElement("small")
        name.textContent = point.name
        box.append(name)
      }
      if(point.timetable) {
        const timetable = document.createElement("small")
        timetable.className = "sf-point-time"
        timetable.textContent = point.timetable
        box.append(timetable)
      }

      label.append(input, box)
      item.append(label)
      pointList.append(item)
    })
  }

  // --- Sự kiện ---
  checkoutForm.addEventListener("change", (event) => {
    const target = event.target

    if(target.matches("[checkout-type]")) {
      updateTypeFields()
      resetDelivery()
      if(checkoutForm.elements.city.value.trim().length >= 2) calculateDelivery()
      return
    }

    if(target.name === "deliveryOption") {
      selectOption(target.value)
      return
    }

    if(target.name === "deliveryPoint") {
      pointInput.value = target.value
      setMessage(formMessage, "")
    }
  })

  checkoutForm.addEventListener("input", (event) => {
    const target = event.target
    target.removeAttribute("aria-invalid")

    // Đổi địa chỉ sau khi đã tính phí: phải tính lại (phí phụ thuộc địa chỉ)
    if(addressNames.includes(target.name) && quoteInput.value) {
      resetDelivery(checkoutText.calcAgain)
    }

    if(target === pointSearch) {
      renderPoints()
    }
  })

  // Enter trong ô địa chỉ: tính phí giao hàng (không gửi đơn hàng)
  checkoutForm.addEventListener("keydown", (event) => {
    if(event.key !== "Enter") return
    if(addressNames.includes(event.target.name)) {
      event.preventDefault()
      calculateDelivery()
    }
    else if(event.target === pointSearch) {
      event.preventDefault()
    }
  })

  calcButton.addEventListener("click", calculateDelivery)

  // --- Đặt hàng ---
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    checkoutForm.querySelectorAll("[aria-invalid]").forEach(input => input.removeAttribute("aria-invalid"))
    setMessage(formMessage, "")

    const data = Object.fromEntries(new FormData(checkoutForm))
    delete data.deliveryOption
    delete data.deliveryPoint

    submitButton.disabled = true
    const result = await sendJson(checkoutForm.getAttribute("action"), "POST", data)

    if(result.code === "success" && result.redirect) {
      // Giữ nút bị khoá trong lúc chuyển sang trang thanh toán để khách không bấm 2 lần
      location.href = result.redirect
      return
    }

    submitButton.disabled = false
    setMessage(formMessage, result.message, "error")
    if(result.field) markInvalid(result.field)
    if(result.recalc) resetDelivery(result.message)
    if(result.reload) setTimeout(() => location.reload(), 2500)
  })

  updateTypeFields()
  // Đã có địa chỉ (khách đặt hàng lần trước): tính phí luôn
  if(!calcButton.disabled && checkoutForm.elements.city.value.trim().length >= 2) {
    calculateDelivery()
  }
}
// Hết Trang đặt hàng
