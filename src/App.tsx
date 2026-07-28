import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { UploadPanel } from "./components/caseFiles/UploadPanel";
import { FileTypeSummaryCard } from "./components/caseFiles/FileTypeSummaryCard";
import { PreviewTable } from "./components/caseFiles/PreviewTable";
import { DateRangeControls } from "./components/dispatch/DateRangeControls";
import { TicketCountAnnotations } from "./components/dispatch/TicketCountAnnotations";
import { TicketCountChart } from "./components/dispatch/TicketCountChart";
import { analyzeUploads, type UploadAnalysisResult } from "./lib/caseFiles/analyzeUploads";
import { buildTicketCountSeries, getDefaultDateRange, type Granularity } from "./lib/caseFiles/buildTicketCountSeries";
import { exportCaseMasterWorkbook } from "./lib/caseFiles/exportCaseMaster";
import { exportDispatchWorkbook } from "./lib/caseFiles/exportDispatch";

interface ChartRange {
  start: string;
  end: string;
  granularity: Granularity;
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange | null>(null);

  useEffect(() => {
    if (result?.dispatch) {
      const { start, end } = getDefaultDateRange(result.dispatch.rows);
      setChartRange({ start, end, granularity: "day" });
    } else {
      setChartRange(null);
    }
  }, [result]);

  const buckets = useMemo(() => {
    if (!result?.dispatch || !chartRange) return [];
    return buildTicketCountSeries(result.dispatch.rows, chartRange);
  }, [result, chartRange]);

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
        <h1>路燈案件統計分析系統</h1>
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

        {result?.caseMaster && (
          <section className="panel">
            <div className="panel-header-row">
              <h2>案件主檔（維修案件統計）</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  exportCaseMasterWorkbook(result.caseMaster!.rows, [
                    ...(result.repairExport?.collisions ?? []),
                    ...(result.reportExport?.collisions ?? []),
                  ])
                }
              >
                下載維修案件統計.xlsx
              </button>
            </div>
            <div className="summary-line">
              <span className="summary-key">案件總數</span>
              <span className="summary-value">
                {result.caseMaster.rows.length}
                <span className="summary-sub">
                  已結案 {result.caseMaster.rows.filter((r) => r.isClosed).length}／
                  未結案 {result.caseMaster.rows.filter((r) => !r.isClosed).length}
                </span>
              </span>
            </div>
            <div className="summary-line">
              <span className="summary-key">已排除非智能燈</span>
              <span className="summary-value">
                維修案件匯出 {result.caseMaster.nonSmartLampRepairExcluded} 筆、報修清單匯出{" "}
                {result.caseMaster.nonSmartLampReportExcluded} 筆（路燈編號非 7 位數）
              </span>
            </div>
            <PreviewTable
              rows={result.caseMaster.rows}
              columns={[
                { label: "案件編號", render: (r) => r.caseNo },
                { label: "路燈編號", render: (r) => r.lampId },
                { label: "行政區", render: (r) => r.district },
                { label: "故障類別", render: (r) => r.faultType },
                { label: "立案日期", render: (r) => r.filedDate },
                { label: "完工時間", render: (r) => r.completedTime || "（未結案）" },
                { label: "案件狀態", render: (r) => r.status },
              ]}
            />
          </section>
        )}

        {result?.dispatch && (
          <section className="panel">
            <div className="panel-header-row">
              <h2>自主API派工</h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportDispatchWorkbook(result.dispatch!.rows, result.caseMaster?.rows ?? [])}
              >
                下載自主API派工.xlsx
              </button>
            </div>
            <div className="summary-line">
              <span className="summary-key">告警總數</span>
              <span className="summary-value">
                {result.dispatch.rows.length}
                <span className="summary-sub">
                  已比對到報修單號 {result.dispatch.matchedCount}／未比對到 {result.dispatch.unmatchedCount}
                </span>
              </span>
            </div>
            <PreviewTable
              rows={result.dispatch.rows}
              columns={[
                { label: "系統開單時間", render: (r) => r.creationTime },
                { label: "類型", render: (r) => r.type },
                { label: "行政區", render: (r) => r.district },
                { label: "燈桿編號", render: (r) => r.polesId },
                { label: "報修單號", render: (r) => r.ticketNo || "（未比對到）" },
                { label: "notify_result 原文", render: (r) => r.notifyResult },
              ]}
            />
          </section>
        )}

        {result?.dispatch && chartRange && (
          <section className="panel">
            <h2>開單數量統計</h2>
            <DateRangeControls
              start={chartRange.start}
              end={chartRange.end}
              granularity={chartRange.granularity}
              onChange={setChartRange}
            />
            <TicketCountChart buckets={buckets} rangeLabel={`${chartRange.start} ~ ${chartRange.end}`} />
            <TicketCountAnnotations buckets={buckets} />
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
