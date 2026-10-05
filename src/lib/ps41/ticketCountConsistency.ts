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

// PS4.1 側總數的拆解：系統開單案件數（清冊+非清冊合計，再拆成自主API自動
// 偵測／手動開立工單）＋GhostTicket＋未開單(N)。
export interface Ps41Breakdown {
  systemAutoCount: number;
  systemManualCount: number;
  ghostCount: number;
  undetectedCount: number;
}

// 維修案件統計側總數的拆解：實際開單數＋僅偵測未開單數＋查無建立紀錄案件數。
export interface TicketCountBreakdown {
  ticketedCount: number;
  undetectedCount: number;
  missingLogCount: number;
}

export interface ConsistencyCheckResult {
  weekKey: string;
  weekLabel: string;
  ps41Total: number;
  ticketCountTotal: number;
  diff: number;
  ps41Breakdown: Ps41Breakdown;
  ticketCountBreakdown: TicketCountBreakdown;
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
  unlistedLastWeek: WeeklyChannelBreakdown | undefined,
  dispatchRows: DispatchRow[],
  caseMasterRows: CaseMasterRow[]
): ConsistencyCheckResult {
  const weekKey = listedLastWeek.weekKey; // 週一 yyyy-mm-dd
  const monday = new Date(`${weekKey}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const endKey = dayKey(sunday);

  // 系統開單案件（不分清冊/非清冊），依立案日期歸日；自動/手動拆解沿用
  // buildWeeklyStats.ts 已經算好的 systemAutoCount/systemManualCount（清冊+
  // 非清冊各自一份），這裡不重算一次比對邏輯，避免跟那邊的判定兩邊各自維護、
  // 以後改一邊忘了改另一邊而不同步。
  const ps41ByDay = new Map<string, number>();
  for (const row of classifiedRows) {
    if (row.notifyCategory !== "system") continue;
    const d = parseDateTime(row.filedDate);
    if (!d || d < monday || d > sunday) continue;
    const key = dayKey(d);
    ps41ByDay.set(key, (ps41ByDay.get(key) ?? 0) + 1);
  }
  const ps41SystemAutoCount = listedLastWeek.systemAutoCount + (unlistedLastWeek?.systemAutoCount ?? 0);
  const ps41SystemManualCount = listedLastWeek.systemManualCount + (unlistedLastWeek?.systemManualCount ?? 0);
  // 2) 清冊範圍 Info_Order 的 GhostTicket／未開單（N），依偵測時間歸日——
  //    「已成案」(ticketed) 不重複加，上面系統開單案件數已經算過。
  const weekMap = new Map([[weekKey, { weekKey, weekYear: listedLastWeek.weekYear, weekLabel: listedLastWeek.weekLabel }]]);
  const knownCaseNos = new Set(classifiedRows.map((r) => r.caseNo));
  const classified = classifyInfoOrderRows(infoOrderRows, lampListVersions, weekMap, knownCaseNos);
  let ps41GhostCount = 0;
  let ps41UndetectedCount = 0;
  for (let i = 0; i < infoOrderRows.length; i++) {
    const c = classified[i];
    if (!c.status || c.weekKey !== weekKey || c.status === "ticketed") continue;
    const d = parseDateTime(infoOrderRows[i].creationTime);
    if (!d) continue;
    const key = dayKey(d);
    ps41ByDay.set(key, (ps41ByDay.get(key) ?? 0) + 1);
    if (c.status === "ghost") ps41GhostCount++;
    else ps41UndetectedCount++;
  }

  // 維修案件統計側，逐日累計：實際開單數 + 查無建立紀錄案件數 + 僅偵測未開單數。
  const buckets = buildTicketCountSeries(dispatchRows, caseMasterRows, { start: weekKey, end: endKey, granularity: "day" });
  const ticketByDay = new Map<string, number>();
  let ticketedCount = 0;
  let ticketUndetectedCount = 0;
  let missingLogCount = 0;
  for (const b of buckets) {
    ticketByDay.set(b.key, b.ticketedCount + b.undetectedCount + b.missingLogCount);
    ticketedCount += b.ticketedCount;
    ticketUndetectedCount += b.undetectedCount;
    missingLogCount += b.missingLogCount;
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
    ps41Breakdown: {
      systemAutoCount: ps41SystemAutoCount,
      systemManualCount: ps41SystemManualCount,
      ghostCount: ps41GhostCount,
      undetectedCount: ps41UndetectedCount,
    },
    ticketCountBreakdown: { ticketedCount, undetectedCount: ticketUndetectedCount, missingLogCount },
    dailyMismatches,
  };
}
