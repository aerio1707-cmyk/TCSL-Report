import type { InfoOrderRow } from "../caseFiles/types";
import { classifyInfoOrderRows } from "./infoOrderReconcile";
import type { LampListVersion } from "./lampListVersions";
import type { AnalysisCandidateRow, ChannelLabel, ClassifiedCaseRow, WeeklyChannelBreakdown, WeeklyStatsResult } from "./types";
import { generateWeekRange, parseDateTime } from "./weekBucket";
import { CHANNEL_LABELS } from "./types";

function emptyChannelRecord(): Record<ChannelLabel, number> {
  const rec = {} as Record<ChannelLabel, number>;
  for (const c of CHANNEL_LABELS) rec[c] = 0;
  return rec;
}

interface MutableBucket extends WeeklyChannelBreakdown {}

function newBucket(weekKey: string, weekYear: number, weekLabel: string): MutableBucket {
  return {
    weekKey,
    weekYear,
    weekLabel,
    systemCount: 0,
    citizenCount: 0,
    failCount: 0,
    ghostTicketCount: 0,
    undetectedWholeRowUnlitCount: 0,
    undetectedDisabledCount: 0,
    undetectedOtherCount: 0,
    channels: emptyChannelRecord(),
  };
}

// 週次範圍：資料裡「立案日期」有值的全部案件（不受清冊/非清冊分類影響），
// 確保清冊/非清冊兩個區塊用同一組週次清單，方便圖表/總表(周)並排比對。
export function fullWeekRange(rows: ClassifiedCaseRow[]): { weekKey: string; weekYear: number; weekLabel: string }[] {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const row of rows) {
    const d = parseDateTime(row.filedDate);
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return [];
  return generateWeekRange(min, max);
}

export function buildWeeklyStats(
  classifiedRows: ClassifiedCaseRow[],
  candidates: AnalysisCandidateRow[],
  infoOrderRows: InfoOrderRow[] = [],
  lampListVersions: LampListVersion[] = []
): WeeklyStatsResult {
  const weeks = fullWeekRange(classifiedRows);
  const weekMap = new Map(weeks.map((w) => [w.weekKey, w]));
  const listedMap = new Map<string, MutableBucket>();
  const unlistedMap = new Map<string, MutableBucket>();
  for (const w of weeks) {
    listedMap.set(w.weekKey, newBucket(w.weekKey, w.weekYear, w.weekLabel));
    unlistedMap.set(w.weekKey, newBucket(w.weekKey, w.weekYear, w.weekLabel));
  }

  for (const row of classifiedRows) {
    if (!row.weekKey || !row.lampListStatus || !row.notifyCategory) continue;
    const map = row.lampListStatus === "清冊名單" ? listedMap : unlistedMap;
    const bucket = map.get(row.weekKey);
    if (!bucket) continue;

    if (row.notifyCategory === "system") bucket.systemCount++;
    else bucket.citizenCount++;

    const channel = row.reportSource as ChannelLabel;
    if (channel in bucket.channels) bucket.channels[channel]++;
  }

  for (const c of candidates) {
    if (c.decision !== "include") continue;
    if (!c.weekKey) continue;
    const bucket = listedMap.get(c.weekKey); // FAIL 只會出現在清冊
    if (bucket) bucket.failCount++;
  }

  // 幽靈工單判定需要知道「案件匯出檔案裡真的存在哪些案件編號」，用全部
  // classifiedRows（不篩清冊/系統開單）建立比對集合——Info_Order 抓到的
  // 工單編號本來就可能對到任何來源/任何清冊狀態的案件。
  const knownCaseNos = new Set(classifiedRows.map((r) => r.caseNo));
  const classifiedInfoOrder = classifyInfoOrderRows(infoOrderRows, lampListVersions, weekMap, knownCaseNos);
  for (const row of classifiedInfoOrder) {
    if (!row.weekKey || !row.status || row.status === "ticketed") continue;
    const bucket = listedMap.get(row.weekKey); // 對帳輔助數字只會出現在清冊
    if (!bucket) continue;
    if (row.status === "ghost") bucket.ghostTicketCount++;
    else if (row.status === "wholeRowUnlit") bucket.undetectedWholeRowUnlitCount++;
    else if (row.status === "disabled") bucket.undetectedDisabledCount++;
    else bucket.undetectedOtherCount++;
  }

  const sortByWeek = (a: MutableBucket, b: MutableBucket) => a.weekKey.localeCompare(b.weekKey);
  return {
    listed: [...listedMap.values()].sort(sortByWeek),
    unlisted: [...unlistedMap.values()].sort(sortByWeek),
  };
}

// 週次範圍選擇：只影響顯示/匯出範圍，不影響審核（審核永遠針對全部候選）。
export function filterWeeklyStatsRange(
  stats: WeeklyStatsResult,
  startWeekKey: string,
  endWeekKey: string
): WeeklyStatsResult {
  const inRange = (b: WeeklyChannelBreakdown) => b.weekKey >= startWeekKey && b.weekKey <= endWeekKey;
  return {
    listed: stats.listed.filter(inRange),
    unlisted: stats.unlisted.filter(inRange),
  };
}
