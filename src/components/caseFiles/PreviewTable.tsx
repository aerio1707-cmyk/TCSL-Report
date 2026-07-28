import { useState } from "react";
import { CollisionTable } from "./CollisionTable";

interface Column<T> {
  label: string;
  render: (row: T) => string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  previewCount?: number;
}

// 結果筆數可能上千筆，預設收合，避免畫面一次塞進整份資料。
export function PreviewTable<T>({ rows, columns, previewCount = 20 }: Props<T>) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return null;

  return (
    <div className="preview-table">
      <button type="button" className="btn btn-secondary" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "隱藏預覽" : `顯示前 ${Math.min(previewCount, rows.length)} 筆預覽`}
      </button>
      {expanded && <CollisionTable rows={rows.slice(0, previewCount)} columns={columns} />}
    </div>
  );
}
