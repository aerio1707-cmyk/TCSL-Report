import { useRef } from "react";
import type { AnalysisCandidateRow } from "../../lib/ps41/types";

interface Props {
  candidates: AnalysisCandidateRow[];
  onChange: (rows: AnalysisCandidateRow[]) => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onConfirm: () => void;
}

export function CandidateReviewPanel({ candidates, onChange, onImportFile, onExport, onConfirm }: Props) {
  const importRef = useRef<HTMLInputElement>(null);
  const reviewedCount = candidates.filter((c) => c.decision !== undefined).length;
  const allReviewed = candidates.length > 0 && reviewedCount === candidates.length;

  const setDecision = (index: number, decision: "include" | "exclude") => {
    const next = candidates.slice();
    next[index] = { ...next[index], decision, decisionSource: "manual" };
    onChange(next);
  };

  const applyAllSuggestions = () => {
    const next = candidates.map((c) =>
      c.suggestedDecision !== undefined ? { ...c, decision: c.suggestedDecision, decisionSource: "suggested" as const } : c
    );
    onChange(next);
  };

  if (candidates.length === 0) {
    return (
      <section className="panel">
        <h2>FAIL 候選審核</h2>
        <div className="alert alert-info">這批資料沒有符合「分析」規則的候選案件，可以直接進入下一步。</div>
        <div className="field-row actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            下一步：週次範圍設定
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2>FAIL 候選審核</h2>
        <span className="summary-sub">
          已審核 {reviewedCount} / {candidates.length}
        </span>
      </div>

      <div className="alert alert-info">
        每筆候選案件已依施工內容/備註跑過關鍵字分類：台電/正常→建議排除、燈具/電源/網路訊號/智控器→建議列入
        FAIL、其他（沒命中）→不給預設，請逐筆確認或調整。全部審核完成才能進到下一步。
      </div>

      <div className="field-row actions">
        <button type="button" className="btn btn-secondary" onClick={applyAllSuggestions}>
          套用全部建議
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExport}>
          匯出審核決策檔
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => importRef.current?.click()}>
          匯入上次審核決策檔
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="table-scroll">
        <table className="log-table">
          <thead>
            <tr>
              <th>案件編號</th>
              <th>路燈編號</th>
              <th>故障類別</th>
              <th>維修原因</th>
              <th>施工內容</th>
              <th>備註</th>
              <th>系統建議分類</th>
              <th>來源</th>
              <th>人工決定</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <tr key={`${c.caseNo}-${c.lampId}-${c.filedDate}`}>
                <td>{c.caseNo}</td>
                <td>{c.lampId}</td>
                <td>{c.faultType}</td>
                <td>{c.repairReason}</td>
                <td>{c.workContent}</td>
                <td>{c.note}</td>
                <td>{c.suggestedCategory}</td>
                <td>{c.decisionSource === "imported" ? "已沿用上次審核" : c.decisionSource === "manual" ? "人工調整" : "系統建議"}</td>
                <td>
                  <label>
                    <input
                      type="radio"
                      name={`decision-${i}`}
                      checked={c.decision === "include"}
                      onChange={() => setDecision(i, "include")}
                    />{" "}
                    列入FAIL
                  </label>
                  <label style={{ marginLeft: 10 }}>
                    <input
                      type="radio"
                      name={`decision-${i}`}
                      checked={c.decision === "exclude"}
                      onChange={() => setDecision(i, "exclude")}
                    />{" "}
                    排除
                  </label>
                  {c.decision === undefined && <span className="summary-sub">（尚未決定）</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="field-row actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={!allReviewed}>
          {allReviewed ? "下一步：週次範圍設定" : `尚有 ${candidates.length - reviewedCount} 筆未決定`}
        </button>
      </div>
    </section>
  );
}
