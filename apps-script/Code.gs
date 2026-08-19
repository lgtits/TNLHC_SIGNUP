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
 *
 * 升級既有的試算表：改完欄位定義後，一定要手動執行一次 setup()，
 * 缺的欄位會補在標題列最後面。資料是「依標題名稱」讀寫的，
 * 欄位順序怎麼排都不影響，但欄位不存在會讓報名寫入直接失敗。
 */

// ── 設定 ────────────────────────────────────────────────
// 房型名額的唯一真實來源。前端 JSON 只負責顯示，實際扣量以這裡為準。
//   unit: 'bed'  → 通鋪，以床位計，capacity = 總床位數
//   unit: 'room' → 一般房型，rooms 列出實體房號，報名時自動分配一間
//   bedInfo 會寫進試算表，也會在報名查詢時回傳，讓人一眼看出房間長什麼樣
var ROOMS = {
  'room-tongpu': { unit: 'bed', capacity: 20, name: '通鋪', bedInfo: '20 人大通鋪' },
  'room-204-206': { unit: 'room', capacity: 5, rooms: ['204', '205', '206'], name: '204、205、206 號房', bedInfo: '5 單人床' },
  'room-301-302': { unit: 'room', capacity: 4, rooms: ['301', '302'], name: '301、302 號房', bedInfo: '1 雙人床 + 2 單人床' },
  'room-303': { unit: 'room', capacity: 6, rooms: ['303'], name: '303 號房', bedInfo: '2 單人床 + 2 雙人床' },
  'room-304-306': { unit: 'room', capacity: 5, rooms: ['304', '305', '306'], name: '304、305、306 號房', bedInfo: '5 單人床' },
  'room-309': { unit: 'room', capacity: 5, rooms: ['309'], name: '309 號房', bedInfo: '1 單人床 + 2 雙人床' },
  'room-312-313': { unit: 'room', capacity: 4, rooms: ['312', '313'], name: '312、313 號房', bedInfo: '2 雙人床' },
};
// 預先保留、不開放報名：307（莉雅）、308（牧師）、310（林執事）、311（楊老師）

// 聯絡人要獨立成欄的欄位（key 對應前端 contactFields 的 key）
var CONTACT_COLUMNS = [
  { key: 'contactName', label: '聯絡人姓名' },
  { key: 'email', label: '聯絡人 Email' },
];

// 加購項目各給一欄，有選就打勾，比塞一包 JSON 好讀也好篩選
var ADDON_COLUMNS = [
  { id: 'addon-meals', label: '用餐' },
  { id: 'addon-insurance', label: '保險' },
];

var BOOKING_SHEET = 'bookings';
var PARTICIPANT_SHEET = 'participants';

// 多個房號寫在同一格時的分隔符號（目前一筆報名只會分到一間，先留著）
var ROOM_NO_SEP = '、';

// ── 對外入口 ────────────────────────────────────────────

/**
 * 手動執行一次即可：建立兩張工作表與標題列。
 * 在編輯器上方的函式下拉選單選 setup 後按執行。
 * 已經有資料的試算表再執行也安全 —— 只會把缺的欄位補在最後面。
 */
function setup() {
  ensureSheets();
  upgradeHeaders();
  SpreadsheetApp.getActiveSpreadsheet().toast('bookings / participants 已就緒', '初始化完成');
}

/** 兩張表都先建好，管理者一開始就看得到完整結構 */
function ensureSheets() {
  getSheet(BOOKING_SHEET);
  getSheet(PARTICIPANT_SHEET);
}

/**
 * 把程式碼裡新增的欄位補到既有的工作表上。
 * 改完 HEADERS / CONTACT_COLUMNS / ADDON_COLUMNS 之後要手動執行一次，
 * 不然報名寫入會因為缺欄位而直接失敗（assertColumns 會擋下來）。
 */
function upgradeHeaders() {
  addMissingHeaders(getSheet(BOOKING_SHEET), HEADERS[BOOKING_SHEET]);
  addMissingHeaders(getSheet(PARTICIPANT_SHEET), HEADERS[PARTICIPANT_SHEET]);
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

/** 查目前剩餘名額與還沒被分配出去的房號 */
function doGet() {
  try {
    ensureSheets();
    var stock = getStock();
    return json({ ok: true, availability: stock.availability, remaining: stock.remaining });
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
    var payload = JSON.parse(e.postData.contents);

    // 查詢走 POST 而不是 GET：身分證字號放在 query string 會被記進
    // 執行記錄、瀏覽器歷史與 referrer，放在 body 才只留在這次請求裡。
    if (payload.action === 'lookup') return json(lookupBookings(payload));

    return json(createBooking(payload));
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
 * 掃一次 bookings，算出每個房型的剩餘量，以及房間房型還有哪些房號沒分出去。
 *
 * 一律用「現數」計算，不存計數器 —— 同工手動刪掉一列，
 * 那個床位／房號就自動回到可分配狀態，語意剛好正確。
 */
function getStock() {
  var sheet = getSheet(BOOKING_SHEET);
  var rows = sheet.getDataRange().getValues();
  var cols = headerMap(sheet);

  var usedBeds = {}; // 房型ID → 已佔用床位數（通鋪用）
  var takenRooms = {}; // 房號 → 已被分配
  var untagged = {}; // 房型ID → 有訂房但沒填房號的間數

  // 第 0 列是標題，從 1 開始
  for (var i = 1; i < rows.length; i++) {
    var roomId = rows[i][cols['房型ID']];
    if (!roomId) continue;

    var units = Number(rows[i][cols['數量']]) || 0;
    usedBeds[roomId] = (usedBeds[roomId] || 0) + units;

    var noText = String(rows[i][cols['房號']] || '').trim();
    if (!noText) {
      // 自動分房上線前寫入的舊資料，或同工手動補的列。
      // 沒填房號一樣要佔掉名額，否則同一間房會被分配第二次。
      untagged[roomId] = (untagged[roomId] || 0) + units;
      continue;
    }

    noText.split(ROOM_NO_SEP).forEach(function (no) {
      var trimmed = no.trim();
      if (trimmed) takenRooms[trimmed] = true;
    });
  }

  var availability = {};
  var remaining = {};

  for (var id in ROOMS) {
    var room = ROOMS[id];

    if (room.unit === 'bed') {
      availability[id] = Math.max(0, room.capacity - (usedBeds[id] || 0));
      continue;
    }

    var free = room.rooms.filter(function (no) {
      return !takenRooms[no];
    });

    // 沒填房號的訂房，保守地從號碼小的開始扣，寧可少算也不要重複分配
    var unknown = untagged[id] || 0;
    if (unknown > 0) free = free.slice(unknown);

    remaining[id] = free;
    availability[id] = free.length;
  }

  return { availability: availability, remaining: remaining };
}

function createBooking(draft) {
  var room = ROOMS[draft.roomTypeId];
  if (!room) return { ok: false, error: '房型不存在，請重新選擇。' };

  var units = Number(draft.units) || 0;
  if (units < 1) return { ok: false, error: '數量不正確。' };

  // 兩張表的欄位先一起檢查，缺欄位就整筆不寫
  assertColumns(getSheet(BOOKING_SHEET), HEADERS[BOOKING_SHEET]);
  assertColumns(getSheet(PARTICIPANT_SHEET), HEADERS[PARTICIPANT_SHEET]);

  // 檢查、分配與寫入在同一個鎖裡完成，這是防止重複預訂／重複分房的關鍵
  var stock = getStock();
  var available = stock.availability[draft.roomTypeId];
  if (units > available) {
    return {
      ok: false,
      error:
        room.name + ' 只剩 ' + available + (room.unit === 'bed' ? ' 個床位' : ' 間') + '，請重新選擇。',
      availability: stock.availability,
      remaining: stock.remaining,
    };
  }

  // 房間房型：從還沒分配出去的房號裡，照號碼順序指派給這筆報名。
  // 通鋪沒有房號，留空字串。
  var roomNo = '';
  if (room.unit === 'room') {
    roomNo = (stock.remaining[draft.roomTypeId] || []).slice(0, units).join(ROOM_NO_SEP);
    if (!roomNo) {
      return {
        ok: false,
        error: room.name + ' 剛剛被訂走了，請重新選擇。',
        availability: stock.availability,
        remaining: stock.remaining,
      };
    }
  }

  var orderNo = makeOrderNo();
  var now = new Date();

  var people = draft.participants || [];
  var contact = draft.contact || {};
  var addons = draft.addons || {};

  var values = {
    '訂單編號': orderNo,
    '報名時間': now,
    '活動': draft.eventId,
    '房型ID': draft.roomTypeId,
    '數量': units,
    '房型': room.name,
    '房號': roomNo,
    '床位配置': room.bedInfo || '',
    '人數': people.length,
    '總金額': Number(draft.total) || 0,
    '繳費狀態': '未繳費',
  };
  CONTACT_COLUMNS.forEach(function (c) {
    values[c.label] = contact[c.key] || '';
  });
  ADDON_COLUMNS.forEach(function (a) {
    values[a.label] = addons[a.id] ? '✓' : '';
  });
  appendRowsByHeader(getSheet(BOOKING_SHEET), [values]);

  var participantRows = people.map(function (p, i) {
    return {
      '訂單編號': orderNo,
      '序號': i + 1,
      '姓名': p.name || '',
      '電話': p.phone || '',
      '出生年月日': p.birthday || '',
      '身分證字號': p.twid || '',
      '房型': room.name,
      '房號': roomNo,
      '床位配置': room.bedInfo || '',
    };
  });
  appendRowsByHeader(getSheet(PARTICIPANT_SHEET), participantRows);

  return { ok: true, orderNo: orderNo, roomNo: roomNo, createdAt: now.toISOString() };
}

// ── 查詢報名 ────────────────────────────────────────────

/** 同一個身分證字號的查詢頻率上限（次 / 分鐘），擋暴力嘗試 */
var LOOKUP_RATE_LIMIT = 10;

/**
 * 用「參加者姓名 + 身分證字號」找出他所屬的報名，回傳整筆訂單（含同行者）。
 *
 * 查無資料時不區分「姓名不符」或「身分證不符」，
 * 否則這支 API 會變成可以拿來試探別人資料的工具。
 * 資料是完整回傳的，所以「姓名 + 身分證」這道門檻與 allowLookup() 的
 * 節流就是唯一的保護，不要放寬成單一欄位查詢。
 */
function lookupBookings(payload) {
  var name = String(payload.name || '').trim();
  var twid = String(payload.twid || '').trim().toUpperCase();
  if (!name || !twid) return { ok: false, error: '請輸入姓名與身分證字號。' };
  if (!allowLookup(twid)) {
    return { ok: false, error: '查詢次數過於頻繁，請稍後再試。' };
  }

  var pSheet = getSheet(PARTICIPANT_SHEET);
  var pRows = pSheet.getDataRange().getValues();
  var pCols = headerMap(pSheet);

  // 先找出這個人出現在哪些訂單
  var matched = {};
  for (var i = 1; i < pRows.length; i++) {
    var rowName = String(pRows[i][pCols['姓名']] || '').trim();
    var rowId = String(pRows[i][pCols['身分證字號']] || '').trim().toUpperCase();
    if (rowName === name && rowId === twid) {
      matched[String(pRows[i][pCols['訂單編號']] || '').trim()] = true;
    }
  }
  if (!Object.keys(matched).length) return { ok: true, bookings: [] };

  // 再把那些訂單的同行者收齊
  var peopleByOrder = {};
  for (var j = 1; j < pRows.length; j++) {
    var orderNo = String(pRows[j][pCols['訂單編號']] || '').trim();
    if (!matched[orderNo]) continue;

    (peopleByOrder[orderNo] = peopleByOrder[orderNo] || []).push({
      name: String(pRows[j][pCols['姓名']] || ''),
      phone: toPhoneText(pRows[j][pCols['電話']]),
      birthday: toDateText(pRows[j][pCols['出生年月日']]),
      twid: String(pRows[j][pCols['身分證字號']] || '').trim(),
    });
  }

  var bSheet = getSheet(BOOKING_SHEET);
  var bRows = bSheet.getDataRange().getValues();
  var bCols = headerMap(bSheet);
  var bookings = [];

  for (var k = 1; k < bRows.length; k++) {
    var no = String(bRows[k][bCols['訂單編號']] || '').trim();
    if (!matched[no]) continue;

    var addons = [];
    ADDON_COLUMNS.forEach(function (a) {
      if (bRows[k][bCols[a.label]]) addons.push(a.label);
    });

    bookings.push({
      orderNo: no,
      createdAt: toIso(bRows[k][bCols['報名時間']]),
      eventId: String(bRows[k][bCols['活動']] || ''),
      roomTypeId: String(bRows[k][bCols['房型ID']] || ''),
      roomTypeName: String(bRows[k][bCols['房型']] || ''),
      roomNo: String(bRows[k][bCols['房號']] || ''),
      // 房間長什麼樣，查詢時一併顯示比只給房號清楚
      bedInfo: String(bRows[k][bCols['床位配置']] || ''),
      guests: Number(bRows[k][bCols['人數']]) || 0,
      total: Number(bRows[k][bCols['總金額']]) || 0,
      // 繳費狀態刻意不回傳：那一欄是同工內部核帳用的，不對外顯示
      contactName: String(bRows[k][bCols['聯絡人姓名']] || ''),
      addons: addons,
      participants: peopleByOrder[no] || [],
    });
  }

  return { ok: true, bookings: bookings };
}

/** 以身分證字號為 key 的簡易節流，狀態放 CacheService，過期自動清掉 */
function allowLookup(twid) {
  var cache = CacheService.getScriptCache();
  var key = 'lookup-' + Utilities.base64Encode(twid);
  var count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 60);
  return count <= LOOKUP_RATE_LIMIT;
}

/** 試算表可能把日期存成 Date 物件，統一輸出 yyyy-mm-dd */
function toDateText(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  return String(value || '').trim();
}

/** 試算表會把 0912345678 當成數字存，開頭的 0 會不見，這裡補回來 */
function toPhoneText(value) {
  var s = String(value || '').trim();
  if (/^\d{9}$/.test(s)) return '0' + s;
  return s;
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value || '');
}

// ── 工具 ────────────────────────────────────────────────

var HEADERS = {};
HEADERS[BOOKING_SHEET] = ['訂單編號', '報名時間', '活動', '房型ID', '數量', '房型', '房號', '床位配置', '人數']
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
  '訂單編號', '序號', '姓名', '電話', '出生年月日', '身分證字號', '房型', '房號', '床位配置',
];

/**
 * 每次請求就是一次全新的執行環境，所以這兩層快取只在單次請求內有效，
 * 不會有跨請求讀到舊資料的問題。
 *
 * 沒有快取的話，一次送出報名要來回試算表十幾次（光是標題列就重讀 5、6 遍），
 * 執行時間會拉到 3～4 秒，連帶讓 doPost 的鎖持有太久、排隊卡住其他人。
 */
var SHEET_CACHE = {};
var HEADER_CACHE = {};

function getSheet(name) {
  if (SHEET_CACHE[name]) return SHEET_CACHE[name];

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS[name]);
    sheet.setFrozenRows(1);
  }

  SHEET_CACHE[name] = sheet;
  return sheet;
}

/** 標題列讀一次就快取起來，回傳 { map: 標題→索引, width: 欄數 } */
function headerInfo(sheet) {
  var name = sheet.getName();
  if (HEADER_CACHE[name]) return HEADER_CACHE[name];

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[String(headers[i]).trim()] = i;
  }

  HEADER_CACHE[name] = { map: map, width: headers.length };
  return HEADER_CACHE[name];
}

/** 標題名稱 → 欄位索引（0 起算） */
function headerMap(sheet) {
  return headerInfo(sheet).map;
}

/**
 * 補上標題列缺少的欄位（加在最後面）。
 * 既有資料不會位移，新欄位對舊資料就是空白。
 *
 * 這件事只在手動執行 setup() 時做。以前每次請求都跑，等於每次都多讀兩次標題列，
 * 而欄位定義只有在改程式碼時才會變動，沒必要每個使用者都幫忙檢查一遍。
 */
function addMissingHeaders(sheet, headers) {
  var map = headerMap(sheet);
  var missing = headers.filter(function (label) {
    return map[label] === undefined;
  });
  if (!missing.length) return;

  sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  delete HEADER_CACHE[sheet.getName()]; // 標題列變了，快取作廢
}

/**
 * 確認要寫入的欄位在表上都存在。
 * 在動筆之前先檢查，避免 bookings 寫進去了、participants 才失敗，
 * 留下一筆佔著房號卻沒有名單的孤兒資料。
 */
function assertColumns(sheet, headers) {
  var map = headerMap(sheet);
  var missing = headers.filter(function (label) {
    return map[label] === undefined;
  });
  if (missing.length) {
    throw new Error(
      '工作表「' + sheet.getName() + '」缺少欄位：' + missing.join('、') +
        '。請先在 Apps Script 編輯器執行一次 setup()。',
    );
  }
}

/**
 * 依「標題名稱」一次寫入多列，而不是依欄位順序。
 * 這樣同工在試算表上調換欄位順序、或中間插入一欄註記，都不會讓資料錯位。
 *
 * 多列合併成一次 setValues，5 個人的名單從 5 次往返變成 1 次。
 */
function appendRowsByHeader(sheet, rows) {
  if (!rows.length) return;

  var info = headerInfo(sheet);
  var values = rows.map(function (data) {
    var row = [];
    for (var i = 0; i < info.width; i++) row.push('');

    for (var label in data) {
      var idx = info.map[label];
      // 靜靜跳過會寫出缺房號的殘缺資料，寧可整筆失敗
      if (idx === undefined) {
        throw new Error('工作表「' + sheet.getName() + '」缺少欄位「' + label + '」。');
      }
      row[idx] = data[label];
    }
    return row;
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, info.width).setValues(values);
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
