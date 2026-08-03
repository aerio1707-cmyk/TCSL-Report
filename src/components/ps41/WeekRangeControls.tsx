interface WeekOption {
  weekKey: string;
  weekLabel: string;
}

interface Props {
  weeks: WeekOption[];
  startWeekKey: string;
  endWeekKey: string;
  onChange: (next: { startWeekKey: string; endWeekKey: string }) => void;
}

// 沿用「開單數量統計」頁籤 DateRangeControls 的機制，改成週顆粒度：
// 這個範圍只影響圖表/總表(周)的顯示與匯出範圍，不影響 FAIL 候選審核
// （審核永遠針對全部候選案件）。
export function WeekRangeControls({ weeks, startWeekKey, endWeekKey, onChange }: Props) {
  return (
    <div className="field-row">
      <label className="field-label">週次範圍</label>
      <div className="range-controls">
        <select
          className="text-input"
          value={startWeekKey}
          onChange={(e) => onChange({ startWeekKey: e.target.value, endWeekKey })}
        >
          {weeks.map((w) => (
            <option key={w.weekKey} value={w.weekKey}>
              {w.weekLabel}
            </option>
          ))}
        </select>
        <span>至</span>
        <select
          className="text-input"
          value={endWeekKey}
          onChange={(e) => onChange({ startWeekKey, endWeekKey: e.target.value })}
        >
          {weeks.map((w) => (
            <option key={w.weekKey} value={w.weekKey}>
              {w.weekLabel}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
