import type { AnalysisCandidateRow, ChannelLabel, ClassifiedCaseRow, WeeklyChannelBreakdown, WeeklyStatsResult } from "./types";
import { generateWeekRange, parseDateTime } from "./weekBucket";
import { CHANNEL_LABELS } from "./types";

function emptyChannelRecord(): Record<ChannelLabel, number> {
  const rec = {} as Record<ChannelLabel, number>;
  for (const c of CHANNEL_LABELS) rec[c] = 0;
  return rec;
}

interface MutableBucket extends WeeklyChannelBreakdown {}

function newBucket(weekKey: string, weekLabel: string): MutableBucket {
  return { weekKey, weekLabel, systemCount: 0, citizenCount: 0, failCount: 0, channels: emptyChannelRecord() };
}

// 週次範圍：資料裡「立案日期」有值的全部案件（不受清冊/非清冊分類影響），
// 確保清冊/非清冊兩個區塊用同一組週次清單，方便圖表/總表(周)並排比對。
export function fullWeekRange(rows: ClassifiedCaseRow[]): { weekKey: string; weekLabel: string }[] {
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
  candidates: AnalysisCandidateRow[]
): WeeklyStatsResult {
  const weeks = fullWeekRange(classifiedRows);
  const listedMap = new Map<string, MutableBucket>();
  const unlistedMap = new Map<string, MutableBucket>();
  for (const w of weeks) {
    listedMap.set(w.weekKey, newBucket(w.weekKey, w.weekLabel));
    unlistedMap.set(w.weekKey, newBucket(w.weekKey, w.weekLabel));
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
