// 週次分桶：跟 PS4.1.xlsx 原公式邏輯已用 2868 筆真實資料逐列驗證 100% 吻合
// （週一所在月份 + 該週一是當月第幾個 7 天區間），例："7月/W4"。
// 日期字串格式固定是 "yyyy-mm-dd hh:mm:ss"（InfoOrder creation_time 原文、
// CaseExportRow filedDate 皆同，SheetJS raw:false 讀 xlsx 原生日期儲存格也是這個格式）。

export function parseDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.replace(" ", "T");
  const d = new Date(iso);
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

export interface WeekBucketInfo {
  weekKey: string; // 週一日期 yyyy-mm-dd，可直接字串排序
  weekLabel: string; // "M月/WN"
}

export function weekBucketOf(date: Date): WeekBucketInfo {
  const monday = mondayOf(date);
  const month = monday.getMonth() + 1;
  const firstOfMonth = new Date(monday.getFullYear(), monday.getMonth(), 1);
  const weekOfMonth = 1 + Math.floor((monday.getTime() - firstOfMonth.getTime()) / (7 * 86400000));
  return {
    weekKey: `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`,
    weekLabel: `${month}月/W${weekOfMonth}`,
  };
}

// 把「週次範圍」（週一 weekKey）轉成日期區間文字，例："2026/01/01 - 2026/07/19"：
// 起始＝起始週的週一，結束＝結束週的週日（週一 + 6 天）。
export function formatWeekRangeAsDates(startWeekKey: string, endWeekKey: string): string {
  const formatYmd = (d: Date) => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
  const start = new Date(`${startWeekKey}T00:00:00`);
  const endMonday = new Date(`${endWeekKey}T00:00:00`);
  const end = new Date(endMonday.getFullYear(), endMonday.getMonth(), endMonday.getDate() + 6);
  return `${formatYmd(start)} - ${formatYmd(end)}`;
}

// 依資料實際日期範圍自動產生完整週次清單（含沒有案件的週次），避免圖表斷點。
export function generateWeekRange(minDate: Date, maxDate: Date): WeekBucketInfo[] {
  const weeks: WeekBucketInfo[] = [];
  let cursor = mondayOf(minDate);
  const lastMonday = mondayOf(maxDate);
  while (cursor.getTime() <= lastMonday.getTime()) {
    weeks.push(weekBucketOf(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }
  return weeks;
}
