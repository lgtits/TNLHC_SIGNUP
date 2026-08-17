/**
 * 世界之光聖教會 報名系統 — Google Sheet 後端
 *
 * 部署方式：
 *   1. 開一個新的 Google 試算表，選 擴充功能 → Apps Script
 *   2. 把這份檔案內容貼進去，改下面的 ROOMS 設定
 *   3. 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *        執行身分：我
 *        access：任何人
 *   4. 複製產生的網址，貼到 public/config.json 的 SHEET_API_URL
 *      並把 IS_DEMO_MODE 改成 false
 *
 * 重新部署時要選「管理部署作業 → 編輯 → 版本：新版本」，
 * 否則網址指向的還是舊程式碼。
 */

// ── 設定 ────────────────────────────────────────────────
// 房型名額的唯一真實來源。前端 JSON 只負責顯示，實際扣量以這裡為準。
var ROOMS = {
  'room-tongpu': { unit: 'bed', capacity: 20, name: '通鋪' },
  'room-301-302': { unit: 'room', capacity: 4, units: 2, name: '301、302 號房' },
  'room-303': { unit: 'room', capacity: 6, units: 1, name: '303 號房' },
  'room-304-306': { unit: 'room', capacity: 5, units: 3, name: '304、305、306 號房' },
  'room-307': { unit: 'room', capacity: 4, units: 1, name: '307 號房' },
  'room-308': { unit: 'room', capacity: 2, units: 1, name: '308 號房' },
  'room-309': { unit: 'room', capacity: 5, units: 1, name: '309 號房' },
  'room-310-313': { unit: 'room', capacity: 4, units: 4, name: '310、311、312、313 號房' },
};

// 聯絡人要獨立成欄的欄位（key 對應前端 contactFields 的 key）
var CONTACT_COLUMNS = [{ key: 'email', label: '聯絡人 Email' }];

// 加購項目各給一欄，有選就打勾，比塞一包 JSON 好讀也好篩選
var ADDON_COLUMNS = [
  { id: 'addon-meals', label: '用餐' },
  { id: 'addon-insurance', label: '保險' },
];

var BOOKING_SHEET = 'bookings';
var PARTICIPANT_SHEET = 'participants';

// ── 對外入口 ────────────────────────────────────────────

/**
 * 手動執行一次即可：建立兩張工作表與標題列。
 * 在編輯器上方的函式下拉選單選 setup 後按執行。
 */
function setup() {
  ensureSheets();
  SpreadsheetApp.getActiveSpreadsheet().toast('bookings / participants 已就緒', '初始化完成');
}

/** 兩張表都先建好，管理者一開始就看得到完整結構 */
function ensureSheets() {
  getSheet(BOOKING_SHEET);
  getSheet(PARTICIPANT_SHEET);
}

/**
 * 手動執行一次：鎖住兩張工作表，只留擁有者可編輯。
 *
 * 這只擋得住「有編輯權」的協作者誤改；真正該做的是把同工設為「檢視者」。
 * doPost 以擁有者身分執行（部署時選 執行身分：我），所以不受這個保護影響。
 *
 * 想讓財務同工能改繳費狀態的話，把 UNLOCKED_COLUMN 設成該欄的標題，
 * 那一欄會保持可編輯，其餘欄位仍然鎖住。
 */
var UNLOCKED_COLUMN = ''; // 例如設成 '繳費狀態'

function protectSheets() {
  var me = Session.getEffectiveUser();

  [BOOKING_SHEET, PARTICIPANT_SHEET].forEach(function (name) {
    var sheet = getSheet(name);

    // 先清掉舊的保護，避免重複執行時疊加一堆設定
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) {
      if (p.canEdit()) p.remove();
    });

    var protection = sheet.protect().setDescription(name + '：資料由報名系統寫入，請勿手動修改');

    // 移除所有其他編輯者，只留擁有者
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
    protection.addEditor(me);

    // 保留一欄給人工註記（例如繳費狀態）
    if (UNLOCKED_COLUMN) {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var col = headers.indexOf(UNLOCKED_COLUMN) + 1;
      if (col > 0) {
        protection.setUnprotectedRanges([sheet.getRange(2, col, sheet.getMaxRows() - 1, 1)]);
      }
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('兩張工作表已鎖定', '保護設定完成');
}

/** 查目前剩餘名額 */
function doGet() {
  try {
    ensureSheets();
    return json({ ok: true, availability: getAvailability() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 送出報名 */
function doPost(e) {
  var lock = LockService.getScriptLock();

  // 拿不到鎖就直接回錯，不要硬闖 —— 硬闖等於放棄併發保護
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json({ ok: false, error: '系統忙碌中，請稍後再送出一次。' });
  }

  try {
    ensureSheets();
    var draft = JSON.parse(e.postData.contents);
    return json(createBooking(draft));
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    // flush 確保寫入真的落地，再放鎖給下一個人
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// ── 核心邏輯 ────────────────────────────────────────────

/**
 * 剩餘名額用「現數」算，不存計數器。
 * 這樣同工手動刪掉一列，就等於釋放一個名額，語意剛好正確。
 */
function getAvailability() {
  var rows = getSheet(BOOKING_SHEET).getDataRange().getValues();
  var used = {};

  // 第 0 列是標題，從 1 開始
  for (var i = 1; i < rows.length; i++) {
    var roomId = rows[i][3];
    var units = Number(rows[i][4]) || 0;
    if (!roomId) continue;
    used[roomId] = (used[roomId] || 0) + units;
  }

  var result = {};
  for (var id in ROOMS) {
    var room = ROOMS[id];
    var total = room.unit === 'bed' ? room.capacity : room.units;
    result[id] = Math.max(0, total - (used[id] || 0));
  }
  return result;
}

function createBooking(draft) {
  var room = ROOMS[draft.roomTypeId];
  if (!room) return { ok: false, error: '房型不存在，請重新選擇。' };

  var units = Number(draft.units) || 0;
  if (units < 1) return { ok: false, error: '數量不正確。' };

  // 檢查與寫入在同一個鎖裡完成，這是防止重複預訂的關鍵
  var available = getAvailability()[draft.roomTypeId];
  if (units > available) {
    return {
      ok: false,
      error: room.name + ' 只剩 ' + available + (room.unit === 'bed' ? ' 個床位' : ' 間') + '，請重新選擇。',
      availability: getAvailability(),
    };
  }

  var orderNo = makeOrderNo();
  var now = new Date();

  var people = draft.participants || [];
  var contact = draft.contact || {};
  var addons = draft.addons || {};

  // 前 7 欄的順序不能動：getAvailability() 依 index 3（房型ID）與 4（數量）計算名額
  var row = [orderNo, now, draft.eventId, draft.roomTypeId, units, room.name, people.length];

  CONTACT_COLUMNS.forEach(function (c) {
    row.push(contact[c.key] || '');
  });
  ADDON_COLUMNS.forEach(function (a) {
    row.push(addons[a.id] ? '✓' : '');
  });

  row.push(Number(draft.total) || 0, '未繳費');
  getSheet(BOOKING_SHEET).appendRow(row);

  var sheet = getSheet(PARTICIPANT_SHEET);
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    sheet.appendRow([
      orderNo,
      i + 1,
      p.name || '',
      p.phone || '',
      p.birthday || '',
      p.twid || '',
      room.name,
    ]);
  }

  return { ok: true, orderNo: orderNo, createdAt: now.toISOString() };
}

// ── 工具 ────────────────────────────────────────────────

var HEADERS = {};
HEADERS[BOOKING_SHEET] = ['訂單編號', '報名時間', '活動', '房型ID', '數量', '房型', '人數']
  .concat(
    CONTACT_COLUMNS.map(function (c) {
      return c.label;
    }),
  )
  .concat(
    ADDON_COLUMNS.map(function (a) {
      return a.label;
    }),
  )
  .concat(['總金額', '繳費狀態']);
HEADERS[PARTICIPANT_SHEET] = [
  '訂單編號', '序號', '姓名', '電話', '出生年月日', '身分證字號', '房型',
];

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function makeOrderNo() {
  var now = new Date();
  var ymd = Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd');
  var seq = Math.floor(Math.random() * 9000) + 1000;
  return 'TN' + ymd + '-' + seq;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
