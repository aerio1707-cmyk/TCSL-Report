// 手動實作 RFC4180 風格的 CSV 解析（逗號分隔、雙引號括住欄位、"" 為跳脫引號），
// 不透過 SheetJS 讀 CSV——因為 Info_Order.csv 的 notify_time/creation_time 兩欄
// 是沒有包殼的純日期文字，SheetJS 的 CSV 讀取器會自動猜測成日期序列數字，
// 即使加上 raw:false 也只能拿回被重新格式化、遺失秒數精度的日期字串，並非原文。
// 全部當純文字解析可以完全避開這個問題。
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text).filter((r) => !(r.length === 1 && r[0] === ""));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key] = row[idx] ?? "";
    });
    return record;
  });
}
