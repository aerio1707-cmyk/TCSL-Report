// PS4.1 分析系統型別定義，對應規劃文件 v4。

export type LampListStatus = "清冊名單" | "非清冊名單";

export type NotifyCategory = "system" | "citizen"; // 系統開單 / 民眾通報

// classify() 沿用 ESS-Report-Tracker src/lib/repair/classify.ts 的 7 類。
export type RepairCategory = "燈具" | "電源" | "網路訊號" | "智控器" | "台電" | "正常" | "其他";

export type FailDecision = "include" | "exclude"; // 列入 FAIL / 排除
export type DecisionSource = "suggested" | "imported" | "manual";

// 逐筆案件分類後的結果（已去重、已合併已結案/未結案）。
export interface ClassifiedCaseRow {
  caseNo: string;
  lampId: string;
  controllerId: string;
  district: string;
  faultType: string;
  reportSource: string;
  filedDate: string;
  repairReason: string;
  workContent: string;
  note: string;
  status: string;
  sourceFile: string;
  weekKey: string | null; // 週一日期 yyyy-mm-dd，供排序用
  weekLabel: string | null; // "M月/WN"
  lampListStatus: LampListStatus | null; // null = 控制器編號空白，未列入清冊/非清冊統計
  notifyCategory: NotifyCategory | null; // null = 通報來源無法辨識（理論上不會發生）
}

// 「分析」候選案件：ClassifiedCaseRow 再加上 FAIL 相關欄位。
export interface AnalysisCandidateRow extends ClassifiedCaseRow {
  suggestedCategory: RepairCategory;
  suggestedDecision: FailDecision | undefined; // undefined = 系統不給預設建議（「其他」類）
  decision: FailDecision | undefined; // 使用者最終決定，初始值 = suggestedDecision
  decisionSource: DecisionSource;
}

export interface ReviewDecisionEntry {
  key: string; // 案件編號｜路燈編號｜立案日期
  caseNo: string;
  lampId: string;
  filedDate: string;
  decision: FailDecision;
  reviewedAt: string;
}

export const CHANNEL_LABELS = [
  "0809電話通報",
  "民眾通報",
  "1999自動通報",
  "1999手動通報",
  "機關通報",
  "里長通報",
  "自主API",
  "承商自主通報",
] as const;
export type ChannelLabel = (typeof CHANNEL_LABELS)[number];

export interface WeeklyChannelBreakdown {
  weekKey: string;
  weekLabel: string;
  systemCount: number; // 系統開單 = 自主API + 承商自主通報
  citizenCount: number; // 民眾通報 = 其餘 6 類
  failCount: number; // 僅清冊才有意義，非清冊固定 0
  channels: Record<ChannelLabel, number>;
}

export interface WeeklyStatsResult {
  listed: WeeklyChannelBreakdown[]; // 清冊
  unlisted: WeeklyChannelBreakdown[]; // 非清冊
}
