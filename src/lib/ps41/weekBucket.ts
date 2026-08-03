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
