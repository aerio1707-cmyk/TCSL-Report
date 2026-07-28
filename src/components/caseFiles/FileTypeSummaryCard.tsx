import { useState } from "react";
import { CollisionTable } from "./CollisionTable";

interface Column<T> {
  label: string;
  render: (row: T) => string;
}

interface Props<T> {
  title: string;
  keyLabel: string; // 主鍵欄位的中文名稱，用在警示文字裡
  fileNames: string[];
  totalRows: number;
  duplicateRowsRemoved: number;
  collisions: T[];
  columns: Column<T>[];
}

export function FileTypeSummaryCard<T>({
  title,
  keyLabel,
  fileNames,
  totalRows,
  duplicateRowsRemoved,
  collisions,
  columns,
}: Props<T>) {
  const [showDetail, setShowDetail] = useState(false);
  const keptRows = totalRows - duplicateRowsRemoved;

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="summary-line">
        <span className="summary-key">來源檔案</span>
        <span className="summary-value">{fileNames.join("、")}</span>
      </div>
      <div className="summary-line">
        <span className="summary-key">上傳筆數</span>
        <span className="summary-value">
          {totalRows}
          <span className="summary-sub">去重後 {keptRows} 筆</span>
        </span>
      </div>

      {duplicateRowsRemoved > 0 && (
        <div className="alert alert-info">
          已自動排除 {duplicateRowsRemoved} 筆完全重複資料（{keyLabel}與其餘所有欄位皆相同）。
        </div>
      )}

      {collisions.length > 0 && (
        <div className="alert alert-warning">
          發現 {collisions.length} 筆{keyLabel}重複但內容不同的資料！已全部保留計算，請於下方明細確認。
          <button type="button" className="btn btn-secondary btn-inline" onClick={() => setShowDetail((v) => !v)}>
            {showDetail ? "隱藏明細" : "顯示明細"}
          </button>
        </div>
      )}

      {showDetail && collisions.length > 0 && <CollisionTable rows={collisions} columns={columns} />}
    </section>
  );
}
