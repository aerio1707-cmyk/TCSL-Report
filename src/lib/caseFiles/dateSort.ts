// 依「舊到新」排序用的日期字串比較，日期格式異常時退回字串排序，不讓整批排序中斷。
export function compareDateStrings(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return a.localeCompare(b);
  if (Number.isNaN(ta)) return -1;
  if (Number.isNaN(tb)) return 1;
  return ta - tb;
}
