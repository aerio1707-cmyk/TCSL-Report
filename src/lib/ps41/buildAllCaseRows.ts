import { isSmartLampId } from "../caseFiles/buildCaseMaster";
import { compareDateStrings } from "../caseFiles/dateSort";
import type { CaseExportRow } from "../caseFiles/types";

// 跟既有「案件主檔」頁籤的 buildCaseMaster 一樣先篩掉非智能燈案件（路燈編號
// 非 7 碼）：控制器編號是控制器硬體才會有的欄位，非智能燈（11 碼政府資產編號）
// 結構上就不可能填控制器編號，所以「清冊/非清冊」兩個分類（都要求控制器編號
// 非空白，見 classifyLampList）本來就只可能落在 7 碼智能燈案件身上。這裡先篩
// 掉不影響任何一個最終產出（總表(周)/兩張圖表/分析清冊/FAIL清冊 都不會用到
// 非智能燈案件），先篩掉可以讓「案件總數」「控制器編號空白」這些統計數字更
// 直接對應智能燈案件本身，不會被非智能燈案件的雜訊稀釋。
//
// 已結案（repairExport）版本欄位較完整，優先採用；案件編號同時出現在兩邊時
// 保留已結案版本。
//
// 案件編號不保證唯一（既有教訓，見 dedupe.ts）：同一來源檔案內部撞號時，
// 這裡跟 buildCaseMaster 同樣的取捨——依陣列順序只取第一筆代表列，不重複
// 展開，複查責任交給 analyzePs41Uploads 回傳的 repairCollisions/reportCollisions
// 明細（畫面上會顯示警示 banner），不能讓筆數悄悄對不起來卻沒有任何說明。
export interface AllCaseRowsResult {
  rows: CaseExportRow[];
  nonSmartLampRepairExcluded: number;
  nonSmartLampReportExcluded: number;
}

export function buildAllCaseRows(
  repairExportRows: CaseExportRow[],
  reportExportRows: CaseExportRow[]
): AllCaseRowsResult {
  const smartRepair = repairExportRows.filter((r) => isSmartLampId(r.lampId));
  const smartReport = reportExportRows.filter((r) => isSmartLampId(r.lampId));

  const seen = new Set<string>();
  const rows: CaseExportRow[] = [];

  for (const row of smartRepair) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(row);
  }
  for (const row of smartReport) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(row);
  }

  rows.sort((a, b) => compareDateStrings(a.filedDate, b.filedDate));

  return {
    rows,
    nonSmartLampRepairExcluded: repairExportRows.length - smartRepair.length,
    nonSmartLampReportExcluded: reportExportRows.length - smartReport.length,
  };
}
