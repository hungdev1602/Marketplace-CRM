import slugify from "slugify"
import moment from "moment"
import { Product } from "../models/product.model"
import { CategoryProduct } from "../models/category-product.model"
import { SearchQuery } from "../models/search-query.model"
import { productVisibleFind } from "./client-product.helper"
import { buildCategoryTree } from "./category.helper"
import {
  clientSearchCacheSeconds,
  clientSearchLogRetentionDays,
  clientSearchPopularDays,
  clientSearchPopularLimit,
  clientSearchPopularMinCount
} from "../config/variable.config"

// ===== Tìm kiếm nâng cao ở trang khách hàng =====
// Trường search của sản phẩm lưu tên, tên tiếng Nga, SKU, mã vạch, thương hiệu ở dạng không dấu, chữ Latin
// (slugify, xem controller/admin/product.controller.ts), ví dụ: "mi hao hao tom chua cay lapsha hao hao acecook"
// Từ khoá của khách cũng được chuyển về dạng đó rồi so sánh, nên:
// - Gõ có dấu / không dấu, tiếng Việt / tiếng Nga đều tìm được
// - Gõ nhiều từ, không cần đúng thứ tự: "tom mi hao hao", "острая лапша"
// - "ё" và "е" như nhau: "чёрный" = "черный"; "đ" và "d" như nhau: "dau phong" = "đậu phộng"
// - Không có sản phẩm nào thì thử: đổi bàn phím gõ nhầm (kfgif => лапша), sửa lỗi chính tả (лапшв => лапша)

// Từ khoá tối đa 100 ký tự, 10 từ (khách dán đoạn văn dài vào ô tìm kiếm)
const keywordMaxLength = 100
const keywordMaxWords = 10

// Cắt từ khoá khách gửi lên
export const cleanKeyword = (value: any): string => {
  return `${value || ""}`.replace(/\s+/g, " ").trim().slice(0, keywordMaxLength)
}

// Chuyển chữ về dạng không dấu, chữ Latin, chữ thường (giống trường search của sản phẩm)
// ё => е, đ => d trước khi chuyển, để "чёрный" và "черный", "đậu" và "dau" giống nhau
export const normalizeText = (text: string): string => {
  const value = `${text || ""}`
    .replace(/[ёЁ]/g, "е")
    .replace(/[đĐ]/g, "d")

  return slugify(value, {
    replacement: " ",
    lower: true
  }).replace(/\s+/g, " ").trim()
}

// Thêm "\" trước các ký tự đặc biệt của RegExp (. * + ? ( ) ...) để tìm đúng chuỗi đã nhập
const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Mẫu RegExp của 1 từ (đã chuyển bằng normalizeText), chấp nhận các cách viết khác nhau của cùng 1 chữ:
// - "e" khớp cả "yo" (ё được lưu là "yo"): từ khoá "chernyj" khớp "chyornyj" (Чёрный)
// - "d" khớp cả "dj" (đ được lưu là "dj"): từ khoá "dau" khớp "djau" (Đậu)
const tolerantPattern = (word: string): string => {
  const replaceList: { [key: string]: string } = {
    yo: "(?:yo|e)",
    e: "(?:e|yo)",
    d: "dj?"
  }
  return escapeRegex(word).replace(/yo|e|d/g, match => replaceList[match])
}

// Các từ trong từ khoá (dạng không dấu, chữ Latin)
// Bỏ từ 1 ký tự nếu còn từ khác (ví dụ "с", "и" trong "лапша с курицей"), tối đa keywordMaxWords từ
export const getKeywordWords = (keyword: string): string[] => {
  const words = normalizeText(keyword).split(" ").filter(Boolean)
  const longWords = words.filter(word => word.length > 1)
  return (longWords.length > 0 ? longWords : words).slice(0, keywordMaxWords)
}

// Các từ không chuyển được sang chữ Latin (tiếng Hàn, tiếng Trung, tiếng Thái: 신라면, 辣条...)
// Tìm trực tiếp trong tên sản phẩm
const getRawWords = (keyword: string): string[] => {
  return keyword
    .split(" ")
    .filter(word => word && !normalizeText(word))
    .slice(0, keywordMaxWords)
}

// Điều kiện tìm sản phẩm theo từ khoá: sản phẩm phải chứa tất cả các từ, không cần đúng thứ tự
export const buildKeywordFind = (keyword: string): any => {
  const conditions: any[] = []

  for (const word of getKeywordWords(keyword)) {
    conditions.push({
      search: new RegExp(tolerantPattern(word), "i")
    })
  }

  for (const word of getRawWords(keyword)) {
    const regex = new RegExp(escapeRegex(word), "i")
    conditions.push({
      $or: [{ name: regex }, { nameRu: regex }]
    })
  }

  if(conditions.length === 0) return {}
  return conditions.length === 1 ? conditions[0] : { $and: conditions }
}

// Thêm điều kiện từ khoá vào điều kiện tìm sản phẩm đang có (giữ nguyên các điều kiện khác)
export const addKeywordFind = (find: any, keyword: string) => {
  const keywordFind = buildKeywordFind(keyword)
  if(Object.keys(keywordFind).length > 0){
    find.$and = [...(find.$and || []), keywordFind]
  }
  return find
}

// ===== Sắp xếp theo mức độ phù hợp =====
// Điểm phù hợp của sản phẩm với từ khoá (tính trong MongoDB):
// - Tên bắt đầu bằng đúng cụm từ khoá: +40
// - Có 1 từ bắt đầu bằng đúng cụm từ khoá (tên tiếng Nga, thương hiệu,...): +30
// - Chứa nguyên cụm từ khoá: +20
// - Mỗi từ của từ khoá đứng ở đầu 1 từ: +5
// - Tên (hoặc tên tiếng Nga) chứa đúng chữ khách gõ, kể cả dấu: +15 (gõ "đậu" thì "Đậu phộng" đứng trước "Dầu hào")
const buildRelevanceScore = (keyword: string): any => {
  const words = getKeywordWords(keyword)
  if(words.length === 0) return 0

  const phrase = words.map(tolerantPattern).join("[ -]")
  const point = (field: string, pattern: string, value: number) => ({
    $cond: [{ $regexMatch: { input: { $ifNull: [field, ""] }, regex: new RegExp(pattern, "i") } }, value, 0]
  })
  const exactPattern = escapeRegex(keyword.toLowerCase())

  return {
    $add: [
      point("$search", `^${phrase}`, 40),
      point("$search", `(?:^|[ -])${phrase}`, 30),
      point("$search", phrase, 20),
      ...words.map(word => point("$search", `(?:^|[ -])${tolerantPattern(word)}`, 5)),
      {
        $max: [
          point("$name", exactPattern, 15),
          point("$nameRu", exactPattern, 15)
        ]
      }
    ]
  }
}

// Lấy sản phẩm theo mức độ phù hợp với từ khoá (phân trang bằng skip, limit)
// Bằng điểm thì sản phẩm còn hàng trước, bán chạy trước
export const findProductsByRelevance = async (find: any, keyword: string, skip: number, limit: number) => {
  const idList = await Product.aggregate([
    { $match: find },
    {
      $addFields: {
        relevanceScore: buildRelevanceScore(keyword),
        inStockScore: { $cond: [{ $gt: ["$stock", 0] }, 1, 0] }
      }
    },
    {
      $sort: {
        relevanceScore: -1,
        inStockScore: -1,
        sold: -1,
        _id: -1
      }
    },
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 1 } }
  ])

  const ids = idList.map(item => `${item._id}`)
  const productList: any[] = await Product.find({ _id: { $in: ids } })
  return productList.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
}

// ===== Lưu tạm trong bộ nhớ (danh mục, thương hiệu, từ vựng, từ khoá hay tìm) =====
// Khung gợi ý gọi lên server mỗi lần khách gõ, nên các danh sách ít thay đổi được lưu lại clientSearchCacheSeconds giây
const cacheStore: { [key: string]: { time: number, promise: Promise<any> } } = {}
const getCached = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const item = cacheStore[key]
  if(item && Date.now() - item.time < clientSearchCacheSeconds * 1000){
    return item.promise
  }

  const promise = load()
  cacheStore[key] = { time: Date.now(), promise: promise }
  // Lỗi (mất kết nối database,...) thì lần sau tải lại
  promise.catch(() => {
    if(cacheStore[key]?.promise === promise) delete cacheStore[key]
  })
  return promise
}

// Danh mục đang hoạt động (danh mục cha bị tạm dừng thì ẩn cả danh mục con, giống menu)
// - list: danh mục hiện được (kèm text: tên không dấu để tìm)
// - allCategory: tất cả danh mục đang hoạt động (để lấy danh mục con khi lọc theo danh mục)
export const getSearchCategories = () => getCached("categories", async () => {
  const allCategory: any[] = await CategoryProduct
    .find({
      deleted: false,
      status: "active"
    })
    .sort({
      position: "asc",
      createdAt: "desc"
    })

  const list: any[] = []
  const addNodes = (nodes: any[]) => {
    for (const node of nodes) {
      list.push({
        id: node.id,
        name: node.name,
        nameRu: node.nameRu,
        slug: node.slug,
        avatar: node.avatar,
        text: normalizeText(`${node.name || ""} ${node.nameRu || ""}`)
      })
      addNodes(node.children)
    }
  }
  addNodes(buildCategoryTree(allCategory))

  return {
    list: list,
    allCategory: allCategory
  }
})

// Thương hiệu của các sản phẩm đang bán
const getSearchBrands = () => getCached("brands", async () => {
  const brandList: string[] = await Product.distinct("brand", {
    ...productVisibleFind,
    brand: { $nin: [null, ""] }
  })

  const result: { name: string, text: string }[] = []
  for (const brand of brandList) {
    const name = `${brand}`.trim()
    const text = normalizeText(name)
    if(name && text && !result.some(item => item.text === text)){
      result.push({ name: name, text: text })
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
})

// Danh mục có tên khớp với từ khoá (mọi từ đều có trong tên), danh mục bắt đầu bằng từ khoá xếp trước
export const findCategoriesByKeyword = async (keyword: string, limit: number) => {
  const words = getKeywordWords(keyword)
  if(words.length === 0) return []

  const { list } = await getSearchCategories()
  const regexList = words.map(word => new RegExp(`(?:^|[ -])${tolerantPattern(word)}`, "i"))
  const startRegex = new RegExp(`^${tolerantPattern(words[0])}`, "i")

  return list
    .filter(item => regexList.every(regex => regex.test(item.text)))
    .sort((a, b) => Number(startRegex.test(b.text)) - Number(startRegex.test(a.text)))
    .slice(0, limit)
}

// Thương hiệu khớp với từ khoá: có 1 từ của từ khoá đứng ở đầu tên thương hiệu
// Từ quá ngắn (dưới 3 ký tự) phải trùng nguyên 1 từ của tên thương hiệu
export const findBrandsByKeyword = async (keyword: string, limit: number) => {
  const words = getKeywordWords(keyword)
  if(words.length === 0) return []

  const brandList = await getSearchBrands()
  const regexList = words.map(word => {
    const pattern = tolerantPattern(word)
    return new RegExp(word.length >= 3 ? `(?:^|[ -])${pattern}` : `(?:^|[ -])${pattern}(?:$|[ -])`, "i")
  })

  return brandList
    .map(item => ({ ...item, matchCount: regexList.filter(regex => regex.test(item.text)).length }))
    .filter(item => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit)
    .map(item => item.name)
}

// ===== Sửa từ khoá khi không tìm thấy sản phẩm =====
// Gõ nhầm bàn phím (quên đổi tiếng Nga / tiếng Anh): "kfgif" => "лапша", "ыкшкфсрф" => "sriracha"
const keyboardEn = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./"
const keyboardRu = "ёйцукенгшщзхъфывапролджэячсмитьбю."

export const switchKeyboardLayout = (keyword: string): string | null => {
  const text = keyword.toLowerCase()
  const latinCount = (text.match(/[a-z]/g) || []).length
  const cyrillicCount = (text.match(/[а-яё]/g) || []).length
  if(latinCount === 0 && cyrillicCount === 0) return null

  const [from, to] = latinCount >= cyrillicCount ? [keyboardEn, keyboardRu] : [keyboardRu, keyboardEn]
  const isLetter = (char: string | undefined) => !!char && /[a-zа-яё]/.test(char)

  const chars = [...text]
  const result = chars.map((char, index) => {
    const position = from.indexOf(char)
    if(position === -1) return char
    // Dấu câu chỉ đổi khi nằm cạnh chữ cái (giữ nguyên số thập phân "0.5")
    if(!/[a-zа-яё]/.test(char) && !isLetter(chars[index - 1]) && !isLetter(chars[index + 1])) return char
    return to[position]
  }).join("")

  return result !== text ? result : null
}

// Khoảng cách chỉnh sửa giữa 2 từ (số ký tự phải thêm / bớt / thay / đổi chỗ 2 ký tự cạnh nhau)
// Vượt quá max thì dừng sớm và trả về max + 1
const editDistance = (a: string, b: string, max: number): number => {
  if(Math.abs(a.length - b.length) > max) return max + 1

  let previousRow2: number[] = []
  let previousRow: number[] = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previousRow[j] + 1, row[j - 1] + 1, previousRow[j - 1] + cost)
      if(i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]){
        value = Math.min(value, previousRow2[j - 2] + 1)
      }
      row[j] = value
      rowMin = Math.min(rowMin, value)
    }
    if(rowMin > max) return max + 1
    previousRow2 = previousRow
    previousRow = row
  }
  return previousRow[b.length]
}

// Từ vựng của cửa hàng: các từ trong tên sản phẩm, tên tiếng Nga, thương hiệu, tên danh mục
// - word: từ không dấu, chữ Latin để so sánh
// - display: từ gốc (chữ thường) để hiện cho khách, ví dụ "лапша"
// - count: số lần xuất hiện, 2 từ giống nhau như nhau thì chọn từ phổ biến hơn
type VocabularyWord = { word: string, display: string, count: number }

const getVocabulary = () => getCached("vocabulary", async () => {
  const [productList, categories] = await Promise.all([
    Product.find(productVisibleFind).select("name nameRu brand").lean(),
    getSearchCategories()
  ])

  const wordMap = new Map<string, VocabularyWord>()
  const addText = (text: any) => {
    for (const raw of `${text || ""}`.toLowerCase().split(/[\s,;:!?()"'«»\/\\|+&*–—-]+/)) {
      const display = raw.replace(/^[-.]+|[-.]+$/g, "")
      const word = normalizeText(display)
      // Bỏ từ quá ngắn, từ có số (75g, 0.5l)
      if(word.length < 3 || /[\d\s-]/.test(word)) continue

      const item = wordMap.get(word)
      if(item){
        item.count++
      }
      else {
        wordMap.set(word, { word: word, display: display, count: 1 })
      }
    }
  }

  for (const product of productList as any[]) {
    addText(product.name)
    addText(product.nameRu)
    addText(product.brand)
  }
  for (const category of categories.list) {
    addText(category.name)
    addText(category.nameRu)
  }

  return [...wordMap.values()]
})

// Sửa lỗi chính tả: mỗi từ không có trong từ vựng được thay bằng từ gần giống nhất (nếu đủ gần)
// - Từ 3-4 ký tự: sai tối đa 1 ký tự, 5-8 ký tự: 2 ký tự, dài hơn: 3 ký tự
// - Khách chưa gõ hết từ (khung gợi ý) thì so với phần đầu của từ, ví dụ "лапщ" => "лапша"
const correctTypos = (keyword: string, vocabulary: VocabularyWord[]): string | null => {
  let isChanged = false

  const wordList = keyword.toLowerCase().split(" ").filter(Boolean).map(raw => {
    const word = normalizeText(raw)
    if(word.length < 3 || /[\d\s]/.test(word)) return raw
    if(vocabulary.some(item => item.word.includes(word))) return raw

    const maxDistance = word.length <= 4 ? 1 : word.length <= 8 ? 2 : 3
    let best: { distance: number, item: VocabularyWord } | null = null
    for (const item of vocabulary) {
      let distance = editDistance(word, item.word, maxDistance)
      if(distance > maxDistance && word.length >= 4 && item.word.length > word.length){
        // Khớp phần đầu của từ: cộng thêm 0,5 để từ khớp nguyên từ được ưu tiên
        distance = editDistance(word, item.word.slice(0, word.length), maxDistance) + 0.5
      }
      if(distance > maxDistance) continue

      if(!best || distance < best.distance || (distance === best.distance && item.count > best.item.count)){
        best = { distance: distance, item: item }
      }
    }

    if(!best) return raw
    isChanged = true
    return best.item.display
  })

  return isChanged ? wordList.join(" ") : null
}

// Từ khoá dùng để tìm sản phẩm
// - Từ khoá của khách có sản phẩm thì giữ nguyên
// - Không có sản phẩm nào thì lần lượt thử: đổi bàn phím, sửa lỗi chính tả, đổi bàn phím rồi sửa lỗi chính tả
//   Cách nào có sản phẩm thì dùng (corrected: true, trang kết quả hiện "Показаны результаты по запросу «...»")
//   - reason: "layout" là gõ nhầm bàn phím (kfgif => лапша), "typo" là sai chính tả (лапшв => лапша)
// Chỉ đếm sản phẩm theo từ khoá (không tính bộ lọc giá, xuất xứ,...), vì sửa từ khoá là sửa chữ khách gõ
export const resolveSearchKeyword = async (keyword: string) => {
  const countByKeyword = (text: string) => Product.countDocuments(addKeywordFind({ ...productVisibleFind }, text))

  const total = await countByKeyword(keyword)
  if(total > 0){
    return { keyword: keyword, original: keyword, corrected: false, reason: "", total: total }
  }

  const candidateList: { keyword: string, reason: string }[] = []
  const switched = switchKeyboardLayout(keyword)
  if(switched) candidateList.push({ keyword: switched, reason: "layout" })

  const vocabulary = await getVocabulary()
  const fixed = correctTypos(keyword, vocabulary)
  if(fixed) candidateList.push({ keyword: fixed, reason: "typo" })
  if(switched){
    const switchedFixed = correctTypos(switched, vocabulary)
    if(switchedFixed) candidateList.push({ keyword: switchedFixed, reason: "layout" })
  }

  const checkedList: string[] = []
  for (const candidate of candidateList) {
    if(checkedList.includes(candidate.keyword)) continue
    checkedList.push(candidate.keyword)

    const candidateTotal = await countByKeyword(candidate.keyword)
    if(candidateTotal > 0){
      return { keyword: candidate.keyword, original: keyword, corrected: true, reason: candidate.reason, total: candidateTotal }
    }
  }

  return { keyword: keyword, original: keyword, corrected: false, reason: "", total: 0 }
}

// ===== Mã vạch =====
// Khách quét / gõ đúng mã vạch của 1 sản phẩm thì mở luôn trang sản phẩm đó
// Mã UPC-A (12 số, hàng Mỹ) và EAN-13 bắt đầu bằng số 0 là cùng 1 mã
export const findProductByBarcode = async (keyword: string) => {
  const code = keyword.replace(/\s+/g, "")
  if(!/^\d{8,14}$/.test(code)) return null

  const codeList = [code]
  if(code.length === 12) codeList.push(`0${code}`)
  if(code.length === 13 && code.startsWith("0")) codeList.push(code.slice(1))

  const productList = await Product
    .find({
      ...productVisibleFind,
      barcode: { $in: codeList }
    })
    .limit(2)

  return productList.length === 1 ? productList[0] : null
}

// ===== Từ khoá khách hay tìm =====
// Lưu từ khoá khách vừa tìm (không chờ, lỗi thì chỉ ghi ra terminal, không ảnh hưởng trang kết quả)
export const logSearchKeyword = (keyword: string, lang: string, resultCount: number) => {
  const text = keyword.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60)
  if(text.length < 2) return

  SearchQuery.updateOne(
    {
      normalized: normalizeText(text) || text,
      lang: lang
    },
    {
      $set: {
        keyword: text,
        resultCount: resultCount,
        lastSearchedAt: new Date()
      },
      $inc: {
        count: 1
      }
    },
    {
      upsert: true
    }
  ).catch(error => console.log("Lỗi lưu từ khoá tìm kiếm:", error))
}

// Điều kiện từ khoá được hiện cho khách: có sản phẩm, được tìm đủ số lần
const popularQueryFind = (lang: string) => ({
  lang: lang,
  resultCount: { $gt: 0 },
  count: { $gte: clientSearchPopularMinCount }
})

// "Часто ищут": từ khoá được tìm nhiều nhất trong clientSearchPopularDays ngày gần đây
export const getPopularQueries = (lang: string): Promise<string[]> => getCached(`popular-${lang}`, async () => {
  const list = await SearchQuery
    .find({
      ...popularQueryFind(lang),
      lastSearchedAt: { $gte: moment().subtract(clientSearchPopularDays, "days").toDate() }
    })
    .sort({
      count: -1,
      lastSearchedAt: -1
    })
    .limit(clientSearchPopularLimit)
    .select("keyword")

  return list.map(item => `${item.keyword}`)
})

// Gợi ý từ khoá khi khách đang gõ: từ khoá hay tìm có 1 từ bắt đầu bằng chữ khách đã gõ
// Ví dụ gõ "лапша о" => "лапша острая"
export const findQueriesByKeyword = async (keyword: string, lang: string, limit: number): Promise<string[]> => {
  const words = getKeywordWords(keyword)
  if(words.length === 0) return []

  const list = await SearchQuery
    .find({
      ...popularQueryFind(lang),
      normalized: {
        $regex: new RegExp(`(?:^|[ -])${words.map(tolerantPattern).join("[ -]")}`, "i"),
        $ne: normalizeText(keyword)
      }
    })
    .sort({
      count: -1
    })
    .limit(limit)
    .select("keyword")

  return list.map(item => `${item.keyword}`)
}

// Xoá từ khoá không ai tìm quá clientSearchLogRetentionDays ngày
export const deleteOldSearchQueries = async () => {
  try {
    const result = await SearchQuery.deleteMany({
      lastSearchedAt: {
        $lt: moment().subtract(clientSearchLogRetentionDays, "days").toDate()
      }
    })

    if(result.deletedCount > 0){
      console.log(`Đã xoá ${result.deletedCount} từ khoá tìm kiếm không ai tìm quá ${clientSearchLogRetentionDays} ngày`)
    }
  } catch (error) {
    console.log("Lỗi xoá từ khoá tìm kiếm cũ:", error)
  }
}

// Tự động xoá từ khoá cũ: chạy ngay khi khởi động server, sau đó mỗi ngày chạy lại 1 lần
export const scheduleDeleteOldSearchQueries = () => {
  deleteOldSearchQueries()
  setInterval(deleteOldSearchQueries, 24 * 60 * 60 * 1000)
}
