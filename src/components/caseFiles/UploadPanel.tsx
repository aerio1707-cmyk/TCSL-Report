import { useRef } from "react";

interface Props {
  fileNames: string[];
  busy: boolean;
  onFilesSelected: (files: File[]) => void;
  onAnalyze: () => void;
}

export function UploadPanel({ fileNames, busy, onFilesSelected, onAnalyze }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel input-panel">
      <div className="field-row">
        <label className="field-label">來源檔案</label>
        <div className="folder-picker">
          <span className="folder-display">
            {fileNames.length > 0 ? `已選取 ${fileNames.length} 個檔案：${fileNames.join("、")}` : "尚未選擇檔案"}
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            瀏覽...
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 0) onFilesSelected(files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="input-help">
        <div className="input-help-title">使用說明</div>
        <ul className="input-help-list">
          <li>
            <span className="input-help-name">來源檔案</span>
            <span className="input-help-rule">
              Info_Order*.csv、維修案件匯出*.xlsx、報修清單匯出*.xlsx、智能燈清冊*.xlsx，一次全部選取即可
            </span>
          </li>
          <li>
            <span className="input-help-name">自動辨識</span>
            <span className="input-help-rule">系統依檔名關鍵字自動歸類，不用照固定順序上傳，也可以分批多選</span>
          </li>
          <li>
            <span className="input-help-name">自動去重</span>
            <span className="input-help-rule">
              每種來源檔案各自套用：主鍵＋其餘所有欄位皆相同才視為同一筆重複匯出，會自動排除只保留一筆
            </span>
          </li>
          <li>
            <span className="input-help-name">主鍵撞號</span>
            <span className="input-help-rule">
              若主鍵相同但其餘內容不同，判定為兩筆不同資料，會全部保留計算，並列出警示清單供人工複查
            </span>
          </li>
          <li>
            <span className="input-help-name">處理範圍</span>
            <span className="input-help-rule">
              資料完全在瀏覽器端處理，不會上傳到任何伺服器；只處理路燈編號 7 位數的智能燈案件
            </span>
          </li>
        </ul>
      </div>

      <div className="field-row actions">
        <button type="button" className="btn btn-primary" onClick={onAnalyze} disabled={busy || fileNames.length === 0}>
          {busy ? "分析中..." : "開始分析"}
        </button>
      </div>
    </section>
  );
}
