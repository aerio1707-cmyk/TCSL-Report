import * as XLSX from "xlsx";
import { unwrapCsvValue } from "./unwrapCsv";
import type { InfoOrderRow } from "./types";

const HEADERS = [
  "idx",
  "type",
  "district",
  "content",
  "notify",
  "notify_time",
  "creation_time",
  "streetlight_id",
  "notify_result",
  "controller_id",
  "poles_id",
  "note",
] as const;

export async function readInfoOrderFile(file: File): Promise<InfoOrderRow[]> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // 去除 UTF-8 BOM

  const wb = XLSX.read(text, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) {
    throw new Error(`「${file.name}」找不到資料列，請確認檔案內容是否正確`);
  }
  for (const key of HEADERS) {
    if (!(key in rows[0])) {
      throw new Error(`「${file.name}」找不到欄位「${key}」，請確認來源檔表頭是否變動`);
    }
  }

  return rows.map((r) => ({
    idx: unwrapCsvValue(r.idx),
    type: unwrapCsvValue(r.type),
    district: unwrapCsvValue(r.district),
    content: unwrapCsvValue(r.content),
    notify: unwrapCsvValue(r.notify),
    notifyTime: unwrapCsvValue(r.notify_time),
    creationTime: unwrapCsvValue(r.creation_time),
    streetlightId: unwrapCsvValue(r.streetlight_id),
    notifyResult: unwrapCsvValue(r.notify_result),
    controllerId: unwrapCsvValue(r.controller_id),
    polesId: unwrapCsvValue(r.poles_id),
    note: unwrapCsvValue(r.note),
    sourceFile: file.name,
  }));
}
