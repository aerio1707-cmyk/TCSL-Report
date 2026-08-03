import * as XLSX from "xlsx";
import { CHANNEL_LABELS } from "./types";
import type { WeeklyStatsResult } from "./types";

const LISTED_CHANNEL_HEADERS = [...CHANNEL_LABELS];
const UNLISTED_CHANNEL_HEADERS = [...CHANNEL_LABELS];

// 對應規劃文件第 4 節：清冊(左半)/非清冊(右半)雙區塊週統計表，儲存格底色不寫
// （SheetJS 社群版限制，沿用 TCSL-Report 既有共識），其餘格式盡量比照原檔。
export function exportWeeklyReportWorkbook(stats: WeeklyStatsResult, rangeLabel: string): void {
  const listedHeader = ["Week", "系統開單", "民眾通報", "FAIL", ...LISTED_CHANNEL_HEADERS];
  const unlistedHeader = ["Week", "系統開單", "民眾通報", ...UNLISTED_CHANNEL_HEADERS];

  const titleRow: (string | number)[] = [`通報方式統計(清冊) ${rangeLabel}`];
  const unlistedTitleCol = listedHeader.length + 1; // 分隔欄之後
  while (titleRow.length < unlistedTitleCol) titleRow.push("");
  titleRow.push(`通報方式統計(非清冊) ${rangeLabel}`);

  const headerRow = [...listedHeader, "", ...unlistedHeader];

  const rowCount = Math.max(stats.listed.length, stats.unlisted.length);
  const dataRows: (string | number)[][] = [];
  for (let i = 0; i < rowCount; i++) {
    const l = stats.listed[i];
    const u = stats.unlisted[i];
    const listedCols: (string | number)[] = l
      ? [l.weekLabel, l.systemCount, l.citizenCount, l.failCount, ...LISTED_CHANNEL_HEADERS.map((c) => l.channels[c])]
      : Array(listedHeader.length).fill("");
    const unlistedCols: (string | number)[] = u
      ? [u.weekLabel, u.systemCount, u.citizenCount, ...UNLISTED_CHANNEL_HEADERS.map((c) => u.channels[c])]
      : Array(unlistedHeader.length).fill("");
    dataRows.push([...listedCols, "", ...unlistedCols]);
  }

  const aoa = [titleRow, [], headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "總表(周)");
  XLSX.writeFile(wb, "總表(周).xlsx");
}
