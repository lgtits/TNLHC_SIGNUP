import { apiGet, apiPost } from './api';
import { loadMockEventList } from 'src/lib/MockData';
import { IS_DEMO_MODE } from 'src/stores/config-store';
import { calcBreakdown, sumBreakdown } from 'src/lib/pricing';
import type { EventItem, SignupDraft, SignupResult } from 'src/types/signup';

export async function fetchEventList(): Promise<EventItem[]> {
  if (IS_DEMO_MODE) return loadMockEventList();
  return apiGet<EventItem[]>('/events');
}

export async function fetchEventById(id: string): Promise<EventItem | null> {
  if (IS_DEMO_MODE) {
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

export async function submitSignup(draft: SignupDraft): Promise<SignupResult> {
  if (!IS_DEMO_MODE) {
    return apiPost<SignupResult>('/signups', draft);
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
