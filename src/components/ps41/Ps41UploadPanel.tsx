import { useRef } from "react";

interface Props {
  fileNames: string[];
  busy: boolean;
  onFilesSelected: (files: File[]) => void;
  onAnalyze: () => void;
}

export function Ps41UploadPanel({ fileNames, busy, onFilesSelected, onAnalyze }: Props) {
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
              Info_Order*.csv、智能燈清冊*.xlsx（必要）＋ 報修清單匯出*.xlsx／維修案件匯出*.xlsx（可多檔）
            </span>
          </li>
          <li>
            <span className="input-help-name">處理範圍</span>
            <span className="input-help-rule">
              跟「案件主檔」頁籤不同：這裡用到全部案件（清冊/非清冊都要統計），不會先篩掉非智能燈案件
            </span>
          </li>
          <li>
            <span className="input-help-name">智能燈判定</span>
            <span className="input-help-rule">路燈編號 7 碼 且 控制器編號非空白，兩者缺一都不列入清冊/非清冊統計</span>
          </li>
          <li>
            <span className="input-help-name">處理位置</span>
            <span className="input-help-rule">資料完全在瀏覽器端處理，不會上傳到任何伺服器</span>
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
