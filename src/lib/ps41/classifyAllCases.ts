import type { CaseExportRow } from "../caseFiles/types";
import { classifyLampList } from "./classifyLampList";
import { notifyCategoryOf } from "./channelBucket";
import type { ClassifiedCaseRow } from "./types";
import { generateWeekRange, mondayKeyOf, parseDateTime } from "./weekBucket";
import type { WeekBucketInfo } from "./weekBucket";

// 逐筆計算週次桶、清冊/非清冊分類、通報方式分桶，取代原 Anaysis 表的判定欄。
// 週次標籤一定要先用這批資料的日期 min~max 產生完整連續週次表再查表帶入，
// 不能對每筆日期各自獨立算——「該月第幾週」的編號需要看過同一批連續週次
// 才能編對，見 weekBucket.ts 的說明。
export function classifyAllCases(rows: CaseExportRow[], lampSet: Set<string>): ClassifiedCaseRow[] {
  const filedDates = rows.map((row) => parseDateTime(row.filedDate));

  let min: Date | null = null;
  let max: Date | null = null;
  for (const d of filedDates) {
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  const weekMap: Map<string, WeekBucketInfo> = min && max
    ? new Map(generateWeekRange(min, max).map((w) => [w.weekKey, w]))
    : new Map();

  return rows.map((row, i) => {
    const filedDate = filedDates[i];
    const week = filedDate ? weekMap.get(mondayKeyOf(filedDate)) : undefined;

    return {
      caseNo: row.caseNo,
      lampId: row.lampId,
      controllerId: row.controllerId,
      district: row.district,
      faultType: row.faultType,
      reportSource: row.reportSource,
      filedDate: row.filedDate,
      repairReason: row.repairReason,
      workContent: row.workContent,
      note: row.note,
      status: row.status,
      sourceFile: row.sourceFile,
      weekKey: week?.weekKey ?? null,
      weekYear: week?.weekYear ?? null,
      weekLabel: week?.weekLabel ?? null,
      lampListStatus: classifyLampList(row.lampId, row.controllerId, lampSet),
      notifyCategory: notifyCategoryOf(row.reportSource),
    };
  });
}

export function countUnclassifiedByBlankController(rows: ClassifiedCaseRow[]): number {
  return rows.filter((r) => r.controllerId.trim() === "" && r.lampListStatus === null).length;
}
