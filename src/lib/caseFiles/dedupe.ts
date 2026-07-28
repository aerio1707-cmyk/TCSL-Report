// 全欄位去重引擎，沿用 ESS-Report-Tracker「維修案件分析」頁籤已上線驗證過的規則
// （src/lib/repair/parseRepair.ts）：
//   1. 案件編號（或指定主鍵欄位）＋其餘所有欄位皆相同 → 判定系統重複匯出，只保留 1 筆。
//   2. 主鍵欄位相同、其餘欄位有差異（撞號）→ 全部保留計算，不刪除、不猜哪筆對，
//      只列出來供人工複查。「主鍵不保證唯一」是這系列來源資料的重要資料品質特性。
//
// sourceFile 欄位刻意排除在雜湊之外，這樣「同一筆資料出現在兩個不同匯出檔案裡」
// 仍然會被判定為完全重複（例如兩份日期重疊的維修案件匯出檔案）。

export interface DedupResult<T> {
  rows: T[]; // 去重後保留的全部資料（含撞號，撞號的資料仍然保留在這裡）
  duplicateRowsRemoved: number;
  collisions: T[]; // 主鍵相同但內容不同，依主鍵排序後攤平列出
}

function normalizeCell(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "" : String(value);
}

function rowHashKey(row: object): string {
  const record = row as Record<string, unknown>;
  return JSON.stringify(
    Object.keys(record)
      .filter((k) => k !== "sourceFile")
      .sort()
      .map((k) => [k, normalizeCell(record[k])])
  );
}

export function dedupeRows<T extends object>(rows: T[], keyField: keyof T): DedupResult<T> {
  const seen = new Map<string, T>();
  let duplicateRowsRemoved = 0;
  for (const row of rows) {
    const key = rowHashKey(row);
    if (seen.has(key)) {
      duplicateRowsRemoved++;
    } else {
      seen.set(key, row);
    }
  }

  const kept = [...seen.values()];

  const byKey = new Map<string, T[]>();
  for (const row of kept) {
    const k = normalizeCell(row[keyField]);
    const group = byKey.get(k);
    if (group) group.push(row);
    else byKey.set(k, [row]);
  }

  const collisions = [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, group]) => group);

  return { rows: kept, duplicateRowsRemoved, collisions };
}
