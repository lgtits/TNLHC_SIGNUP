/** 共用的顯示格式工具 */

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** 1234 → NT$ 1,234 */
export function formatPrice(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}NT$ ${Math.abs(amount).toLocaleString('zh-TW')}`;
}

/** '2026-09-25' → '9/25（五）' */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY[d.getDay()]}）`;
}

/** '2026-09-25' + '2026-09-27' → '2026/9/25（五）– 9/27（日）' */
export function formatDateRange(start: string, end: string): string {
  if (!start) return '';
  const startDate = new Date(`${start}T00:00:00`);
  const year = Number.isNaN(startDate.getTime()) ? '' : `${startDate.getFullYear()}/`;
  if (!end || end === start) return `${year}${formatDate(start)}`;
  return `${year}${formatDate(start)} – ${formatDate(end)}`;
}

/** '2026-09-25' + '2026-09-27' → 3（天數） */
export function countDays(start: string, end: string): number {
  if (!start) return 0;
  if (!end || end === start) return 1;
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 1;
  return Math.round((e - s) / 86_400_000) + 1;
}

/** 遮住電話中間三碼：0912345678 → 0912***678 */
export function maskPhone(phone: string): string {
  if (phone.length < 10) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(7)}`;
}
