import { compareDateStrings } from "./dateSort";
import type { CaseExportRow, CaseMasterRow } from "./types";

// 路燈編號/poles_id 長度＝7 碼才是智能燈（已用真實資料驗證：Info_Order.csv 與
// 智能燈清冊.xlsx 100% 是 7 碼），非智能燈案件（11 碼政府資產編號等）整批排除，
// 不需要額外的正規化比對。
const SMART_LAMP_ID_LENGTH = 7;

export function isSmartLampId(lampId: string): boolean {
  return lampId.length === SMART_LAMP_ID_LENGTH;
}

// 撞號明細（案件編號相同但內容不同）只給智能燈案件參考：非智能燈本來就不影響
// 任何最終產出（案件主檔/PS4.1 統計都只算智能燈），混進非智能燈的列只會讓人
// 誤以為要複查不相干的資料。篩掉非智能燈後，若某個案件編號只剩 1 筆代表列，
// 就不再是「撞號」，一併從清單移除。
export function filterSmartLampCollisions(collisions: CaseExportRow[]): CaseExportRow[] {
  const smartOnly = collisions.filter((r) => isSmartLampId(r.lampId));
  const countByCase = new Map<string, number>();
  for (const row of smartOnly) countByCase.set(row.caseNo, (countByCase.get(row.caseNo) ?? 0) + 1);
  return smartOnly.filter((row) => (countByCase.get(row.caseNo) ?? 0) > 1);
}

function toCaseMasterRow(row: CaseExportRow, isClosed: boolean): CaseMasterRow {
  return {
    caseNo: row.caseNo,
    lampId: row.lampId,
    fixtureId: row.fixtureId,
    controllerId: row.controllerId,
    district: row.district,
    faultType: row.faultType,
    reportSource: row.reportSource,
    filedDate: row.filedDate,
    overdueHours: row.overdueHours,
    repairReason: row.repairReason,
    workContent: row.workContent,
    completedTime: row.completedTime,
    status: row.status,
    note: row.note,
    isClosed,
    sourceFile: row.sourceFile,
  };
}

export interface CaseMasterResult {
  rows: CaseMasterRow[];
  smartLampRepairCount: number;
  smartLampReportCount: number;
  nonSmartLampRepairExcluded: number;
  nonSmartLampReportExcluded: number;
}

// 以「案件編號」為主鍵合併已篩選智能燈的「維修案件匯出（已結案）」與
// 「報修清單匯出（未結案）」：已結案版本欄位較完整，優先採用；若案件編號在
// 維修案件匯出裡本身有撞號（Phase 1 已個別警示過），這裡依陣列順序取第一筆，
// 不重複展開——複查責任交給 Phase 1 已顯示的撞號明細，這裡不重新判斷對錯。
export function buildCaseMaster(
  repairExportRows: CaseExportRow[],
  reportExportRows: CaseExportRow[]
): CaseMasterResult {
  const smartRepair = repairExportRows.filter((r) => isSmartLampId(r.lampId));
  const smartReport = reportExportRows.filter((r) => isSmartLampId(r.lampId));

  const seen = new Set<string>();
  const rows: CaseMasterRow[] = [];

  for (const row of smartRepair) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(toCaseMasterRow(row, true));
  }
  for (const row of smartReport) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(toCaseMasterRow(row, false));
  }

  rows.sort((a, b) => compareDateStrings(a.filedDate, b.filedDate));

  return {
    rows,
    smartLampRepairCount: smartRepair.length,
    smartLampReportCount: smartReport.length,
    nonSmartLampRepairExcluded: repairExportRows.length - smartRepair.length,
    nonSmartLampReportExcluded: reportExportRows.length - smartReport.length,
  };
}
