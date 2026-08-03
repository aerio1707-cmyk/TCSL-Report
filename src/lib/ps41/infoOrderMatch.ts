import type { InfoOrderRow } from "../caseFiles/types";
import { parseDateTime } from "./weekBucket";

const ONE_DAY_MS = 86400000;

export type InfoOrderIndex = Map<string, Date[]>;

function indexKey(polesId: string, controllerId: string): string {
  return `${polesId}|${controllerId}`;
}

export function buildInfoOrderIndex(rows: InfoOrderRow[]): InfoOrderIndex {
  const index: InfoOrderIndex = new Map();
  for (const row of rows) {
    if (!row.polesId || !row.controllerId) continue;
    const d = parseDateTime(row.creationTime);
    if (!d) continue;
    const key = indexKey(row.polesId, row.controllerId);
    const list = index.get(key);
    if (list) list.push(d);
    else index.set(key, [d]);
  }
  return index;
}

// 已用真實資料逐列驗證 100% 吻合原公式：在 InfoOrder 找「poles_id+controller_id」
// 都相符的紀錄，若存在一筆 creation_time 滿足
// 「creation_time ≤ 立案日期 且 立案日期－creation_time ≤ 1天」→ 系統已提前偵測。
export function systemDetectedInAdvance(
  lampId: string,
  controllerId: string,
  filedDate: Date,
  index: InfoOrderIndex
): boolean {
  const matches = index.get(indexKey(lampId, controllerId));
  if (!matches) return false;
  return matches.some((m) => m.getTime() <= filedDate.getTime() && filedDate.getTime() - m.getTime() <= ONE_DAY_MS);
}
