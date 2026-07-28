import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "./sheetUtils";
import type { DispatchRow } from "./types";

const HEADERS = [
  "idx",
  "類型",
  "行政區",
  "故障內容",
  "已通知",
  "通知時間",
  "系統開單時間",
  "路燈序號",
  "notify_result原文",
  "控制器編號",
  "燈桿編號",
  "備註",
  "報修單號",
  "來源檔案",
];

// 對應規劃文件第 3 節「自主API派工.xlsx」：Info_Order 逐筆原始欄位 +
// 比對到的報修單號（已依 buildDispatchRows 依系統開單時間排序過）。
export function exportDispatchWorkbook(rows: DispatchRow[]): void {
  const wb = XLSX.utils.book_new();

  const data = rows.map((r) => ({
    idx: r.idx,
    類型: r.type,
    行政區: r.district,
    故障內容: r.content,
    已通知: r.notify,
    通知時間: r.notifyTime,
    系統開單時間: r.creationTime,
    路燈序號: r.streetlightId,
    notify_result原文: r.notifyResult,
    控制器編號: r.controllerId,
    燈桿編號: r.polesId,
    備註: r.note,
    報修單號: r.ticketNo,
    來源檔案: r.sourceFile,
  }));
  const sheet = jsonToSheetWithHeaders(data, HEADERS);
  XLSX.utils.book_append_sheet(wb, sheet, "自主API派工");

  XLSX.writeFile(wb, "自主API派工.xlsx");
}
