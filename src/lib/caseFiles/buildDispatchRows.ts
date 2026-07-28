import { compareDateStrings } from "./dateSort";
import { extractTicketNumber } from "./extractTicketNumber";
import type { DispatchRow, InfoOrderRow } from "./types";

export interface DispatchResult {
  rows: DispatchRow[];
  matchedCount: number; // 有比對到報修單號
  unmatchedCount: number; // 沒比對到，留空
}

// 自主API派工：Info_Order 逐筆資料 + 比對到的報修單號，依系統開單時間舊到新排序。
// 不產出「已開單判定」（J 欄）與「類別註記」（W 欄）——依使用者指示，這版不需要。
export function buildDispatchRows(infoOrderRows: InfoOrderRow[]): DispatchResult {
  const rows: DispatchRow[] = infoOrderRows
    .map((row) => ({ ...row, ticketNo: extractTicketNumber(row.notifyResult) }))
    .sort((a, b) => compareDateStrings(a.creationTime, b.creationTime));

  const matchedCount = rows.filter((r) => r.ticketNo !== "").length;

  return { rows, matchedCount, unmatchedCount: rows.length - matchedCount };
}
