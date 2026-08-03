import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "../caseFiles/sheetUtils";
import type { AnalysisCandidateRow } from "./types";

const HEADERS = [
  "案件編號", "路燈編號", "控制器編號", "行政區", "故障類別", "通報來源", "立案日期",
  "週次", "維修原因", "施工內容", "備註", "系統建議分類", "人工最終決定", "來源檔案",
];

function toRow(c: AnalysisCandidateRow) {
  return {
    案件編號: c.caseNo,
    路燈編號: c.lampId,
    控制器編號: c.controllerId,
    行政區: c.district,
    故障類別: c.faultType,
    通報來源: c.reportSource,
    立案日期: c.filedDate,
    週次: c.weekLabel ?? "",
    維修原因: c.repairReason,
    施工內容: c.workContent,
    備註: c.note,
    系統建議分類: c.suggestedCategory,
    人工最終決定: c.decision === "include" ? "列入FAIL" : c.decision === "exclude" ? "排除" : "（尚未審核）",
    來源檔案: c.sourceFile,
  };
}

// 分析清冊：全部「分析候選」案件明細。
export function exportAnalysisListWorkbook(candidates: AnalysisCandidateRow[]): void {
  const wb = XLSX.utils.book_new();
  const ws = jsonToSheetWithHeaders(candidates.map(toRow), HEADERS);
  XLSX.utils.book_append_sheet(wb, ws, "分析清冊");
  XLSX.writeFile(wb, "分析清冊.xlsx");
}

// FAIL 清冊：候選中人工判定「列入 FAIL」的案件明細。
export function exportFailListWorkbook(candidates: AnalysisCandidateRow[]): void {
  const failRows = candidates.filter((c) => c.decision === "include");
  const wb = XLSX.utils.book_new();
  const ws = jsonToSheetWithHeaders(failRows.map(toRow), HEADERS);
  XLSX.utils.book_append_sheet(wb, ws, "FAIL清冊");
  XLSX.writeFile(wb, "FAIL清冊.xlsx");
}
