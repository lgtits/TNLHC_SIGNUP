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

/** 住宿費：bed 依床位計，room 依整間計 */
export function accommodationAmount(room: RoomType, units: number): number {
  if (room.bookingUnit === 'bed') {
    return room.pricePerPerson * units;
  }
  return room.pricePerPerson * room.capacity * units;
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
    const amount = accommodationAmount(room, draft.units);
    items.push({
      label: `住宿費－${room.name}`,
      note:
        room.bookingUnit === 'bed'
          ? `${draft.units} 個床位 × NT$ ${room.pricePerPerson.toLocaleString('zh-TW')}`
          : `${draft.units} 間 × ${room.capacity} 床位 × NT$ ${room.pricePerPerson.toLocaleString('zh-TW')}`,
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
          ? `${count} 人計費（${exemptCount} 人免費） × NT$ ${addon.price.toLocaleString('zh-TW')}`
          : `${count} ${addon.per === 'per_person' ? '人' : '筆'} × NT$ ${addon.price.toLocaleString('zh-TW')}`,
      amount: addon.price * count,
    });
  }

  return items;
}

export function sumBreakdown(items: PriceBreakdownItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
