import { extractTicketNumber } from "../caseFiles/extractTicketNumber";
import type { InfoOrderRow } from "../caseFiles/types";
import { classifyLampList } from "./classifyLampList";
import type { WeekBucketInfo } from "./weekBucket";
import { mondayKeyOf, parseDateTime } from "./weekBucket";

// Info_Order.csv 記錄系統監控端「每一次偵測事件」，跟「系統開單」（案件匯出
// 檔案裡通報來源=自主API/承商自主通報的實際案件）不是同一件事——一次偵測
// 不一定會真的開出案件。用真實資料驗證過（2026-09-14 使用者回報數字對不起來
// 才發現）：同一週 Info_Order 102 筆，其中只有 50 筆的 notify_result 抓得到
// 「工單編號：N...」（真的開了新案件），其餘 52 筆是 `polesId : ... 整排路燈
// 不亮` 這種「偵測到但未開單」樣式。這個模組把每一筆 Info_Order 拆成三類，
// 讓「系統開單」旁邊可以附上對帳用的輔助數字，不用再翻原始檔案人工比對。
//
// 只分類「清冊」範圍的列（跟 FAIL 判定同一個前提：InfoOrder 跨表比對需要
// 控制器編號，controllerId 空白或 polesId 不在清冊裡的偵測事件不列入對帳）。
// 手動開立工單（type=G）不是系統自動偵測，排除在外。
export type InfoOrderTicketStatus = "ticketed" | "duplicate" | "undetected";

export interface ClassifiedInfoOrderRow {
  weekKey: string | null; // null = 不在清冊範圍或日期無法解析，不列入對帳
  ticketStatus: InfoOrderTicketStatus | null;
}

const PRIMARY_TICKET_RE = /工單編號\s*[:：]\s*\S+/;
const MANUAL_ORDER_TYPE = "G";

function ticketStatusOf(notifyResult: string): InfoOrderTicketStatus {
  if (PRIMARY_TICKET_RE.test(notifyResult)) return "ticketed"; // 抓到工單編號＝真的開了新案件
  if (extractTicketNumber(notifyResult)) return "duplicate"; // 次規則命中＝重複偵測到既有案件
  return "undetected"; // 兩條規則都抓不到＝偵測到但未開單
}

export function classifyInfoOrderRows(
  rows: InfoOrderRow[],
  lampSet: Set<string>,
  weekMap: Map<string, WeekBucketInfo>
): ClassifiedInfoOrderRow[] {
  return rows.map((row) => {
    if (row.type === MANUAL_ORDER_TYPE) return { weekKey: null, ticketStatus: null };
    if (classifyLampList(row.polesId, row.controllerId, lampSet) !== "清冊名單") {
      return { weekKey: null, ticketStatus: null };
    }
    const d = parseDateTime(row.creationTime);
    const weekKey = d ? (weekMap.get(mondayKeyOf(d))?.weekKey ?? null) : null;
    if (!weekKey) return { weekKey: null, ticketStatus: null };
    return { weekKey, ticketStatus: ticketStatusOf(row.notifyResult) };
  });
}
