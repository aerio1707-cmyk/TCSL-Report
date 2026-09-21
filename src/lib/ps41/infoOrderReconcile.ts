import type { InfoOrderRow } from "../caseFiles/types";
import { classifyLampList } from "./classifyLampList";
import type { LampListVersion } from "./lampListVersions";
import { pickLampSetForDate } from "./lampListVersions";
import type { WeekBucketInfo } from "./weekBucket";
import { mondayKeyOf, parseDateTime } from "./weekBucket";

// Info_Order.csv 記錄系統監控端「每一次偵測事件」，跟「系統開單」（案件匯出
// 檔案裡通報來源=自主API/承商自主通報的實際案件）不是同一件事——一次偵測
// 不一定會真的開出案件。用真實資料驗證過（2026-09-14 使用者回報數字對不起來
// 才發現）：同一週 Info_Order 102 筆，只有 50 筆的 notify_result 抓得到
// 「工單編號：N...」（真的開了新案件），其餘 52 筆進一步拆解成三種未開單
// 樣式：22 筆「整排路燈不亮」、30 筆「status:9(...)」（使用者稱之
// 為「重複偵測」——已經有既有案件在處理，系統才會跳過不重複開單）、0 筆其他。
// 這個模組把每一筆 Info_Order 拆成這幾類，讓「系統開單」旁邊可以附上對帳用
// 的輔助數字，不用再翻原始檔案人工比對。
//
// status:9 的訊息內容不只一種寫法（2026-09-21 使用者回報「系統開單21」跟
// 「維修案件統計42」對不起來，追查後發現這筆被誤分到「其他」才發現）：
// 「status:9(此路燈已停用)」跟「status:9(有立案日期相同的重複路燈編號案件
// N...進行中，所以不會立案)」都是同一件事（既有案件已在處理，這次不重複
// 開單），只是文字不同，兩種都要算進「重複偵測」。實際資料掃過 Info_Order
// 全部 378 筆 status:9（排除已有工單編號的）確認只有這兩種寫法，用
// 「status:9(」開頭比對即可涵蓋，不用逐字比對括號內容。
//
// 「幽靈工單」（2026-09-21 使用者回報清冊改版修完後兩張圖還是差5筆才發現）：
// Info_Order 認為抓到工單編號＝已經開單，但那個工單編號在案件匯出檔案裡根本
// 不存在（用真實資料驗證過：缺的5個工單號前後緊鄰的號碼都查得到，不是匯出
// 時間差造成整批漏收，是系統這端記了工單號、案件那端卻沒建立案件的個別缺口）。
// 這種「Info_Order說有開單、案件檔案查無案件」的事件跟「真的對到案件」的
// ticketed 要分開算，系統開單才不會虛報成案件檔案裡不存在的數字。
export type InfoOrderReconcileStatus = "ticketed" | "ghost" | "wholeRowUnlit" | "disabled" | "other";

export interface ClassifiedInfoOrderRow {
  weekKey: string | null; // null = 不在清冊範圍或日期無法解析，不列入對帳
  status: InfoOrderReconcileStatus | null;
}

const PRIMARY_TICKET_RE = /工單編號\s*[:：]\s*(\S+)/;
const WHOLE_ROW_UNLIT_RE = /整排路燈不亮/;
const DISABLED_RE = /status\s*[:：]\s*9\s*\(/;
const MANUAL_ORDER_TYPE = "G";

function reconcileStatusOf(notifyResult: string, knownCaseNos: Set<string>): InfoOrderReconcileStatus {
  const primary = PRIMARY_TICKET_RE.exec(notifyResult);
  if (primary) return knownCaseNos.has(primary[1]) ? "ticketed" : "ghost"; // 抓到工單編號，但要案件檔案裡真的查得到才算「已成案」
  if (WHOLE_ROW_UNLIT_RE.test(notifyResult)) return "wholeRowUnlit";
  if (DISABLED_RE.test(notifyResult)) return "disabled"; // 使用者稱之為「重複偵測」
  return "other"; // 系統錯誤等其他少見樣式
}

// 清冊判定依「偵測時間」挑當時生效的清冊版本（見 lampListVersions.ts），
// 跟 classifyAllCases 用同一套版本時間軸，兩邊清冊改版當週的判定才會一致。
// knownCaseNos：案件匯出檔案（報修清單/維修案件）裡實際存在的案件編號集合，
// 用來判定 Info_Order 抓到的工單編號是不是「幽靈工單」。
export function classifyInfoOrderRows(
  rows: InfoOrderRow[],
  lampListVersions: LampListVersion[],
  weekMap: Map<string, WeekBucketInfo>,
  knownCaseNos: Set<string>
): ClassifiedInfoOrderRow[] {
  return rows.map((row) => {
    if (row.type === MANUAL_ORDER_TYPE) return { weekKey: null, status: null };
    const d = parseDateTime(row.creationTime);
    if (classifyLampList(row.polesId, row.controllerId, pickLampSetForDate(lampListVersions, d)) !== "清冊名單") {
      return { weekKey: null, status: null };
    }
    const weekKey = d ? (weekMap.get(mondayKeyOf(d))?.weekKey ?? null) : null;
    if (!weekKey) return { weekKey: null, status: null };
    return { weekKey, status: reconcileStatusOf(row.notifyResult, knownCaseNos) };
  });
}
