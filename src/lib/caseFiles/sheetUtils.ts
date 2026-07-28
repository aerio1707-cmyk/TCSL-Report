import * as XLSX from "xlsx";

// XLSX.utils.json_to_sheet 在 rows 為空陣列時，因為沒有任何物件可以推出欄位鍵，
// 連表頭列都不會產生（分頁會整個是空白的）。這裡固定先寫入表頭列，
// 再把資料從第二列開始貼上，不管有幾筆資料，表頭都一定存在。
export function jsonToSheetWithHeaders<T extends Record<string, unknown>>(
  rows: T[],
  headers: string[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  if (rows.length > 0) {
    XLSX.utils.sheet_add_json(ws, rows, { skipHeader: true, origin: "A2" });
  }
  return ws;
}
