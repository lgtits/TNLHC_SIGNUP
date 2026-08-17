/**
 * 報名系統型別。
 *
 * 設計重點：表單「長什麼樣」由活動資料決定（schema driven），
 * 不要為每個活動寫一支 .vue。新活動只要新增一筆 JSON。
 */

// ── 欄位層 ────────────────────────────────────────────────

/**
 * 欄位型別。每多一種就要在 DynamicField.vue 加對應渲染、
 * 在 validators.ts 加對應驗證，其餘活動資料都能直接複用。
 */
export type FieldType =
  | 'text'
  | 'tel'
  | 'email'
  | 'date'
  | 'twid' // 台灣身分證字號（含檢查碼驗證）
  | 'number'
  | 'select'
  | 'textarea';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  /** 欄位下方的補充說明 */
  hint?: string;
  maxLength?: number;
  /** type = 'select' 時使用 */
  options?: FieldOption[];
}

/** 一份填好的欄位資料 */
export type FieldValues = Record<string, string>;

// ── 住宿層 ────────────────────────────────────────────────

/**
 * 訂房單位：
 *   bed  → 一次訂「一個床位」（通鋪）。訂幾個床位就填幾個人的資料。
 *   room → 一次訂「整間」。費用算整間，但仍需填實際入住者的資料。
 */
export type BookingUnit = 'bed' | 'room';

export interface RoomType {
  id: string;
  name: string;
  /** 床位配置說明，例如「1 雙人床 + 2 單人床」 */
  bedInfo: string;
  description?: string;
  bookingUnit: BookingUnit;
  /** 每間可住人數；bookingUnit = 'bed' 時代表總床位數 */
  capacity: number;
  /** 剩餘量：bed → 剩幾個床位，room → 剩幾間 */
  available: number;
  /** 每人費用（room 模式下，整間 = pricePerPerson × capacity） */
  pricePerPerson: number;
  /** 尊榮優先選擇 */
  priority?: boolean;
  note?: string;
}

// ── 加購層（餐費、保險…）────────────────────────────────

export interface AddonDef {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** 計價單位：per_person = 每位參加者，per_booking = 每筆報名 */
  per: 'per_person' | 'per_booking';
  /** false 表示必收（例如保險），UI 上不給取消 */
  optional: boolean;
  /** 預設是否勾選 */
  defaultOn: boolean;
  /**
   * 未滿這個歲數免費（例如 6 = 6 歲以下免費）。
   * 需要搭配 ageFieldKey 指向參加者的生日欄位。
   */
  freeUnderAge?: number;
  ageFieldKey?: string;
}

// ── 活動層 ────────────────────────────────────────────────

export type EventStatus = 'open' | 'almost_full' | 'full' | 'closed';

/** 繳費／轉帳資訊 */
export interface PaymentInfo {
  bankName: string;
  bankCode: string;
  account: string;
  accountName: string;
  /** 匯款備註要怎麼填，例如「姓名（退修會）」 */
  noteFormat: string;
  /** 報名後幾天內要完成繳費 */
  dueDays: number;
}

/** 一個活動的報名表單定義 */
export interface RegistrationSchema {
  /** 報名聯絡人欄位，整筆報名填一次 */
  contactFields: FieldDef[];
  /** 每位參加者都要填的欄位；空陣列代表不需要逐人填寫 */
  participantFields: FieldDef[];
  /** 是否需要選房型 */
  requiresAccommodation: boolean;
  roomTypes: RoomType[];
  addons: AddonDef[];
  /** 報名截止日 ISO date */
  deadline: string;
  /** 表單上要顯示的注意事項 */
  notices: string[];
  /** 繳費資訊；免費活動可省略 */
  payment?: PaymentInfo;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  /** 活動照片檔名（放在 public/ 底下）。留空則顯示淺灰底色塊 */
  image?: string;
  coverFrom: string;
  coverTo: string;
  icon: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  /** 每人基本報名費，沒有就填 0 */
  basePrice: number;
  tags: string[];
  status: EventStatus;
  registration: RegistrationSchema;
}

// ── 報名資料 ──────────────────────────────────────────────

export interface SignupDraft {
  eventId: string;
  contact: FieldValues;
  roomTypeId: string | null;
  /** bed 模式 = 訂幾個床位；room 模式 = 訂幾間 */
  units: number;
  /** 實際要填資料的參加者 */
  participants: FieldValues[];
  /** addonId → 是否參加 */
  addons: Record<string, boolean>;
}

export interface PriceBreakdownItem {
  label: string;
  note?: string;
  amount: number;
}

export interface SignupResult {
  orderNo: string;
  createdAt: string;
  event: EventItem;
  roomType: RoomType | null;
  draft: SignupDraft;
  breakdown: PriceBreakdownItem[];
  total: number;
}
