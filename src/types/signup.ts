/** 活動報名相關型別 */

/** 活動開放狀態 */
export type EventStatus = 'open' | 'almost_full' | 'full' | 'closed';

/** 房型 */
export interface RoomType {
  id: string;
  name: string;
  description: string;
  /** 每間可住人數 */
  capacity: number;
  /** 房型費用（每人） */
  price: number;
  /** 剩餘名額 */
  quota: number;
}

/** 活動 */
export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  /** 卡片封面漸層起訖色 */
  coverFrom: string;
  coverTo: string;
  /** 卡片封面 material icon 名稱 */
  icon: string;
  /** ISO date, e.g. 2026-09-12 */
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  /** 每人基本報名費（不含房型） */
  basePrice: number;
  /** 早鳥折扣金額（每人），0 表示沒有早鳥 */
  earlyBirdDiscount: number;
  /** 早鳥截止日 ISO date */
  earlyBirdDeadline: string;
  tags: string[];
  status: EventStatus;
  roomTypes: RoomType[];
}

/** 報名表單內容 */
export interface SignupForm {
  eventId: string;
  name: string;
  phone: string;
  roomTypeId: string | null;
}

/** 費用明細單列 */
export interface PriceBreakdownItem {
  label: string;
  note?: string;
  amount: number;
}

/** 送出報名後的結果（含試算價格） */
export interface SignupResult {
  orderNo: string;
  createdAt: string;
  event: EventItem;
  roomType: RoomType;
  form: SignupForm;
  breakdown: PriceBreakdownItem[];
  total: number;
}
