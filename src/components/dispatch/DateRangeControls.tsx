import type { Granularity } from "../../lib/caseFiles/buildTicketCountSeries";

interface Props {
  start: string;
  end: string;
  granularity: Granularity;
  onChange: (next: { start: string; end: string; granularity: Granularity }) => void;
}

export function DateRangeControls({ start, end, granularity, onChange }: Props) {
  return (
    <div className="field-row">
      <label className="field-label">統計區間</label>
      <div className="range-controls">
        <input
          type="date"
          className="date-input"
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end, granularity })}
        />
        <span>至</span>
        <input
          type="date"
          className="date-input"
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value, granularity })}
        />
        <select
          className="text-input"
          value={granularity}
          onChange={(e) => onChange({ start, end, granularity: e.target.value as Granularity })}
        >
          <option value="day">依日</option>
          <option value="week">依週</option>
          <option value="month">依月</option>
        </select>
      </div>
    </div>
  );
}
