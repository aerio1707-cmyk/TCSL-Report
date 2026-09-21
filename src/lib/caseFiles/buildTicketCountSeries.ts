import type { CaseMasterRow, DispatchRow } from "./types";

// 只有「自主API」的案件才有理由要求 Info_Order 裡有對應的建立紀錄——用真實
// 資料驗證過：自主API 500 筆裡 494 筆（98.8%）比對得到 Info_Order 工單，
// 剩下 6 筆才是真的缺紀錄；「承商自主通報」雖然跟自主API一樣算「系統開單」
// （比照 ps41/channelBucket.ts 的分類），但 25 筆裡 0 筆比對得到——這個來源
// 是承商直接回報，本來就不會經過 Info_Order 偵測，不是「缺紀錄」的特例，
// 拿來比對只會把正常案件全部誤判成異常。民眾通報幾類同理，本來就不是系統
// 偵測出來的，也不能拿來比對。
const SYSTEM_SOURCE_WITH_INFO_ORDER_LOG = "自主API";

// 「派案類別統計」的 6 種固定分類，依 Info_Order 的 type 代碼 1:1 對應
// （B/D/F/H/I 各自對應固定文字；G=手動開立工單，內容本身不固定，但這張圖裡
// 一律算作「手動開立工單」一類，不再往下細分）。目前真實資料只出現這 6 種代碼，
// 其餘代碼歸入「其他」以防未來出現新代碼時資料被靜默丟掉。
const TYPE_CATEGORY: Record<string, string> = {
  B: "控制器離線",
  D: "功率不足",
  F: "整排路燈不亮",
  G: "手動開立工單",
  H: "路燈不亮",
  I: "全天亮",
};

const DISTRICT_BREAKDOWN_CATEGORY = "整排路燈不亮";

export type Granularity = "day" | "week" | "month";

export interface DistrictCount {
  district: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  districts?: DistrictCount[]; // 僅「整排路燈不亮」才有，依受影響行政區細分
}

export interface PeriodBucket {
  key: string;
  label: string;
  total: number;
  ticketedCount: number; // notify_result 抓得到工單編號＝實際開單（沿用 DispatchRow.ticketNo）
  undetectedCount: number; // total - ticketedCount，僅偵測未開單
  // 案件檔案裡真實存在（系統來源）、但整份 Info_Order 找不到對應「工單編號：」
  // 建立紀錄的案件數——跟 PS4.1 的「幽靈工單」相反：那邊是 Info_Order 有紀錄、
  // 案件系統沒有；這裡是案件系統有這筆案件、但 Info_Order 沒留下建立紀錄。
  // 依「立案日期」歸到對應的日期桶，不計入 total／ticketedCount（本來就不在
  // Info_Order 資料裡，加進 total 會讓這個欄位失去「Info_Order 筆數」的意義），
  // 徽章/折線標籤改用「ticketedCount+missingLogCount」呈現，兩邊圖表的開單
  // 總數才能對得起來。
  missingLogCount: number;
  missingLogCaseNos: string[]; // 供 tooltip 列出案件編號
  categories: CategoryCount[];
}

export interface BuildSeriesOptions {
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd
  granularity: Granularity;
}

// 預設顯示區間：資料裡最新一天往前推 6 天（共 7 天，通常以一週為範圍）。
export function getDefaultDateRange(rows: DispatchRow[]): { start: string; end: string } {
  let latest: Date | null = null;
  for (const row of rows) {
    const d = parseCreationDate(row.creationTime);
    if (d && (!latest || d > latest)) latest = d;
  }
  const end = latest ?? new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { start: toYmd(start), end: toYmd(end) };
}

function parseCreationDate(value: string): Date | null {
  const iso = value.trim().replace(" ", "T");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // 距離本週一有幾天
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diff);
  return monday;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function bucketKeyAndLabel(d: Date, granularity: Granularity): { key: string; label: string } {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  if (granularity === "day") {
    return { key: `${y}-${pad2(m)}-${pad2(day)}`, label: `${m}月${day}日` };
  }
  if (granularity === "month") {
    return { key: `${y}-${pad2(m)}`, label: `${y}年${m}月` };
  }
  const monday = startOfWeekMonday(d);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const key = `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
  const label = `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`;
  return { key, label };
}

interface MutableBucket {
  label: string;
  total: number;
  ticketedCount: number;
  undetectedCount: number;
  missingLogCount: number;
  missingLogCaseNos: string[];
  byCategory: Map<string, number>;
  byDistrict: Map<string, number>;
}

function newBucket(label: string): MutableBucket {
  return { label, total: 0, ticketedCount: 0, undetectedCount: 0, missingLogCount: 0, missingLogCaseNos: [], byCategory: new Map(), byDistrict: new Map() };
}

export function buildTicketCountSeries(rows: DispatchRow[], caseRows: CaseMasterRow[], options: BuildSeriesOptions): PeriodBucket[] {
  const start = new Date(`${options.start}T00:00:00`);
  const end = new Date(`${options.end}T23:59:59`);

  const buckets = new Map<string, MutableBucket>();

  for (const row of rows) {
    const date = parseCreationDate(row.creationTime);
    if (!date || date < start || date > end) continue;

    const { key, label } = bucketKeyAndLabel(date, options.granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = newBucket(label);
      buckets.set(key, bucket);
    }
    bucket.total++;
    if (row.ticketNo !== "") {
      bucket.ticketedCount++;
    } else {
      bucket.undetectedCount++;
    }

    const category = TYPE_CATEGORY[row.type] ?? "其他";
    bucket.byCategory.set(category, (bucket.byCategory.get(category) ?? 0) + 1);

    if (category === DISTRICT_BREAKDOWN_CATEGORY) {
      const district = row.district || "未知行政區";
      bucket.byDistrict.set(district, (bucket.byDistrict.get(district) ?? 0) + 1);
    }
  }

  const knownTicketNos = new Set(rows.map((r) => r.ticketNo).filter((t) => t !== ""));
  for (const c of caseRows) {
    if (c.reportSource !== SYSTEM_SOURCE_WITH_INFO_ORDER_LOG) continue;
    if (knownTicketNos.has(c.caseNo)) continue; // Info_Order 裡有對應的建立紀錄，不是這種特例

    const date = parseCreationDate(c.filedDate);
    if (!date || date < start || date > end) continue;

    const { key, label } = bucketKeyAndLabel(date, options.granularity);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = newBucket(label);
      buckets.set(key, bucket);
    }
    bucket.missingLogCount++;
    bucket.missingLogCaseNos.push(c.caseNo);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      key,
      label: b.label,
      total: b.total,
      ticketedCount: b.ticketedCount,
      undetectedCount: b.undetectedCount,
      missingLogCount: b.missingLogCount,
      missingLogCaseNos: b.missingLogCaseNos,
      categories: [...b.byCategory.entries()]
        .sort(([, c1], [, c2]) => c2 - c1)
        .map(([category, count]) => ({
          category,
          count,
          districts:
            category === DISTRICT_BREAKDOWN_CATEGORY
              ? [...b.byDistrict.entries()]
                  .sort(([, c1], [, c2]) => c2 - c1)
                  .map(([district, districtCount]) => ({ district, count: districtCount }))
              : undefined,
        })),
    }));
}
