import type { CaseExportRow } from "../caseFiles/types";
import { classifyLampList } from "./classifyLampList";
import { notifyCategoryOf } from "./channelBucket";
import type { ClassifiedCaseRow } from "./types";
import { parseDateTime, weekBucketOf } from "./weekBucket";

// 逐筆計算週次桶、清冊/非清冊分類、通報方式分桶，取代原 Anaysis 表的判定欄。
export function classifyAllCases(rows: CaseExportRow[], lampSet: Set<string>): ClassifiedCaseRow[] {
  return rows.map((row) => {
    const filedDate = parseDateTime(row.filedDate);
    const week = filedDate ? weekBucketOf(filedDate) : null;

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
      weekLabel: week?.weekLabel ?? null,
      lampListStatus: classifyLampList(row.lampId, row.controllerId, lampSet),
      notifyCategory: notifyCategoryOf(row.reportSource),
    };
  });
}

export function countUnclassifiedByBlankController(rows: ClassifiedCaseRow[]): number {
  return rows.filter((r) => r.controllerId.trim() === "" && r.lampListStatus === null).length;
}
