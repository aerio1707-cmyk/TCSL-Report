import type { CaseMasterRow, DispatchRow, InfoOrderRow } from "../caseFiles/types";
import { buildTicketCountSeries } from "../caseFiles/buildTicketCountSeries";
import { classifyInfoOrderRows } from "./infoOrderReconcile";
import type { LampListVersion } from "./lampListVersions";
import type { ClassifiedCaseRow, WeeklyChannelBreakdown } from "./types";
import { parseDateTime } from "./weekBucket";

export interface DailyConsistencyRow {
  date: string; // yyyy-mm-dd
  ps41Total: number;
  ticketCountTotal: number;
  diff: number; // ticketCountTotal - ps41Total
}

export interface ConsistencyCheckResult {
  weekKey: string;
  weekLabel: string;
  ps41Total: number;
  ticketCountTotal: number;
  diff: number;
  // 只列出有落差的日期，方便縮小人工檢查範圍；不猜落差原因，只給數字。
  dailyMismatches: DailyConsistencyRow[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// PS4.1 的「開單數」用來跟「維修案件統計」比對的完整定義＝系統開單案件數
// （不分清冊/非清冊，兩張圖表合計才等於維修案件統計的範圍）＋清冊範圍 Info_Order
// 的 GhostTicket／未開單（N）。「已成案」(ticketed) 的 Info_Order 列不額外計算，
// 因為它對應的案件已經透過系統開單案件數算過一次，重複加會變成灌水。
//
// 逐日拆解只是為了在總數對不起來時，指出「是哪一天」縮小人工檢查範圍，不嘗試
// 判斷/標示落差的原因（例如「手動開單」），避免標錯誤導使用者。
export function buildLastWeekConsistencyCheck(
  classifiedRows: ClassifiedCaseRow[],
  infoOrderRows: InfoOrderRow[],
  lampListVersions: LampListVersion[],
  listedLastWeek: WeeklyChannelBreakdown,
  dispatchRows: DispatchRow[],
  caseMasterRows: CaseMasterRow[]
): ConsistencyCheckResult {
  const weekKey = listedLastWeek.weekKey; // 週一 yyyy-mm-dd
  const monday = new Date(`${weekKey}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const endKey = dayKey(sunday);

  // PS4.1 側，逐日累計：
  // 1) 系統開單案件（不分清冊/非清冊），依立案日期歸日。
  const ps41ByDay = new Map<string, number>();
  for (const row of classifiedRows) {
    if (row.notifyCategory !== "system") continue;
    const d = parseDateTime(row.filedDate);
    if (!d || d < monday || d > sunday) continue;
    const key = dayKey(d);
    ps41ByDay.set(key, (ps41ByDay.get(key) ?? 0) + 1);
  }
  // 2) 清冊範圍 Info_Order 的 GhostTicket／未開單（N），依偵測時間歸日——
  //    「已成案」(ticketed) 不重複加，上面系統開單案件數已經算過。
  const weekMap = new Map([[weekKey, { weekKey, weekYear: listedLastWeek.weekYear, weekLabel: listedLastWeek.weekLabel }]]);
  const knownCaseNos = new Set(classifiedRows.map((r) => r.caseNo));
  const classified = classifyInfoOrderRows(infoOrderRows, lampListVersions, weekMap, knownCaseNos);
  for (let i = 0; i < infoOrderRows.length; i++) {
    const c = classified[i];
    if (!c.status || c.weekKey !== weekKey || c.status === "ticketed") continue;
    const d = parseDateTime(infoOrderRows[i].creationTime);
    if (!d) continue;
    const key = dayKey(d);
    ps41ByDay.set(key, (ps41ByDay.get(key) ?? 0) + 1);
  }

  // 維修案件統計側，逐日累計：實際開單數 + 查無建立紀錄案件數 + 僅偵測未開單數。
  const buckets = buildTicketCountSeries(dispatchRows, caseMasterRows, { start: weekKey, end: endKey, granularity: "day" });
  const ticketByDay = new Map<string, number>();
  for (const b of buckets) {
    ticketByDay.set(b.key, b.ticketedCount + b.undetectedCount + b.missingLogCount);
  }

  const dailyMismatches: DailyConsistencyRow[] = [];
  let ps41Total = 0;
  let ticketCountTotal = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    const ps41Day = ps41ByDay.get(key) ?? 0;
    const ticketDay = ticketByDay.get(key) ?? 0;
    ps41Total += ps41Day;
    ticketCountTotal += ticketDay;
    if (ps41Day !== ticketDay) {
      dailyMismatches.push({ date: key, ps41Total: ps41Day, ticketCountTotal: ticketDay, diff: ticketDay - ps41Day });
    }
  }

  return {
    weekKey,
    weekLabel: listedLastWeek.weekLabel,
    ps41Total,
    ticketCountTotal,
    diff: ticketCountTotal - ps41Total,
    dailyMismatches,
  };
}
