import type {
  AddonDef,
  EventItem,
  PriceBreakdownItem,
  RoomType,
  SignupDraft,
} from 'src/types/signup';
import { ageAt } from './validators';

/** 這筆報名實際要收費的人數 */
export function participantCount(draft: SignupDraft): number {
  return Math.max(1, draft.participants.length);
}

/**
 * 住宿費：
 *   bed  → 訂幾個床位算幾個
 *   room → 一律整間計價（可以少住人，不能多住人，少住不減價）
 */
export function accommodationAmount(room: RoomType, guests: number): number {
  if (room.bookingUnit === 'bed') {
    return room.price * guests;
  }
  return room.price;
}

/**
 * 這筆報名會佔掉的名額數量，也是送給後端扣量用的數字：
 *   bed  → 床位數（等於人數）
 *   room → 間數，一次只訂一間
 */
export function bookedUnits(room: RoomType, guests: number): number {
  return room.bookingUnit === 'bed' ? guests : 1;
}

/**
 * 剛選到這個房型時的預設人數：
 *   room → 該房間本來就設計住幾人（住滿），使用者要少住再自己往下調
 *   bed  → 一個床位起算
 */
export function defaultGuests(room: RoomType): number {
  return room.bookingUnit === 'bed' ? 1 : Math.max(1, maxGuests(room));
}

/** 這個房型一次最多能住幾人：通鋪看剩餘床位，房間看該房間的床位數 */
export function maxGuests(room: RoomType): number {
  if (room.available <= 0) return 0;
  return room.bookingUnit === 'bed'
    ? Math.min(room.available, room.capacity)
    : room.capacity;
}

/** 某個 addon 要收費的人數（扣掉未滿指定歲數的） */
export function chargeableCount(
  addon: AddonDef,
  draft: SignupDraft,
  eventStartDate: string,
): number {
  if (addon.per === 'per_booking') return 1;

  const total = participantCount(draft);
  if (!addon.freeUnderAge || !addon.ageFieldKey) return total;

  const key = addon.ageFieldKey;
  const exempt = draft.participants.filter((p) => {
    const age = ageAt(p[key] ?? '', eventStartDate);
    return age !== null && age < addon.freeUnderAge!;
  }).length;

  return Math.max(0, total - exempt);
}

/**
 * 算出費用明細。
 * 之後要加「教會補助一半」「早鳥」之類的規則，都在這支函式裡加一列，
 * UI 與 service 都不用改。
 */
export function calcBreakdown(
  event: EventItem,
  draft: SignupDraft,
): PriceBreakdownItem[] {
  const items: PriceBreakdownItem[] = [];
  const people = participantCount(draft);

  if (event.basePrice > 0) {
    items.push({
      label: '活動報名費',
      note: `${people} 人 × NT$ ${event.basePrice.toLocaleString('zh-TW')}`,
      amount: event.basePrice * people,
    });
  }

  const room = event.registration.roomTypes.find((r) => r.id === draft.roomTypeId);
  if (room) {
    const amount = accommodationAmount(room, draft.guests);
    items.push({
      label: `住宿費－${room.name}`,
      note:
        room.bookingUnit === 'bed'
          ? `補助後 ${draft.guests} 個床位 × NT$ ${room.price.toLocaleString('zh-TW')}`
          : `補助後整間 1 間（${people} 位入住・最多 ${room.capacity} 位）`,
      amount,
    });
  }

  for (const addon of event.registration.addons) {
    const enabled = draft.addons[addon.id] ?? addon.defaultOn;
    if (!enabled) continue;

    const count = chargeableCount(addon, draft, event.startDate);
    if (count === 0) {
      items.push({
        label: addon.name,
        note: '全員符合免費資格',
        amount: 0,
      });
      continue;
    }

    const exemptCount = addon.per === 'per_person' ? people - count : 0;
    items.push({
      label: addon.name,
      note:
        exemptCount > 0
          ? `補助後 ${count} 人計費（${exemptCount} 人免費） × NT$ ${addon.price.toLocaleString('zh-TW')}`
          : `補助後 ${count} ${addon.per === 'per_person' ? '人' : '筆'} × NT$ ${addon.price.toLocaleString('zh-TW')}`,
      amount: addon.price * count,
    });
  }

  return items;
}

export function sumBreakdown(items: PriceBreakdownItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
