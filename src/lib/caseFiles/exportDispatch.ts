import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "./sheetUtils";
import type { CaseMasterRow, DispatchRow } from "./types";

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
  "案件立案日期",
  "案件故障類別",
  "案件維修原因",
  "案件施工內容",
  "案件完工時間",
  "案件狀態",
  "案件是否結案",
  "案件備註",
  "來源檔案",
];

// 對應規劃文件第 3 節「自主API派工.xlsx」：Info_Order 逐筆原始欄位 +
// 比對到的報修單號（已依 buildDispatchRows 依系統開單時間排序過），
// 若報修單號比對到案件主檔裡的案件，額外把該案件的處理詳情（故障類別、
// 維修原因、施工內容、完工時間、案件狀態、備註）補進來，讓「比對到哪張單」
// 跟「那張單後續處理結果」一次看到；比對不到的話這些欄位留空。
// 不重現舊 xlsm 的合併儲存格＋背景色圖例橫幅（使用者確認不需要）。
export function exportDispatchWorkbook(rows: DispatchRow[], caseRows: CaseMasterRow[] = []): void {
  const wb = XLSX.utils.book_new();

  const caseByNo = new Map(caseRows.map((r) => [r.caseNo, r]));

  const data = rows.map((r) => {
    const matched = r.ticketNo ? caseByNo.get(r.ticketNo) : undefined;
    return {
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
      案件立案日期: matched?.filedDate ?? "",
      案件故障類別: matched?.faultType ?? "",
      案件維修原因: matched?.repairReason ?? "",
      案件施工內容: matched?.workContent ?? "",
      案件完工時間: matched?.completedTime ?? "",
      案件狀態: matched?.status ?? "",
      案件是否結案: matched ? (matched.isClosed ? "是" : "否") : "",
      案件備註: matched?.note ?? "",
      來源檔案: r.sourceFile,
    };
  });
  const sheet = jsonToSheetWithHeaders(data, HEADERS);
  XLSX.utils.book_append_sheet(wb, sheet, "自主API派工");

  XLSX.writeFile(wb, "自主API派工.xlsx");
}
