import type { PeriodBucket } from "../../lib/caseFiles/buildTicketCountSeries";

interface Props {
  buckets: PeriodBucket[];
}

const MAX_CARDS = 4;

// 對應規劃文件「類別註記版」：列出當期各類別數量明細；「整排路燈不亮」額外
// 分區列出受影響行政區（使用者已確認保留這個排版）。畫面容易顯得雜亂，
// 依使用者回饋只顯示選定區間內數量最多的 4 個期間（單行四個區塊），
// 其餘期間仍然計入圖表本身，只是不再逐一列出明細卡片。
export function TicketCountAnnotations({ buckets }: Props) {
  if (buckets.length === 0) return null;

  const topBuckets = [...buckets]
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_CARDS)
    .sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="annotation-grid">
      {topBuckets.map((bucket) => (
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
