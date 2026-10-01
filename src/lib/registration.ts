import type { EventItem, EventStatus, RegistrationSchema } from 'src/types/signup';

/** 報名期間所處的階段 */
export type RegistrationPhase = 'upcoming' | 'open' | 'ended';

/**
 * 依報名開始／結束日判斷目前階段。日期以使用者本地時間解讀：
 * 開始日 00:00 起開放，結束日當天 23:59:59 之後截止。
 */
export function registrationPhase(
  reg: Pick<RegistrationSchema, 'startDate' | 'endDate'>,
  now = Date.now(),
): RegistrationPhase {
  if (reg.startDate) {
    const start = new Date(`${reg.startDate}T00:00:00`).getTime();
    if (!Number.isNaN(start) && now < start) return 'upcoming';
  }
  if (reg.endDate) {
    const end = new Date(`${reg.endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    if (!Number.isNaN(end.getTime()) && now >= end.getTime()) return 'ended';
  }
  return 'open';
}

/** 活動實際狀態：報名期間外一律蓋過 JSON 裡寫的 status */
export function effectiveStatus(event: EventItem, now = Date.now()): EventStatus {
  const phase = registrationPhase(event.registration, now);
  if (phase === 'ended') return 'closed';
  if (phase === 'upcoming') return 'upcoming';
  return event.status;
}

/** 這個狀態還能不能報名 */
export function canSignup(status: EventStatus): boolean {
  return status === 'open' || status === 'almost_full';
}
