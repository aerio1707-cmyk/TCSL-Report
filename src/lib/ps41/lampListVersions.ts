import type { LampMasterRow } from "../caseFiles/types";

// 智能燈清冊會分期更新（例如新增一批控制器建檔），舊清冊在新清冊生效日之前
// 仍然有效，不能整批用新清冊覆蓋掉舊資料的判定。檔名慣例：
// 「智能燈清冊_<總筆數>_<生效日期YYYYMMDD>.xlsx」，例如「智能燈清冊_6115_20260914」
// 表示這份 6115 筆的清冊從 2026-09-14 起生效。沒有日期段的檔名（例如舊格式
// 「智能燈清冊_2795.xlsx」或原始「智能燈清冊.xlsx」）視為「預設版本」，適用於
// 在最早一個有日期的版本生效之前的所有資料；只上傳一份無日期檔案時，行為
// 跟改版前完全一樣（全部資料都套同一份清冊）。
export interface LampListVersion {
  effectiveFrom: Date | null; // null = 預設版本，排在時間軸最前面
  lampSet: Set<string>;
  totalRows: number;
  sourceFiles: string[];
}

// 只找「獨立的 8 碼數字」（前後不能緊接其他數字），避免跟檔名裡的總筆數
// （3~5 碼）混在一起誤判；8 碼裡月/日不合法就當作沒有日期，退回預設版本，
// 不要讓一個湊巧是 8 碼的總筆數把整份清冊誤判成某個生效日。
const DATE_TOKEN_RE = /(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/;

export function parseLampMasterEffectiveDate(fileName: string): Date | null {
  const match = DATE_TOKEN_RE.exec(fileName);
  if (!match) return null;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const d = new Date(year, month - 1, day);
  const valid = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  return valid ? d : null;
}

// 同一個生效日（含都沒有日期的預設版本）如果有多份檔案，清冊取聯集。
export function buildLampListVersions(files: { name: string; rows: LampMasterRow[] }[]): LampListVersion[] {
  const groups = new Map<number | null, LampListVersion>();

  for (const file of files) {
    const effectiveFrom = parseLampMasterEffectiveDate(file.name);
    const key = effectiveFrom ? effectiveFrom.getTime() : null;
    let group = groups.get(key);
    if (!group) {
      group = { effectiveFrom, lampSet: new Set(), totalRows: 0, sourceFiles: [] };
      groups.set(key, group);
    }
    group.sourceFiles.push(file.name);
    for (const row of file.rows) {
      if (row.lampId === "") continue;
      group.lampSet.add(row.lampId);
    }
    group.totalRows += file.rows.length;
  }

  return [...groups.values()].sort((a, b) => {
    const at = a.effectiveFrom ? a.effectiveFrom.getTime() : -Infinity;
    const bt = b.effectiveFrom ? b.effectiveFrom.getTime() : -Infinity;
    return at - bt;
  });
}

// 依資料本身的日期（案件立案日期 / Info_Order 偵測時間）挑選當時生效的清冊版本：
// 由新到舊找第一個 effectiveFrom <= date 的版本；日期早於所有標日期版本、或日期
// 無法解析時，退回預設版本（時間軸最前面那一版）。
export function pickLampSetForDate(versions: LampListVersion[], date: Date | null): Set<string> {
  if (versions.length === 0) return new Set();
  if (!date) return versions[0].lampSet;

  let chosen = versions[0];
  for (const v of versions) {
    const t = v.effectiveFrom ? v.effectiveFrom.getTime() : -Infinity;
    if (t <= date.getTime()) chosen = v;
    else break;
  }
  return chosen.lampSet;
}
