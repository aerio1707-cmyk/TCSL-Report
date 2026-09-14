// 週次分桶：週一~週日為一週，歸屬哪個月份採「多數決」——比較這7天裡分別
// 屬於哪個月份的天數比較多，天數多的月份才是這週的歸屬月份（不是單純看週一
// 落在哪個月）。例如 8/31(週一)~9/6(週日) 只有一天在8月、其餘6天在9月，
// 歸屬應該算九月，不是八月。一週最多橫跨兩個月，7天不可能兩邊平分，
// 不會有平手需要決斷的情形。
//
// 「該月第幾週」也不能再用「週一減去1號除以7天」的公式硬算，因為多數決會讓
// 月初/月底的週次被拆到相鄰月份，公式硬算會撞號（例如相鄰兩週都被算成同一個
// 「9月/W1」）。改成：依時間先後掃過一段連續完整的週次清單，同一個(年,月)
// 出現第幾次就編第幾號——所以編號一定要用 generateWeekRange 產生的連續清單來
// 算，不能對稀疏的週次子集個別計算，否則會因為跳過零筆資料的週次而少算號。
//
// 日期字串格式固定是 "yyyy-mm-dd hh:mm:ss"（InfoOrder creation_time 原文、
// CaseExportRow filedDate 皆同，SheetJS raw:false 讀 xlsx 原生日期儲存格也是這個格式）。

// 逐欄位比對，不要求年/月/日/時/分/秒補零：SheetJS（raw:false）把日期時間儲存格
// 轉成文字時，時/分/秒若是個位數會省略前導零（例如「2026-09-13 1:10:15」），
// 直接丟給 `new Date(iso)` 會因為不符合 ISO 8601 兩位數時間格式變成 Invalid Date，
// 導致這類案件的週次判定整個變 null、被 buildWeeklyStats 悄悄排除在統計外
// （已用真實資料驗證：全部案件裡有 18.8% 的立案時間是個位數時，多半是系統
// 自動派工固定時段觸發，影響尤其大）。改成手動組出 Date 物件，不依賴字串格式。
const DATE_TIME_PATTERN = /^(\d{1,4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}):(\d{1,2}))?$/;

export function parseDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(DATE_TIME_PATTERN);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour !== undefined ? Number(hour) : 0,
    minute !== undefined ? Number(minute) : 0,
    second !== undefined ? Number(second) : 0
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = d.getDay() === 0 ? 7 : d.getDay(); // Monday=1..Sunday=7
  d.setDate(d.getDate() - (weekday - 1));
  return d;
}

function weekKeyOf(monday: Date): string {
  return `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
}

// 任意日期所在那一週的週一 weekKey，用來對照 generateWeekRange 產生的週次表。
export function mondayKeyOf(date: Date): string {
  return weekKeyOf(mondayOf(date));
}

// 這週(週一起算7天)裡，天數最多的年月，決定這週歸屬哪個月份。
function dominantYearMonth(monday: Date): { year: number; month: number } {
  const tally = new Map<string, { year: number; month: number; count: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = tally.get(key);
    if (entry) entry.count++;
    else tally.set(key, { year: d.getFullYear(), month: d.getMonth() + 1, count: 1 });
  }
  let best: { year: number; month: number; count: number } | null = null;
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return { year: best!.year, month: best!.month };
}

export interface WeekBucketInfo {
  weekKey: string; // 週一日期 yyyy-mm-dd，可直接字串排序
  weekYear: number; // 歸屬年度（多數決），畫面上不顯示、只在需要標示年份的地方（如匯出表）使用
  weekLabel: string; // "M月/WN"，不含年份
}

// 依時間序，把一批「連續完整」的週一日期各自算出歸屬(年,月)，同一組內依序編號。
function assignWeekLabels(mondays: Date[]): Map<string, WeekBucketInfo> {
  const counters = new Map<string, number>();
  const result = new Map<string, WeekBucketInfo>();
  for (const monday of mondays) {
    const { year, month } = dominantYearMonth(monday);
    const groupKey = `${year}-${pad2(month)}`;
    const weekOfMonth = (counters.get(groupKey) ?? 0) + 1;
    counters.set(groupKey, weekOfMonth);
    const key = weekKeyOf(monday);
    result.set(key, { weekKey: key, weekYear: year, weekLabel: `${month}月/W${weekOfMonth}` });
  }
  return result;
}

// 依資料實際日期範圍自動產生完整週次清單（含沒有案件的週次）。這份清單同時是
// 「編號連續不撞號」的唯一正確來源——任何需要單筆日期對應週次標籤的地方
// （見 classifyAllCases.ts），都必須先用同一組 min~max 呼叫這裡產生對照表，
// 再用 mondayKeyOf 查表，不能各自獨立算，否則會跟這裡算出來的編號對不上。
export function generateWeekRange(minDate: Date, maxDate: Date): WeekBucketInfo[] {
  const mondays: Date[] = [];
  let cursor = mondayOf(minDate);
  const lastMonday = mondayOf(maxDate);
  while (cursor.getTime() <= lastMonday.getTime()) {
    mondays.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }
  const labelMap = assignWeekLabels(mondays);
  return mondays.map((m) => labelMap.get(weekKeyOf(m))!);
}

// 把「週次範圍」（週一 weekKey）轉成日期區間文字，例："2026/01/01 - 2026/07/19"：
// 起始＝起始週的週一，結束＝結束週的週日（週一 + 6 天）。傳入同一個 weekKey
// 兩次可以拿到單一週的完整日期區間（含年份），供圖表 tooltip 消除歧義用。
export function formatWeekRangeAsDates(startWeekKey: string, endWeekKey: string): string {
  const formatYmd = (d: Date) => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
  const start = new Date(`${startWeekKey}T00:00:00`);
  const endMonday = new Date(`${endWeekKey}T00:00:00`);
  const end = new Date(endMonday.getFullYear(), endMonday.getMonth(), endMonday.getDate() + 6);
  return `${formatYmd(start)} - ${formatYmd(end)}`;
}
