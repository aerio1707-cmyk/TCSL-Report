import { useMemo, useState } from "react";
import { CollisionTable } from "../components/caseFiles/CollisionTable";
import { CandidateReviewPanel } from "../components/ps41/CandidateReviewPanel";
import { NotifyMethodChart } from "../components/ps41/NotifyMethodChart";
import { WeekRangeControls } from "../components/ps41/WeekRangeControls";
import { Ps41UploadPanel } from "../components/ps41/Ps41UploadPanel";
import { analyzePs41Uploads, type Ps41AnalysisResult } from "../lib/ps41/analyzePs41Uploads";
import { buildWeeklyStats, filterWeeklyStatsRange } from "../lib/ps41/buildWeeklyStats";
import { exportAnalysisListWorkbook, exportFailListWorkbook } from "../lib/ps41/exportAnalysisLists";
import { exportWeeklyReportWorkbook } from "../lib/ps41/exportWeeklyReport";
import { applyReviewDecisions, exportReviewDecisions, parseReviewDecisionFile } from "../lib/ps41/reviewDecisions";
import type { AnalysisCandidateRow } from "../lib/ps41/types";
import { formatWeekRangeAsDates } from "../lib/ps41/weekBucket";

type Step = "upload" | "review" | "range" | "output";

export function Ps41Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Ps41AnalysisResult | null>(null);
  const [candidates, setCandidates] = useState<AnalysisCandidateRow[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [weekRange, setWeekRange] = useState<{ startWeekKey: string; endWeekKey: string } | null>(null);
  const [showCollisionDetail, setShowCollisionDetail] = useState(false);

  const weeklyStatsFull = useMemo(() => {
    if (!result) return null;
    return buildWeeklyStats(result.classifiedRows, candidates);
  }, [result, candidates]);

  const availableWeeks = useMemo(() => {
    if (!weeklyStatsFull) return [];
    return weeklyStatsFull.listed.map((w) => ({ weekKey: w.weekKey, weekLabel: w.weekLabel }));
  }, [weeklyStatsFull]);

  const weeklyStatsInRange = useMemo(() => {
    if (!weeklyStatsFull || !weekRange) return weeklyStatsFull;
    return filterWeeklyStatsRange(weeklyStatsFull, weekRange.startWeekKey, weekRange.endWeekKey);
  }, [weeklyStatsFull, weekRange]);

  const rangeLabel = weekRange ? formatWeekRangeAsDates(weekRange.startWeekKey, weekRange.endWeekKey) : "";

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const analysis = await analyzePs41Uploads(files);
      setResult(analysis);
      setCandidates(analysis.candidates);
      setStep("review");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "分析過程發生錯誤，請確認檔案格式是否正確。");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const handleImportDecisionFile = async (file: File) => {
    try {
      const imported = await parseReviewDecisionFile(file);
      setCandidates((prev) => applyReviewDecisions(prev, imported));
    } catch {
      setErrorMsg("審核決策檔格式無法解析，請確認是否為本系統匯出的檔案。");
    }
  };

  const handleConfirmReview = () => {
    if (!weeklyStatsFull) return;
    const weeks = weeklyStatsFull.listed.map((w) => w.weekKey);
    if (weeks.length > 0) {
      const start = weeks[Math.max(0, weeks.length - 12)];
      const end = weeks[weeks.length - 1];
      setWeekRange({ startWeekKey: start, endWeekKey: end });
    }
    setStep("range");
  };

  return (
    <div className="page-shell">
      <Ps41UploadPanel fileNames={files.map((f) => f.name)} busy={busy} onFilesSelected={handleFilesSelected} onAnalyze={handleAnalyze} />

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {result?.unrecognizedFiles.length ? (
        <div className="alert alert-warning">以下檔案無法依檔名辨識類型，已略過：{result.unrecognizedFiles.join("、")}</div>
      ) : null}

      {result && (
        <section className="panel">
          <h2>資料摘要</h2>
          <div className="summary-line">
            <span className="summary-key">案件總數</span>
            <span className="summary-value">
              {result.totalCaseRows}
              <span className="summary-sub">去重排除 {result.duplicateRowsRemoved} 筆</span>
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-key">已排除非智能燈</span>
            <span className="summary-value">
              維修案件匯出 {result.nonSmartLampRepairExcluded} 筆、報修清單匯出 {result.nonSmartLampReportExcluded} 筆
              <span className="summary-sub">路燈編號非 7 位數，不影響任何最終產出</span>
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-key">控制器編號空白</span>
            <span className="summary-value">
              {result.unclassifiedByBlankController} 筆
              <span className="summary-sub">智能燈案件中控制器編號未填的部分，未列入清冊/非清冊統計</span>
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-key">分析候選</span>
            <span className="summary-value">{result.candidates.length} 筆</span>
          </div>

          {(result.repairCollisions.length > 0 || result.reportCollisions.length > 0) && (
            <div className="alert alert-warning">
              發現 {result.repairCollisions.length + result.reportCollisions.length}{" "}
              筆案件編號重複但內容不同的資料（案件編號不保證唯一）！合併統計時每個案件編號只取一筆代表列，其餘筆數會反映在「案件總數」與上傳筆數的差異裡，請於下方明細確認是否需要人工複查。
              <button type="button" className="btn btn-secondary btn-inline" onClick={() => setShowCollisionDetail((v) => !v)}>
                {showCollisionDetail ? "隱藏明細" : "顯示明細"}
              </button>
            </div>
          )}
          {showCollisionDetail && (result.repairCollisions.length > 0 || result.reportCollisions.length > 0) && (
            <CollisionTable
              rows={[...result.repairCollisions, ...result.reportCollisions]}
              columns={[
                { label: "案件編號", render: (r) => r.caseNo },
                { label: "路燈編號", render: (r) => r.lampId },
                { label: "行政區", render: (r) => r.district },
                { label: "故障類別", render: (r) => r.faultType },
                { label: "立案日期", render: (r) => r.filedDate },
                { label: "來源類型", render: (r) => (r.sourceKind === "repairExport" ? "維修案件匯出（已結案）" : "報修清單匯出（未結案）") },
                { label: "來源檔案", render: (r) => r.sourceFile },
              ]}
            />
          )}
        </section>
      )}

      {result && step === "review" && (
        <CandidateReviewPanel
          candidates={candidates}
          onChange={setCandidates}
          onImportFile={handleImportDecisionFile}
          onExport={() => exportReviewDecisions(candidates)}
          onConfirm={handleConfirmReview}
        />
      )}

      {result && (step === "range" || step === "output") && weeklyStatsFull && weekRange && (
        <section className="panel">
          <div className="panel-header-row">
            <h2>週次範圍設定</h2>
            <button type="button" className="btn btn-secondary" onClick={() => setStep("review")}>
              回上一步：重新審核 FAIL 候選
            </button>
          </div>
          <WeekRangeControls weeks={availableWeeks} startWeekKey={weekRange.startWeekKey} endWeekKey={weekRange.endWeekKey} onChange={setWeekRange} />
          <div className="field-row actions">
            <button type="button" className="btn btn-primary" onClick={() => setStep("output")}>
              產出圖表與報表
            </button>
          </div>
        </section>
      )}

      {result && step === "output" && weeklyStatsInRange && (
        <>
          <section className="panel">
            <div className="panel-header-row">
              <h2>通報方式統計</h2>
              <div className="field-row actions" style={{ margin: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => exportWeeklyReportWorkbook(weeklyStatsInRange, rangeLabel)}>
                  下載總表(周).xlsx
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => exportAnalysisListWorkbook(candidates)}>
                  下載分析清冊.xlsx
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => exportFailListWorkbook(candidates)}>
                  下載FAIL清冊.xlsx
                </button>
              </div>
            </div>
            <NotifyMethodChart title="通報方式統計(清冊)" rangeLabel={rangeLabel} weeks={weeklyStatsInRange.listed} showFail />
            <NotifyMethodChart title="通報方式統計(非清冊)" rangeLabel={rangeLabel} weeks={weeklyStatsInRange.unlisted} showFail={false} />
          </section>
        </>
      )}
    </div>
  );
}
