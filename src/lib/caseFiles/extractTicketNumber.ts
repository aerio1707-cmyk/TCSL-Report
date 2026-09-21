// 從 Info_Order.csv 的 notify_result 欄位擷取報修單號，取代舊 xlsm 的
// 「燈桿編號＋±1天時間窗」模糊比對。已用真實資料驗證：
// 主規則「工單編號 : N...」命中 1153/1170（98.5%）筆真實案件編號，抓不到時
// 留空，不做模糊比對備援。
//
// 曾經有過「次規則」：「status : 9 (...案件N...進行中...)」抓案件編號當成
// 已開單（命中 41/41）。2026-09-21 發現「維修案件統計」跟 PS4.1 的系統開單
// N（未開單筆數）對不起來，查證後同一批訊息文字是「status : 9 (有立案日期
// 相同的重複路燈編號案件N...進行中，所以不會立案)」——這句話本身就寫明
// 「所以不會立案」，是系統判定不重複開單、直接跳過的事件，不是真的開了新
// 工單；PS4.1 那邊（infoOrderReconcile.ts 的 DISABLED_RE）本來就把這類
// status:9 訊息全部算進「未開單/重複偵測」。次規則把它誤算成已開單，才會
// 讓兩張圖表的「開單/未開單」總數對不上，所以拿掉了，兩邊口徑才會一致。
const PRIMARY_TICKET_RE = /工單編號\s*[:：]\s*(\S+)/;

export function extractTicketNumber(notifyResult: string): string {
  const primary = PRIMARY_TICKET_RE.exec(notifyResult);
  return primary ? primary[1] : "";
}
