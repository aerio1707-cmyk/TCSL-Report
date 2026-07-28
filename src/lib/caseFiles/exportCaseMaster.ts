import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "./sheetUtils";
import type { CaseExportRow, CaseMasterRow } from "./types";

const MAIN_HEADERS = [
  "案件編號",
  "路燈編號",
  "燈具編號",
  "控制器編號",
  "行政區",
  "故障類別",
  "通報來源",
  "立案日期",
  "逾期時數",
  "維修原因",
  "施工內容",
  "完工時間",
  "案件狀態",
  "是否結案",
  "備註",
];

const COLLISION_HEADERS = ["案件編號", "路燈編號", "行政區", "故障類別", "立案日期", "來源類型", "來源檔案"];

// 對應規劃文件第 3 節「維修案件統計.xlsx」：
//   分頁「維修案件統計」：一案一列（已依 buildCaseMaster 排序過，這裡不重排）。
//   分頁「案件編號重複警示明細」：兩種來源檔案（維修案件匯出／報修清單匯出）
//   各自去重後仍撞號的資料合併列出，供人工複查。兩個分頁都固定寫表頭，
//   就算某一類完全沒有撞號資料，分頁也不會是空白的。
export function exportCaseMasterWorkbook(caseRows: CaseMasterRow[], collisions: CaseExportRow[]): void {
  const wb = XLSX.utils.book_new();

  const mainSheetData = caseRows.map((r) => ({
    案件編號: r.caseNo,
    路燈編號: r.lampId,
    燈具編號: r.fixtureId,
    控制器編號: r.controllerId,
    行政區: r.district,
    故障類別: r.faultType,
    通報來源: r.reportSource,
    立案日期: r.filedDate,
    逾期時數: r.overdueHours,
    維修原因: r.repairReason,
    施工內容: r.workContent,
    完工時間: r.completedTime,
    案件狀態: r.status,
    是否結案: r.isClosed ? "是" : "否",
    備註: r.note,
  }));
  const mainSheet = jsonToSheetWithHeaders(mainSheetData, MAIN_HEADERS);
  XLSX.utils.book_append_sheet(wb, mainSheet, "維修案件統計");

  const collisionData = collisions.map((r) => ({
    案件編號: r.caseNo,
    路燈編號: r.lampId,
    行政區: r.district,
    故障類別: r.faultType,
    立案日期: r.filedDate,
    來源類型: r.sourceKind === "repairExport" ? "維修案件匯出（已結案）" : "報修清單匯出（未結案）",
    來源檔案: r.sourceFile,
  }));
  const collisionSheet = jsonToSheetWithHeaders(collisionData, COLLISION_HEADERS);
  XLSX.utils.book_append_sheet(wb, collisionSheet, "案件編號重複警示明細");

  XLSX.writeFile(wb, "維修案件統計.xlsx");
}
