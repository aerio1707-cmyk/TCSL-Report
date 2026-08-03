import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "../caseFiles/sheetUtils";
import type { AnalysisCandidateRow, FailDecision } from "./types";

const HEADERS = ["識別鍵", "案件編號", "路燈編號", "立案日期", "系統建議分類", "人工最終決定", "審核時間"];

// 案件編號不保證唯一（既有教訓），審核決策用「案件編號＋路燈編號＋立案日期」組合鍵，
// 下次上傳新一批來源檔案時可以比對回上次審過的案件，不用每週重審。
export function decisionKeyOf(caseNo: string, lampId: string, filedDate: string): string {
  return `${caseNo}｜${lampId}｜${filedDate}`;
}

export function exportReviewDecisions(candidates: AnalysisCandidateRow[]): void {
  const reviewedAt = new Date().toISOString();
  const decided = candidates.filter((c) => c.decision !== undefined);

  const data = decided.map((c) => ({
    識別鍵: decisionKeyOf(c.caseNo, c.lampId, c.filedDate),
    案件編號: c.caseNo,
    路燈編號: c.lampId,
    立案日期: c.filedDate,
    系統建議分類: c.suggestedCategory,
    人工最終決定: c.decision === "include" ? "列入FAIL" : "排除",
    審核時間: reviewedAt,
  }));

  const wb = XLSX.utils.book_new();
  const ws = jsonToSheetWithHeaders(data, HEADERS);
  XLSX.utils.book_append_sheet(wb, ws, "審核決策");
  XLSX.writeFile(wb, "PS41審核決策.xlsx");
}

export async function parseReviewDecisionFile(file: File): Promise<Map<string, FailDecision>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  const map = new Map<string, FailDecision>();
  for (const r of rows) {
    const key = String(r["識別鍵"] ?? "").trim();
    const decisionText = String(r["人工最終決定"] ?? "").trim();
    if (!key) continue;
    const decision: FailDecision = decisionText === "列入FAIL" ? "include" : "exclude";
    map.set(key, decision);
  }
  return map;
}

// 凡是識別鍵能對上的案件，自動帶入上次的人工決定；對不上的（真正新出現的候選）
// 維持系統建議，不受匯入檔案影響。
export function applyReviewDecisions(
  candidates: AnalysisCandidateRow[],
  imported: Map<string, FailDecision>
): AnalysisCandidateRow[] {
  return candidates.map((c) => {
    const key = decisionKeyOf(c.caseNo, c.lampId, c.filedDate);
    const prior = imported.get(key);
    if (prior === undefined) return c;
    return { ...c, decision: prior, decisionSource: "imported" as const };
  });
}
