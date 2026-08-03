import type { LampMasterRow } from "../caseFiles/types";
import type { LampListStatus } from "./types";

export function buildLampSet(lampMasterRows: LampMasterRow[]): Set<string> {
  return new Set(lampMasterRows.map((r) => r.lampId).filter((id) => id !== ""));
}

// 已用真實資料逐列驗證 100% 吻合原公式：清冊/非清冊分類的必要條件是
// 「控制器編號非空白」——不是原檔案的疏漏，是智能燈判定的一部分（一般路燈
// 本來就不會有控制器編號），使用者已確認保留。控制器編號空白 → 不分類
// （回傳 null，不列入清冊也不列入非清冊統計）。
export function classifyLampList(
  lampId: string,
  controllerId: string,
  lampSet: Set<string>
): LampListStatus | null {
  if (!controllerId.trim() || !lampId.trim()) return null;
  return lampSet.has(lampId) ? "清冊名單" : "非清冊名單";
}
