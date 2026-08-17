import { apiGet, apiPost } from './api';
import { loadMockEventList } from 'src/lib/MockData';
import { IS_DEMO_MODE } from 'src/stores/config-store';
import type {
  EventItem,
  PriceBreakdownItem,
  SignupForm,
  SignupResult,
  RoomType,
} from 'src/types/signup';

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

/** 是否還在早鳥期間 */
function isEarlyBird(event: EventItem): boolean {
  if (!event.earlyBirdDiscount || !event.earlyBirdDeadline) return false;
  const deadline = new Date(`${event.earlyBirdDeadline}T23:59:59`).getTime();
  if (Number.isNaN(deadline)) return false;
  return Date.now() <= deadline;
}

/** 價格試算：本來會在後端算，demo 先在前端算一份一樣的邏輯 */
export function calcPrice(event: EventItem, roomType: RoomType): PriceBreakdownItem[] {
  const items: PriceBreakdownItem[] = [
    {
      label: '活動報名費',
      note: '含講義、保險與全程餐食',
      amount: event.basePrice,
    },
    {
      label: `住宿費－${roomType.name}`,
      note: roomType.price === 0 ? '未選擇住宿' : `${roomType.capacity} 人房 / 每人`,
      amount: roomType.price,
    },
  ];

  if (isEarlyBird(event)) {
    items.push({
      label: '早鳥優惠',
      note: `${event.earlyBirdDeadline} 前完成報名`,
      amount: -event.earlyBirdDiscount,
    });
  }

  return items;
}

function makeOrderNo(): string {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
  ].join('');
  const seq = `${Math.floor(Math.random() * 9000) + 1000}`;
  return `TN${ymd}-${seq}`;
}

export async function submitSignup(form: SignupForm): Promise<SignupResult> {
  if (!IS_DEMO_MODE) {
    return apiPost<SignupResult>('/signups', form);
  }

  const event = await fetchEventById(form.eventId);
  if (!event) throw new Error('找不到這個活動，請回上一頁重新選擇。');

  const roomType = event.roomTypes.find((r) => r.id === form.roomTypeId);
  if (!roomType) throw new Error('請先選擇房型。');

  const breakdown = calcPrice(event, roomType);
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return {
    orderNo: makeOrderNo(),
    createdAt: new Date().toISOString(),
    event,
    roomType,
    form: { ...form },
    breakdown,
    total,
  };
}
