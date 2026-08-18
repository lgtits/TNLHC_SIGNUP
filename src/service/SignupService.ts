import { apiGet } from './api';
import { loadMockEventList } from 'src/lib/MockData';
import { API_BASE_URL, IS_DEMO_MODE, SHEET_API_URL } from 'src/stores/config-store';
import { bookedUnits, calcBreakdown, sumBreakdown } from 'src/lib/pricing';
import type { EventItem, SignupDraft, SignupResult } from 'src/types/signup';

/**
 * 活動內容屬於靜態設定，來源是 public/mockData/mockEventList.json。
 *
 * 注意這裡不看 IS_DEMO_MODE —— Apps Script 只負責報名寫入與名額查詢，
 * 並不提供活動清單。只有真的架了 REST API（設了 API_BASE_URL）才改走 API，
 * 否則一律讀本地 JSON。
 */
const useEventApi = () => !IS_DEMO_MODE && !!API_BASE_URL;

export async function fetchEventList(): Promise<EventItem[]> {
  if (!useEventApi()) return loadMockEventList();
  return apiGet<EventItem[]>('/events');
}

export async function fetchEventById(id: string): Promise<EventItem | null> {
  if (!useEventApi()) {
    const list = await loadMockEventList();
    return list.find((e) => e.id === id) ?? null;
  }
  return apiGet<EventItem>(`/events/${id}`);
}

function makeOrderNo(): string {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('');
  return `TN${ymd}-${Math.floor(Math.random() * 9000) + 1000}`;
}

interface SheetResponse {
  ok: boolean;
  error?: string;
  orderNo?: string;
  createdAt?: string;
}

/**
 * 送到 Apps Script Web App。
 *
 * 刻意用 text/plain：Apps Script 不回應 CORS preflight（OPTIONS），
 * 用 application/json 會觸發 preflight 而失敗。text/plain 屬於
 * simple request，瀏覽器直接送出。Apps Script 端照樣讀得到 JSON 字串。
 */
async function postToSheet(payload: unknown): Promise<SheetResponse> {
  const res = await fetch(SHEET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow', // Apps Script 會轉址到 googleusercontent.com
  });

  if (!res.ok) throw new Error(`連線失敗（${res.status}），請稍後再試。`);
  return (await res.json()) as SheetResponse;
}

/** 查目前剩餘名額，回傳 roomTypeId → 剩餘量 */
export async function fetchAvailability(): Promise<Record<string, number>> {
  if (IS_DEMO_MODE || !SHEET_API_URL) return {};
  const res = await fetch(SHEET_API_URL);
  if (!res.ok) return {};
  const data = (await res.json()) as { ok: boolean; availability?: Record<string, number> };
  return data.availability ?? {};
}

export async function submitSignup(draft: SignupDraft): Promise<SignupResult> {
  if (!IS_DEMO_MODE) {
    if (!SHEET_API_URL) {
      throw new Error('尚未設定 SHEET_API_URL，請檢查 config.json。');
    }

    const event = await fetchEventById(draft.eventId);
    if (!event) throw new Error('找不到這個活動，請回上一頁重新選擇。');

    const room =
      event.registration.roomTypes.find((r) => r.id === draft.roomTypeId) ?? null;
    const breakdown = calcBreakdown(event, draft);
    const total = sumBreakdown(breakdown);

    // 補齊加購狀態：使用者沒動過的項目在 draft 裡可能缺鍵，
    // 這裡依 schema 的 defaultOn 解析成明確的 true/false 再送出，
    // 否則 Sheet 上該打勾的欄位會是空的。
    const addons = Object.fromEntries(
      event.registration.addons.map((a) => [a.id, draft.addons[a.id] ?? a.defaultOn]),
    );

    // 後端是以「名額單位」扣量（通鋪算床位、房間算間數），
    // 而 draft 存的是入住人數，所以送出前換算成 units 再帶過去。
    const units = room ? bookedUnits(room, draft.guests) : 0;

    // 金額前端算、後端存；名額則完全由後端判定（前端擋不住併發）
    const res = await postToSheet({ ...draft, addons, units, total });
    if (!res.ok) throw new Error(res.error ?? '報名失敗，請稍後再試。');

    return {
      orderNo: res.orderNo ?? '',
      createdAt: res.createdAt ?? new Date().toISOString(),
      event,
      roomType: room,
      draft: JSON.parse(JSON.stringify(draft)) as SignupDraft,
      breakdown,
      total,
    };
  }

  // demo：模擬後端處理時間，讓送出中的 loading 狀態看得出來
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const event = await fetchEventById(draft.eventId);
  if (!event) throw new Error('找不到這個活動，請回上一頁重新選擇。');

  const room =
    event.registration.roomTypes.find((r) => r.id === draft.roomTypeId) ?? null;
  if (event.registration.requiresAccommodation && !room) {
    throw new Error('請先選擇房型。');
  }

  const breakdown = calcBreakdown(event, draft);

  return {
    orderNo: makeOrderNo(),
    createdAt: new Date().toISOString(),
    event,
    roomType: room,
    // 不能用 structuredClone：傳進來的是 Vue 的 reactive Proxy，會丟 DataCloneError。
    // draft 全是 JSON 安全的純資料，走 JSON 深拷貝最單純。
    draft: JSON.parse(JSON.stringify(draft)) as SignupDraft,
    breakdown,
    total: sumBreakdown(breakdown),
  };
}
