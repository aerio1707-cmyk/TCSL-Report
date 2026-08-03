import { compareDateStrings } from "../caseFiles/dateSort";
import type { CaseExportRow } from "../caseFiles/types";

// 跟既有「案件主檔」頁籤的 buildCaseMaster 不同：PS4.1 分析要用到全部案件
// （清冊/非清冊兩者都要統計），所以這裡合併去重「不做 7 碼智能燈篩選」，
// 7 碼＋控制器編號的智能燈判定改在後續分類階段（classifyLampList）處理。
// 已結案（repairExport）版本欄位較完整，優先採用；案件編號同時出現在兩邊時
// 保留已結案版本。
//
// 案件編號不保證唯一（既有教訓，見 dedupe.ts）：同一來源檔案內部撞號時，
// 這裡跟 buildCaseMaster 同樣的取捨——依陣列順序只取第一筆代表列，不重複
// 展開，複查責任交給 analyzePs41Uploads 回傳的 repairCollisions/reportCollisions
// 明細（畫面上會顯示警示 banner），不能讓筆數悄悄對不起來卻沒有任何說明。
export function buildAllCaseRows(
  repairExportRows: CaseExportRow[],
  reportExportRows: CaseExportRow[]
): CaseExportRow[] {
  const seen = new Set<string>();
  const rows: CaseExportRow[] = [];

  for (const row of repairExportRows) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(row);
  }
  for (const row of reportExportRows) {
    if (seen.has(row.caseNo)) continue;
    seen.add(row.caseNo);
    rows.push(row);
  }

  rows.sort((a, b) => compareDateStrings(a.filedDate, b.filedDate));
  return rows;
}
