import { Request, Response } from "express"
import { Cart } from "../../models/cart.model"
import { Coupon } from "../../models/coupon.model"
import { Order } from "../../models/order.model"
import { DeliveryQuote } from "../../models/delivery-quote.model"
import {
  apishipColdProviderKeys,
  apishipProviderKeys,
  checkoutDeliveryMarkup,
  checkoutFreeDeliveryFrom,
  checkoutMinOrderValue,
  orderDeliveryTypeList,
  orderPaymentTimeoutMinutes
} from "../../config/variable.config"
import { buildCartView, getCart } from "../../helpers/cart.helper"
import { roundMoney } from "../../helpers/client-token.helper"
import {
  buildParcel,
  calculateDelivery,
  getItemSize,
  getItemWeight,
  getPickupPoints,
  getProviderName,
  getProviderNames,
  isApishipConfigured
} from "../../helpers/apiship.helper"
import { createPayment, getPaymentProvider } from "../../helpers/payment.helper"
import {
  buildOrderSearch,
  cancelUnpaidOrder,
  claimCouponUsage,
  countCustomerCouponUsage,
  generateOrderAccessKey,
  generateOrderCode,
  orderByCustomer,
  orderBySystem,
  releaseCouponUsage,
  reserveStock
} from "../../helpers/order.helper"
import { normalizePhone } from "./account.controller"

// ===== Trang đặt hàng: /checkout =====
// 1. Khách nhập thông tin người nhận, chọn giao tận cửa / giao tới điểm nhận hàng, nhập địa chỉ
// 2. Bấm "Рассчитать доставку": server hỏi ApiShip giá của các hãng vận chuyển (POST /checkout/delivery)
// 3. Khách chọn hãng / tariff (giao tới điểm nhận hàng thì chọn thêm điểm nhận: GET /checkout/points)
// 4. Bấm "Перейти к оплате": tạo đơn hàng, giữ hàng trong kho, chuyển khách tới trang thanh toán Т-Банк (POST /checkout)
// Khách phải thanh toán trước, cửa hàng mới tạo vận đơn và gửi hàng

const sendError = (res: Response, key: string, field: string = "", extra: object = {}) => {
  res.json({
    code: "error",
    message: res.locals.t(key),
    field: field,
    ...extra
  })
}

// So sánh địa chỉ không phân biệt hoa thường, khoảng trắng thừa
const sameText = (a: any, b: any): boolean => {
  return `${a || ""}`.trim().replace(/\s+/g, " ").toLowerCase() === `${b || ""}`.trim().replace(/\s+/g, " ").toLowerCase()
}

// Tên thành phố để so sánh: bỏ chữ "г." / "город" ở đầu, ví dụ "г. Москва" => "Москва"
const cleanCityName = (city: string): string => {
  return `${city || ""}`.replace(/^\s*(г\.|город)\s*/i, "").trim()
}

// Khối lượng, kích thước kiện hàng của các sản phẩm đặt được trong giỏ
const getCartParcel = (cartView: any) => {
  return buildParcel(cartView.itemList.map((item: any) => ({
    ...getItemSize(item.product),
    weight: getItemWeight(item.product),
    quantity: item.quantity
  })))
}

// Giao hàng miễn phí: mã giảm giá "Miễn phí giao hàng" hoặc đơn đủ checkoutFreeDeliveryFrom
const isFreeDelivery = (cartView: any): boolean => {
  const couponFreeShipping = !!(cartView.coupon && !cartView.coupon.errorKey && cartView.coupon.freeShipping)
  const reachThreshold = checkoutFreeDeliveryFrom > 0 && cartView.total >= checkoutFreeDeliveryFrom
  return couponFreeShipping || reachThreshold
}

// Hãng vận chuyển được chọn (giỏ có hàng mát / đông lạnh thì chỉ hãng trong apishipColdProviderKeys)
const getAllowedProviderKeys = (cartView: any): string[] => {
  if(cartView.hasColdItems && apishipColdProviderKeys.length > 0){
    return apishipProviderKeys.length > 0
      ? apishipColdProviderKeys.filter(key => apishipProviderKeys.includes(key))
      : apishipColdProviderKeys
  }
  return apishipProviderKeys
}

// Số ngày giao dự kiến, ví dụ "2–4 дн.", "1 дн."
const formatDays = (res: Response, daysMin: number, daysMax: number): string => {
  if(!daysMin && !daysMax) return ""
  const min = daysMin || daysMax
  const max = Math.max(daysMax, min)
  const range = min === max ? `${min}` : `${min}–${max}`
  return `${range} ${res.locals.tWord(max, "dayCount")}`
}

// Trang đặt hàng: /checkout
export const index = async (req: Request, res: Response) => {
  const cart = await getCart(req, res)
  const cartView = await buildCartView(cart)
  res.locals.cartQuantity = cartView.cartQuantity

  // Giỏ không có sản phẩm đặt được thì quay lại giỏ hàng
  if(cartView.itemList.length === 0){
    res.redirect("/cart")
    return
  }

  // Khách đã đăng nhập: điền sẵn thông tin, địa chỉ của đơn gần nhất
  const account = res.locals.clientAccount
  let lastOrder: any = null
  if(account){
    lastOrder = await Order.findOne({ userId: account.id }).sort({ createdAt: -1 }).select("customer delivery")
  }

  const prefill = {
    fullName: lastOrder?.customer?.fullName || account?.fullName || "",
    phone: lastOrder?.customer?.phone || account?.phone || "",
    email: account?.email || lastOrder?.customer?.email || "",
    deliveryType: lastOrder?.delivery?.type || "point",
    city: lastOrder?.delivery?.city || "",
    region: lastOrder?.delivery?.region || "",
    postIndex: lastOrder?.delivery?.postIndex || "",
    street: lastOrder?.delivery?.street || "",
    house: lastOrder?.delivery?.house || "",
    apartment: lastOrder?.delivery?.apartment || ""
  }

  const paymentProvider = getPaymentProvider()

  res.render("client/pages/checkout", {
    pageTitle: `${res.locals.t("checkoutTitle")} — SFoodie`,
    cartView: cartView,
    prefill: prefill,
    deliveryTypeList: orderDeliveryTypeList,
    freeDelivery: isFreeDelivery(cartView),
    freeDeliveryFrom: checkoutFreeDeliveryFrom,
    minOrderValue: checkoutMinOrderValue,
    belowMinOrder: checkoutMinOrderValue > 0 && cartView.total < checkoutMinOrderValue,
    paymentProvider: paymentProvider,
    canOrder: !!paymentProvider && isApishipConfigured(),
    paymentTimeoutMinutes: orderPaymentTimeoutMinutes
  })
}

// Tính phí giao hàng: POST /checkout/delivery { deliveryType, city, region, postIndex, street, house }
// Trả về danh sách hãng / tariff kèm giá, kết quả lưu tạm (DeliveryQuote), khách gửi lại quoteId + optionIndex lúc đặt hàng
export const deliveryPost = async (req: Request, res: Response) => {
  try {
    if(!isApishipConfigured()){
      sendError(res, "deliveryUnavailable")
      return
    }

    const cart = await getCart(req, res)
    const cartView = await buildCartView(cart)
    if(cartView.itemList.length === 0){
      sendError(res, "cartChanged", "", { reload: true })
      return
    }

    const body = req.body
    const deliveryTypeInfo = orderDeliveryTypeList.find(item => item.id === body.deliveryType)!
    const parcel = getCartParcel(cartView)
    const addressString = body.deliveryType === "courier"
      ? [body.postIndex, body.region, body.city, body.street, body.house].filter(Boolean).join(", ")
      : ""

    let tariffList
    try {
      tariffList = await calculateDelivery({
        deliveryType: deliveryTypeInfo.apishipType,
        to: {
          city: body.city,
          region: body.region,
          postIndex: body.postIndex,
          addressString: addressString
        },
        parcel: parcel,
        assessedCost: cartView.total,
        providerKeys: getAllowedProviderKeys(cartView)
      })
    } catch (error) {
      console.log("Tính phí giao hàng ApiShip thất bại:", (error as Error).message)
      sendError(res, "deliveryCalcError")
      return
    }

    // Chỉ giữ hãng được phép (giỏ có hàng lạnh), xếp rẻ trước, nhanh trước
    const allowedKeys = getAllowedProviderKeys(cartView)
    tariffList = tariffList
      .filter(tariff => allowedKeys.length === 0 || allowedKeys.includes(tariff.providerKey))
      .sort((a, b) => a.deliveryCost - b.deliveryCost || (a.daysMin || 99) - (b.daysMin || 99))
      .slice(0, 40)

    if(tariffList.length === 0){
      sendError(res, "deliveryNoOptions")
      return
    }

    const providerNames = await getProviderNames()
    const options = tariffList.map(tariff => ({
      providerKey: tariff.providerKey,
      providerName: getProviderName(providerNames, tariff.providerKey),
      tariffId: tariff.tariffId,
      tariffName: tariff.tariffName,
      cost: Math.ceil(tariff.deliveryCost + checkoutDeliveryMarkup),
      costOriginal: tariff.deliveryCost,
      daysMin: tariff.daysMin,
      daysMax: tariff.daysMax,
      pointIds: tariff.pointIds
    }))

    const quote = await DeliveryQuote.create({
      cartId: cart.id,
      deliveryType: body.deliveryType,
      city: body.city,
      region: body.region || "",
      postIndex: body.postIndex || "",
      street: body.street || "",
      house: body.house || "",
      weight: parcel.weight,
      assessedCost: cartView.total,
      parcel: parcel,
      options: options
    })

    const freeDelivery = isFreeDelivery(cartView)

    res.json({
      code: "success",
      quoteId: quote.id,
      freeDelivery: freeDelivery,
      goodsTotal: cartView.total,
      options: options.map((option, index) => ({
        index: index,
        providerKey: option.providerKey,
        providerName: option.providerName,
        tariffName: option.tariffName,
        cost: freeDelivery ? 0 : option.cost,
        costFormat: freeDelivery ? res.locals.t("free") : res.locals.formatPrice(option.cost),
        daysText: formatDays(res, option.daysMin, option.daysMax)
      }))
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Lấy kết quả tính phí giao hàng của giỏ hàng đang đặt (không cho xem / dùng kết quả của giỏ hàng khác)
const findQuote = async (cart: any, quoteId: any) => {
  if(!cart || typeof quoteId !== "string" || !/^[a-f0-9]{24}$/.test(quoteId)) return null
  return await DeliveryQuote.findOne({ _id: quoteId, cartId: cart.id })
}

// Danh sách điểm nhận hàng của tariff khách chọn: GET /checkout/points?quoteId=...&option=...
export const points = async (req: Request, res: Response) => {
  try {
    const cart = await getCart(req, res)
    const quote: any = await findQuote(cart, req.query.quoteId)
    const option = quote?.options?.[Number(req.query.option)]

    if(!quote || !option || quote.deliveryType !== "point"){
      sendError(res, "deliveryRecalc")
      return
    }

    let pointList
    try {
      pointList = option.pointIds.length > 0
        ? await getPickupPoints({ ids: option.pointIds.slice(0, 500) })
        : await getPickupPoints({ city: quote.city, providerKey: option.providerKey })
    } catch (error) {
      console.log("Lấy danh sách điểm nhận hàng ApiShip thất bại:", (error as Error).message)
      sendError(res, "pointLoadError")
      return
    }

    pointList = pointList
      .filter(point => !point.providerKey || point.providerKey === option.providerKey)
      .sort((a, b) => a.address.localeCompare(b.address, "ru"))

    res.json({
      code: "success",
      points: pointList.map(point => ({
        id: point.id,
        name: point.name,
        address: point.address,
        timetable: point.timetable,
        code: point.code
      }))
    })
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}

// Đặt hàng: POST /checkout
// Tạo đơn "Chờ thanh toán", giữ hàng trong kho, tạo thanh toán Т-Банк rồi trả về link trang thanh toán (redirect)
// Đơn không được thanh toán trong orderPaymentTimeoutMinutes phút thì tự huỷ (helpers/order.helper.ts)
export const orderPost = async (req: Request, res: Response) => {
  try {
    const paymentProvider = getPaymentProvider()
    if(!paymentProvider || !isApishipConfigured()){
      sendError(res, "checkoutUnavailable")
      return
    }

    const body = req.body
    const cart = await getCart(req, res)
    const cartView = await buildCartView(cart)

    if(cartView.itemList.length === 0){
      sendError(res, "cartChanged", "", { reload: true })
      return
    }

    if(checkoutMinOrderValue > 0 && cartView.total < checkoutMinOrderValue){
      sendError(res, "minOrderNotReached", "", { reload: true })
      return
    }

    // Phí giao hàng: lấy từ kết quả đã tính (khách không gửi giá lên)
    // Địa chỉ hoặc giỏ hàng đã đổi sau khi tính thì phải tính lại
    const quote: any = await findQuote(cart, body.quoteId)
    const option = quote?.options?.[body.optionIndex]
    const parcel = getCartParcel(cartView)

    const sameAddress = quote
      && quote.deliveryType === body.deliveryType
      && sameText(quote.city, body.city)
      && sameText(quote.region, body.region)
      && (body.deliveryType !== "courier" || (
        sameText(quote.postIndex, body.postIndex)
        && sameText(quote.street, body.street)
        && sameText(quote.house, body.house)
      ))

    if(!option || !sameAddress || quote.weight !== parcel.weight || quote.assessedCost !== cartView.total){
      sendError(res, "deliveryRecalc", "", { recalc: true })
      return
    }

    // Điểm nhận hàng: phải thuộc tariff đã chọn, lấy lại thông tin điểm từ ApiShip để lưu vào đơn
    let point: any = null
    if(body.deliveryType === "point"){
      const pointId = Number(body.pointId)
      if(option.pointIds.length > 0 && !option.pointIds.includes(pointId)){
        sendError(res, "pointChoose")
        return
      }

      try {
        const pointList = await getPickupPoints({ ids: [pointId] })
        point = pointList.find(item => item.id === pointId)
      } catch (error) {
        console.log("Lấy điểm nhận hàng ApiShip thất bại:", (error as Error).message)
        sendError(res, "pointLoadError")
        return
      }

      // Tariff không có danh sách điểm (lấy điểm theo thành phố): điểm phải cùng thành phố đã tính phí
      const cityMismatch = option.pointIds.length === 0 && point && point.city && !sameText(cleanCityName(point.city), cleanCityName(quote.city))
      if(!point || (point.providerKey && point.providerKey !== option.providerKey) || cityMismatch){
        sendError(res, "pointChoose")
        return
      }
    }

    const customer = {
      fullName: body.fullName,
      phone: normalizePhone(body.phone),
      email: body.email
    }
    const account = res.locals.clientAccount

    // Mã giảm giá: chỉ dùng khi đủ điều kiện (trang giỏ hàng đã kiểm tra), kiểm tra thêm số lần mỗi khách được dùng
    let coupon: any = null
    const couponOk = !!(cartView.coupon && !cartView.coupon.errorKey)
    if(couponOk){
      coupon = await Coupon.findOne({ code: cartView.coupon.code, deleted: false })
      if(!coupon){
        sendError(res, "cartChanged", "", { reload: true })
        return
      }

      if(coupon.usageLimitPerCustomer){
        const usedCount = await countCustomerCouponUsage(coupon.code, {
          userId: account?.id,
          email: customer.email,
          phone: customer.phone
        })
        if(usedCount >= coupon.usageLimitPerCustomer){
          sendError(res, "couponLimitPerCustomer")
          return
        }
      }

      if(!(await claimCouponUsage(coupon.id))){
        sendError(res, "couponExpired", "", { reload: true })
        return
      }
    }

    // Giữ hàng trong kho
    const reserve = await reserveStock(cartView.itemList.map((item: any) => ({
      productId: item.product.id,
      quantity: item.quantity,
      name: res.locals.tName(item.product)
    })))
    if(!reserve.ok){
      if(coupon) await releaseCouponUsage(coupon.id)
      res.json({
        code: "error",
        message: `${reserve.failedItem?.name}: ${res.locals.t("productNotEnough")}`,
        reload: true
      })
      return
    }

    const freeDelivery = isFreeDelivery(cartView)
    const deliveryCost = freeDelivery ? 0 : option.cost
    const couponDiscount = couponOk ? cartView.couponDiscount : 0
    const total = roundMoney(cartView.subtotal - couponDiscount + deliveryCost)

    const addressParts = body.deliveryType === "courier"
      ? [
        body.postIndex,
        body.region,
        body.city,
        body.street,
        body.house ? `${res.locals.t("houseShort")} ${body.house}` : "",
        body.apartment ? `${res.locals.t("apartmentShort")} ${body.apartment}` : ""
      ]
      : [body.region, body.city]

    const orderData: any = {
      accessKey: generateOrderAccessKey(),
      userId: account ? account.id : undefined,
      lang: res.locals.lang,
      customer: customer,
      items: cartView.itemList.map((item: any) => {
        const product = item.product
        const size = getItemSize(product)
        return {
          productId: product.id,
          name: product.name,
          nameRu: product.nameRu,
          slug: product.slug,
          sku: product.sku,
          barcode: product.barcode,
          image: product.cardImage,
          unit: product.unit,
          vat: product.vat,
          price: product.price,
          priceOld: product.priceOld > product.price ? product.priceOld : undefined,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
          weight: getItemWeight(product),
          length: size.length,
          width: size.width,
          height: size.height,
          storageType: product.storageType
        }
      }),
      totalQuantity: cartView.totalQuantity,
      oldSubtotal: cartView.oldSubtotal,
      subtotal: cartView.subtotal,
      couponCode: couponOk ? cartView.coupon.code : undefined,
      couponDiscount: couponDiscount,
      couponFreeShipping: couponOk && cartView.coupon.freeShipping,
      deliveryCost: deliveryCost,
      deliveryCostOriginal: option.costOriginal,
      total: total,
      delivery: {
        type: body.deliveryType,
        providerKey: option.providerKey,
        providerName: option.providerName,
        tariffId: option.tariffId,
        tariffName: option.tariffName,
        daysMin: option.daysMin,
        daysMax: option.daysMax,
        city: body.city,
        region: body.region,
        postIndex: body.postIndex,
        street: body.street,
        house: body.house,
        apartment: body.apartment,
        address: addressParts.filter(Boolean).join(", "),
        point: point ? {
          id: point.id,
          code: point.code,
          name: point.name,
          address: point.address,
          timetable: point.timetable,
          lat: point.lat,
          lng: point.lng
        } : undefined,
        parcel: quote.parcel,
        comment: body.comment
      },
      payment: {
        provider: paymentProvider,
        status: "pending"
      },
      paymentExpireAt: new Date(Date.now() + orderPaymentTimeoutMinutes * 60 * 1000),
      status: "pending",
      statusHistory: [{
        status: "pending",
        note: "Khách đặt hàng",
        by: orderByCustomer,
        at: new Date()
      }]
    }

    // Mã đơn ngẫu nhiên, trùng (rất hiếm) thì tạo mã khác
    let order: any = null
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      const code = generateOrderCode()
      try {
        order = await Order.create({
          ...orderData,
          code: code,
          search: buildOrderSearch(code, customer)
        })
      } catch (error: any) {
        if(error?.code !== 11000) throw error
      }
    }
    if(!order){
      throw new Error("Không tạo được mã đơn hàng")
    }

    // Bỏ các sản phẩm đã đặt và mã giảm giá khỏi giỏ (sản phẩm tạm hết hàng vẫn giữ lại trong giỏ)
    await Cart.updateOne({ _id: cart.id }, {
      $pull: { items: { productId: { $in: orderData.items.map((item: any) => item.productId) } } },
      $unset: { couponCode: "" }
    })
    await DeliveryQuote.deleteOne({ _id: quote.id })

    // Tạo thanh toán, lỗi thì huỷ đơn (trả hàng vào kho, trả lượt dùng mã)
    try {
      const payment = await createPayment(order)
      await Order.updateOne({ _id: order.id }, {
        $set: {
          "payment.paymentId": payment.paymentId,
          "payment.confirmationUrl": payment.confirmationUrl,
          "payment.attempt": payment.attempt
        }
      })

      res.json({
        code: "success",
        redirect: payment.confirmationUrl
      })
    } catch (error) {
      console.log(`Tạo thanh toán cho đơn ${order.code} thất bại:`, (error as Error).message)
      await cancelUnpaidOrder(order, `Lỗi tạo thanh toán: ${(error as Error).message}`, orderBySystem)
      // Trả sản phẩm vào lại giỏ hàng để khách thử lại
      await Cart.updateOne({ _id: cart.id }, {
        $push: { items: { $each: orderData.items.map((item: any) => ({ productId: item.productId, quantity: item.quantity })) } },
        ...(orderData.couponCode ? { $set: { couponCode: orderData.couponCode } } : {})
      })
      sendError(res, "paymentCreateError")
    }
  } catch (error) {
    console.log(error)
    sendError(res, "errorGeneral")
  }
}
