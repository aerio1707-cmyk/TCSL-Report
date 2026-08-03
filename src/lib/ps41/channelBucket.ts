import type { ChannelLabel, NotifyCategory } from "./types";

// 系統開單 = 自主API + 承商自主通報；民眾通報 = 其餘 6 類。
// 修正項：原檔案 8 種通報來源裡漏算了「1999手動通報」（2.3% 資料被跳過），
// 這次併入民眾通報。
const SYSTEM_SOURCES = new Set<string>(["自主API", "承商自主通報"]);
const CITIZEN_SOURCES = new Set<ChannelLabel>([
  "0809電話通報",
  "民眾通報",
  "1999自動通報",
  "1999手動通報",
  "機關通報",
  "里長通報",
]);

export function notifyCategoryOf(reportSource: string): NotifyCategory | null {
  if (SYSTEM_SOURCES.has(reportSource)) return "system";
  if (CITIZEN_SOURCES.has(reportSource as ChannelLabel)) return "citizen";
  return null; // 理論上不會發生（真實資料 8 種來源都已涵蓋），保留 null 以免靜默誤算
}

export function isSystemSource(reportSource: string): boolean {
  return SYSTEM_SOURCES.has(reportSource);
}
