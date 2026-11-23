import type { LegalContext } from "../legal.helper"

// Trang «Правовая информация» (/legal): thông tin người bán + danh sách văn bản
// (Т-Банк kiểm tra website có đủ thông tin người bán và các văn bản này khi duyệt Интернет-эквайринг)
export const legalIndex = (c: LegalContext): string => `
<h2>Сведения о продавце</h2>
${c.sellerDetails}

<h2>Документы</h2>
<ul>
  <li>${c.docLink("privacy", "Политика обработки персональных данных")}</li>
  <li>${c.docLink("consent", "Согласие на обработку персональных данных")}</li>
  <li>${c.docLink("offer", "Публичная оферта (договор розничной купли-продажи)")}</li>
  <li>${c.docLink("delivery", "Доставка и оплата")}</li>
  <li>${c.docLink("returns", "Возврат и обмен")}</li>
</ul>
`
