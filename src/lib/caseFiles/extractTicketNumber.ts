// 從 Info_Order.csv 的 notify_result 欄位擷取報修單號，取代舊 xlsm 的
// 「燈桿編號＋±1天時間窗」模糊比對。已用真實資料驗證：
//   主規則「工單編號 : N...」命中 1153/1170（98.5%）筆真實案件編號；
//   次規則「status : 9 (...案件N...進行中...)」命中 41/41（100%）。
// 兩條規則合計也涵蓋了台電合併批次（note 欄位為逗號分隔燈桿清單）大部分的報修單號，
// 不需要額外模擬「每 30 筆一批」的合併邏輯。兩者都抓不到時留空，不做模糊比對備援。
const PRIMARY_TICKET_RE = /工單編號\s*[:：]\s*(\S+)/;
const SECONDARY_TICKET_RE = /案件(\S+?)進行中/;

export function extractTicketNumber(notifyResult: string): string {
  const primary = PRIMARY_TICKET_RE.exec(notifyResult);
  if (primary) return primary[1];
  const secondary = SECONDARY_TICKET_RE.exec(notifyResult);
  if (secondary) return secondary[1];
  return "";
}
