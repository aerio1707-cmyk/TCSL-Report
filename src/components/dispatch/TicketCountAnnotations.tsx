import type { PeriodBucket } from "../../lib/caseFiles/buildTicketCountSeries";

interface Props {
  buckets: PeriodBucket[];
}

// 對應規劃文件「類別註記版」：每個資料點列出當期各類別數量明細；
// 「整排路燈不亮」額外列出受影響行政區。目前先每個行政區各自一行，
// 排版細節（分區列出 vs 合併成一行）等畫面出來後再依使用者回饋調整。
export function TicketCountAnnotations({ buckets }: Props) {
  if (buckets.length === 0) return null;

  return (
    <div className="annotation-grid">
      {buckets.map((bucket) => (
        <div className="annotation-card" key={bucket.key}>
          <div className="annotation-card-title">
            {bucket.label}
            <span className="annotation-card-total">共 {bucket.total} 件</span>
          </div>
          <ul className="annotation-list">
            {bucket.categories.map((c) => (
              <li key={c.category}>
                <span className="annotation-count">{c.count}</span> {c.category}
                {c.districts && c.districts.length > 0 && (
                  <span className="annotation-districts">
                    （{c.districts.map((d) => `${d.district} ${d.count}`).join("、")}）
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
