import * as XLSX from "xlsx";
import { jsonToSheetWithHeaders } from "./sheetUtils";
import type { CaseMasterRow, DispatchRow } from "./types";

// 前 7 欄完全依照舊 xlsm「自主API派工」分頁左半邊（藍色圖例區塊下）的欄位
// 順序與命名排列：系統開單時間/類型/區域/控制器編號/燈桿編號/已通知/通知時間
// （原檔案欄位是「區域」不是「行政區」）。不需要 idx，直接移除。
// 其餘欄位（故障內容、路燈序號等原檔案沒有的補充資訊，以及報修單號＋案件詳情）
// 排在這 7 欄之後。
const HEADERS = [
  "系統開單時間",
  "類型",
  "區域",
  "控制器編號",
  "燈桿編號",
  "已通知",
  "通知時間",
  "故障內容",
  "路燈序號",
  "notify_result原文",
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
      系統開單時間: r.creationTime,
      類型: r.type,
      區域: r.district,
      控制器編號: r.controllerId,
      燈桿編號: r.polesId,
      已通知: r.notify,
      通知時間: r.notifyTime,
      故障內容: r.content,
      路燈序號: r.streetlightId,
      notify_result原文: r.notifyResult,
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
