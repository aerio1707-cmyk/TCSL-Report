import * as XLSX from "xlsx";
import type { LampMasterRow } from "./types";

const REQUIRED_HEADERS = ["項次", "路燈編號", "行政區", "詳細位置", "經度", "緯度", "燈桿類型"] as const;

function cell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

// 智能燈清冊是主檔資料，不套用去重規則（見規劃文件 2.1）。
export async function readLampMasterFile(file: File): Promise<LampMasterRow[]> {
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

  return rows.map((r) => ({
    seq: cell(r["項次"]),
    lampId: cell(r["路燈編號"]),
    district: cell(r["行政區"]),
    address: cell(r["詳細位置"]),
    lng: cell(r["經度"]),
    lat: cell(r["緯度"]),
    poleType: cell(r["燈桿類型"]),
    sourceFile: file.name,
  }));
}
