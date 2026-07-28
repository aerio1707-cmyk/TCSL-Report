import { useState } from "react";
import "./App.css";
import { UploadPanel } from "./components/caseFiles/UploadPanel";
import { FileTypeSummaryCard } from "./components/caseFiles/FileTypeSummaryCard";
import { analyzeUploads, type UploadAnalysisResult } from "./lib/caseFiles/analyzeUploads";

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const analysis = await analyzeUploads(files);
      setResult(analysis);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "分析過程發生錯誤，請確認檔案格式是否正確。");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>TCSL-Report 智慧派工與統計分析系統</h1>
      </header>

      <div className="page-shell">
        <UploadPanel
          fileNames={files.map((f) => f.name)}
          busy={busy}
          onFilesSelected={handleFilesSelected}
          onAnalyze={handleAnalyze}
        />

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {result?.unrecognizedFiles.length ? (
          <div className="alert alert-warning">
            以下檔案無法依檔名辨識類型，已略過：{result.unrecognizedFiles.join("、")}
          </div>
        ) : null}

        {result?.infoOrder && (
          <FileTypeSummaryCard
            title="Info_Order（系統告警／派案排序）"
            keyLabel="idx"
            fileNames={result.infoOrder.fileNames}
            totalRows={result.infoOrder.totalRows}
            duplicateRowsRemoved={result.infoOrder.duplicateRowsRemoved}
            collisions={result.infoOrder.collisions}
            columns={[
              { label: "idx", render: (r) => r.idx },
              { label: "類型", render: (r) => r.type },
              { label: "行政區", render: (r) => r.district },
              { label: "燈桿編號", render: (r) => r.polesId },
              { label: "系統開單時間", render: (r) => r.creationTime },
              { label: "來源檔案", render: (r) => r.sourceFile },
            ]}
          />
        )}

        {result?.repairExport && (
          <FileTypeSummaryCard
            title="維修案件匯出（已結案）"
            keyLabel="案件編號"
            fileNames={result.repairExport.fileNames}
            totalRows={result.repairExport.totalRows}
            duplicateRowsRemoved={result.repairExport.duplicateRowsRemoved}
            collisions={result.repairExport.collisions}
            columns={[
              { label: "案件編號", render: (r) => r.caseNo },
              { label: "路燈編號", render: (r) => r.lampId },
              { label: "行政區", render: (r) => r.district },
              { label: "故障類別", render: (r) => r.faultType },
              { label: "立案日期", render: (r) => r.filedDate },
              { label: "來源檔案", render: (r) => r.sourceFile },
            ]}
          />
        )}

        {result?.reportExport && (
          <FileTypeSummaryCard
            title="報修清單匯出（未結案／受理中）"
            keyLabel="案件編號"
            fileNames={result.reportExport.fileNames}
            totalRows={result.reportExport.totalRows}
            duplicateRowsRemoved={result.reportExport.duplicateRowsRemoved}
            collisions={result.reportExport.collisions}
            columns={[
              { label: "案件編號", render: (r) => r.caseNo },
              { label: "路燈編號", render: (r) => r.lampId },
              { label: "行政區", render: (r) => r.district },
              { label: "故障類別", render: (r) => r.faultType },
              { label: "立案日期", render: (r) => r.filedDate },
              { label: "來源檔案", render: (r) => r.sourceFile },
            ]}
          />
        )}

        {result?.lampMaster && (
          <section className="panel">
            <h2>智能燈清冊（主檔）</h2>
            <div className="summary-line">
              <span className="summary-key">來源檔案</span>
              <span className="summary-value">{result.lampMaster.fileNames.join("、")}</span>
            </div>
            <div className="summary-line">
              <span className="summary-key">筆數</span>
              <span className="summary-value">{result.lampMaster.totalRows}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
