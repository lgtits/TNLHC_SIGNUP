import type { FieldDef } from 'src/types/signup';

/** 台灣身分證字號首字母對應數值 */
const ID_LETTER_MAP: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18,
  K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27,
  U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
};

/**
 * 台灣身分證字號驗證（含檢查碼）。
 * 第 2 碼 1/2 為國民，8/9 為外籍人士統一證號。
 */
export function isValidTwId(value: string): boolean {
  const id = value.trim().toUpperCase();
  if (!/^[A-Z][1289]\d{8}$/.test(id)) return false;

  const mapped = ID_LETTER_MAP[id[0] as string];
  if (mapped === undefined) return false;

  let sum = Math.floor(mapped / 10) + (mapped % 10) * 9;
  for (let i = 1; i <= 8; i += 1) {
    sum += Number(id[i]) * (9 - i);
  }
  sum += Number(id[9]);

  return sum % 10 === 0;
}

export function isValidPhone(value: string): boolean {
  return /^09\d{8}$/.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** 只接受 yyyy-mm-dd，且不能是未來日期 */
export function isValidBirthday(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() > Date.now()) return false;
  return d.getFullYear() >= 1900;
}

/** 依 FieldDef 產生 Quasar 用的 rules 陣列 */
export function buildRules(field: FieldDef): ((v: string) => true | string)[] {
  const rules: ((v: string) => true | string)[] = [];

  if (field.required) {
    rules.push((v) => (!!v && v.trim().length > 0) || `請填寫${field.label}`);
  }

  // 非必填且留空時，一律略過後續格式檢查
  const skipIfEmpty =
    (check: (v: string) => true | string) =>
    (v: string): true | string =>
      !v || v.trim().length === 0 ? true : check(v);

  switch (field.type) {
    case 'tel':
      rules.push(skipIfEmpty((v) => isValidPhone(v) || '請輸入 09 開頭的 10 碼手機號碼'));
      break;
    case 'email':
      rules.push(skipIfEmpty((v) => isValidEmail(v) || '電子郵件格式不正確'));
      break;
    case 'twid':
      rules.push(skipIfEmpty((v) => isValidTwId(v) || '身分證字號格式或檢查碼不正確'));
      break;
    case 'date':
      rules.push(skipIfEmpty((v) => isValidBirthday(v) || '請選擇正確的日期'));
      break;
    case 'text':
    case 'textarea':
      if (field.required) {
        rules.push(skipIfEmpty((v) => v.trim().length >= 2 || `${field.label}至少 2 個字`));
      }
      break;
    default:
      break;
  }

  return rules;
}

/** 以某個基準日計算實足年齡，用來判斷「6 歲以下免費」 */
export function ageAt(birthday: string, atDate: string): number | null {
  if (!isValidBirthday(birthday)) return null;
  const b = new Date(`${birthday}T00:00:00`);
  const at = new Date(`${atDate}T00:00:00`);
  if (Number.isNaN(at.getTime())) return null;

  let age = at.getFullYear() - b.getFullYear();
  const monthDiff = at.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < b.getDate())) {
    age -= 1;
  }
  return age;
}
