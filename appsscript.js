// Google Apps Script — 遊戲平台後台
// 貼到 Apps Script 編輯器，重新部署（Deploy → Manage Deployments → 建新版本）
const SHEET_ID     = '1B0voB6MxgqUxh3_TzejAoYZpr4BvjdRLWID43pIepVk';
const CLICKS_SHEET = '工作表1';   // 點閱紀錄
const GAMES_SHEET  = '遊戲清單'; // 遊戲後台

// 初始遊戲資料（第一次自動建立用）
const INIT_GAMES = [
  ['water-memory-game', '水資源記憶配對遊戲',    '藍隊 vs 紅隊翻牌對戰，3D翻牌動畫、配對音效，適合兩人一台電腦的課堂互動', '💧', '水資源遊戲',  'https://adam7315.github.io/water-memory-game/', '是'],
  ['water-quiz-game',   '水資源管理策略課後大挑戰','轉盤決定難度，30 秒倒數搶答，適合大螢幕投影、同學輪流上台',           '🌊', '水資源遊戲',  'https://adam7315.github.io/water-quiz-game/',   '是'],
  ['food-web-game',     '海洋食物網遊戲',         '探索海洋生態系中的食物鏈與能量流動關係，互動式學習海洋科學核心概念',   '🐠', '海洋科學遊戲','https://adam7315.github.io/food-web-game/',     '是'],
];

// ── 主入口 ─────────────────────────────────────────────────
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'counts';
  try {
    if (action === 'games')  return getGames();
    if (action === 'log')    return logClick(e);
    if (action === 'counts') return getCounts(e);
    return json({ error: 'unknown action' });
  } catch(err) {
    return json({ error: err.message });
  }
}

// ── 回傳遊戲列表 ────────────────────────────────────────────
function getGames() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(GAMES_SHEET);

  // 第一次：自動建立分頁並填入初始資料
  if (!sh) {
    sh = ss.insertSheet(GAMES_SHEET);
    sh.appendRow(['id','名稱','說明','emoji','分類','網址','顯示']);
    sh.getRange(1,1,1,7).setFontWeight('bold');
    INIT_GAMES.forEach(r => sh.appendRow(r));
    sh.setColumnWidth(2, 200);
    sh.setColumnWidth(3, 350);
    sh.setColumnWidth(6, 300);
  }

  const rows = sh.getDataRange().getValues().slice(1);
  const games = rows
    .filter(r => r[0] && r[6] === '是')
    .map(r => ({ id:r[0], name:r[1], desc:r[2], emoji:r[3], category:r[4], url:r[5] }));

  return json({ success: true, games });
}

// ── 記錄點擊 ────────────────────────────────────────────────
function logClick(e) {
  const sh = getClicksSheet();
  sh.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'),
    e.parameter.game_id   || '',
    e.parameter.game_name || '',
    e.parameter.category  || ''
  ]);
  return json({ success: true });
}

// ── 回傳點閱統計 ────────────────────────────────────────────
function getCounts(e) {
  const period = (e.parameter && e.parameter.period) || 'all';
  const sh     = getClicksSheet();
  const rows   = sh.getDataRange().getValues().slice(1);

  const now    = Date.now();
  const cutoff = { '1month': now - 30*86400000, '6months': now - 180*86400000, 'all': 0 }[period] || 0;

  const counts = {};
  rows.forEach(r => {
    if (!r[0] || !r[1]) return;
    // 相容新格式（yyyy-MM-dd HH:mm:ss 台灣時間）與舊格式（ISO UTC）
    let ts;
    const raw = String(r[0]);
    if (raw.indexOf('T') !== -1) {
      ts = new Date(raw);
    } else {
      ts = Utilities.parseDate(raw, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    }
    if (!ts || ts.getTime() < cutoff) return;
    const id = r[1];
    if (!counts[id]) counts[id] = { game_id:id, game_name:r[2], category:r[3], count:0 };
    counts[id].count++;
  });

  return json({ success: true, period, counts: Object.values(counts) });
}

// ── 工具 ────────────────────────────────────────────────────
function getClicksSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(CLICKS_SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(['timestamp','game_id','game_name','category']);
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
