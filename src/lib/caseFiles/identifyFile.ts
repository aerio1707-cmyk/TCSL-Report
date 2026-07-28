import type { SourceFileKind } from "./types";

// 依檔名關鍵字比對，不依賴內部分頁名稱、不限定年份前綴——
// 「維修案件匯出」「維修案件匯出 (1)」「維修案件匯出 (2)」…皆比對得到，
// 「智能燈清冊.xlsx」也不需要「114年」這種年份字樣。
export function identifyFile(fileName: string): SourceFileKind | null {
  const name = fileName.toLowerCase();
  if (name.includes("info_order") && name.endsWith(".csv")) return "infoOrder";
  if (fileName.includes("維修案件匯出")) return "repairExport";
  if (fileName.includes("報修清單匯出")) return "reportExport";
  if (fileName.includes("智能燈清冊")) return "lampMaster";
  return null;
}
