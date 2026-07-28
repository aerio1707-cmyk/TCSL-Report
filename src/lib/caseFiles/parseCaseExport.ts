import * as XLSX from "xlsx";
import type { CaseExportKind, CaseExportRow } from "./types";

// 兩種來源檔案（維修案件匯出／報修清單匯出）欄位名稱與順序完全相同，
// 只差在報修清單匯出少了 5 個結案才有的欄位。
const REQUIRED_HEADERS = [
  "案件編號",
  "線下單號",
  "路燈編號",
  "專案類別",
  "是否啟用",
  "燈具編號",
  "控制器編號",
  "行政區",
  "詳細位置",
  "故障類別",
  "通報來源",
  "立案日期",
  "逾期時數",
  "狀態",
  "案件類別",
  "維修原因",
  "施工內容",
  "通報人",
  "通報人電話",
  "通報人信箱",
  "備註",
  "經度",
  "緯度",
] as const;

// 結案專屬欄位，僅 repairExport（維修案件匯出）才會有值
const REPAIR_ONLY_HEADERS = [
  "手填完工時間",
  "緊急搶修原因",
  "通知公文字號",
  "通知公文發文日期",
  "通知公文發文對象",
] as const;

function cell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

export async function readCaseExportFile(file: File, kind: CaseExportKind): Promise<CaseExportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  if (rows.length === 0) {
    throw new Error(`「${file.name}」找不到資料列，請確認檔案內容是否正確`);
  }
  for (const key of REQUIRED_HEADERS) {
    if (!(key in rows[0])) {
      throw new Error(`「${file.name}」找不到欄位「${key}」，請確認來源檔表頭是否變動`);
    }
  }
  if (kind === "repairExport") {
    for (const key of REPAIR_ONLY_HEADERS) {
      if (!(key in rows[0])) {
        throw new Error(`「${file.name}」找不到欄位「${key}」，請確認這是已結案的維修案件匯出檔案`);
      }
    }
  }

  return rows.map((r) => ({
    caseNo: cell(r["案件編號"]),
    offlineNo: cell(r["線下單號"]),
    lampId: cell(r["路燈編號"]),
    projectCategory: cell(r["專案類別"]),
    isEnabled: cell(r["是否啟用"]),
    fixtureId: cell(r["燈具編號"]),
    controllerId: cell(r["控制器編號"]),
    district: cell(r["行政區"]),
    address: cell(r["詳細位置"]),
    faultType: cell(r["故障類別"]),
    reportSource: cell(r["通報來源"]),
    filedDate: cell(r["立案日期"]),
    completedTime: kind === "repairExport" ? cell(r["手填完工時間"]) : "",
    overdueHours: cell(r["逾期時數"]),
    status: cell(r["狀態"]),
    caseCategory: cell(r["案件類別"]),
    repairReason: cell(r["維修原因"]),
    workContent: cell(r["施工內容"]),
    reporterName: cell(r["通報人"]),
    reporterPhone: cell(r["通報人電話"]),
    reporterEmail: cell(r["通報人信箱"]),
    note: cell(r["備註"]),
    lng: cell(r["經度"]),
    lat: cell(r["緯度"]),
    emergencyReason: kind === "repairExport" ? cell(r["緊急搶修原因"]) : "",
    noticeDocNo: kind === "repairExport" ? cell(r["通知公文字號"]) : "",
    noticeDocDate: kind === "repairExport" ? cell(r["通知公文發文日期"]) : "",
    noticeDocTarget: kind === "repairExport" ? cell(r["通知公文發文對象"]) : "",
    sourceKind: kind,
    sourceFile: file.name,
  }));
}
