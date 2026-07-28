// Info_Order.csv 每個欄位值都包在 Excel 公式防呆格式裡，例如 ="控制器離線"，
// 而不是單純的「控制器離線」，需要先拆殼才能使用。
const WRAPPED = /^="([\s\S]*)"$/;

export function unwrapCsvValue(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value).trim();
  const m = WRAPPED.exec(s);
  return m ? m[1] : s;
}
