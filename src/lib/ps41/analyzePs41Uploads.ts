import { dedupeRows } from "../caseFiles/dedupe";
import { identifyFile } from "../caseFiles/identifyFile";
import { readCaseExportFile } from "../caseFiles/parseCaseExport";
import { readInfoOrderFile } from "../caseFiles/parseInfoOrder";
import { readLampMasterFile } from "../caseFiles/parseLampMaster";
import type { CaseExportRow, InfoOrderRow, LampMasterRow } from "../caseFiles/types";
import { buildAllCaseRows } from "./buildAllCaseRows";
import { buildAnalysisCandidates } from "./buildAnalysisCandidates";
import { classifyAllCases, countUnclassifiedByBlankController } from "./classifyAllCases";
import { buildInfoOrderIndex } from "./infoOrderMatch";
import type { AnalysisCandidateRow, ClassifiedCaseRow } from "./types";

export interface Ps41AnalysisResult {
  classifiedRows: ClassifiedCaseRow[];
  candidates: AnalysisCandidateRow[];
  totalCaseRows: number;
  unclassifiedByBlankController: number; // 控制器編號空白、未列入清冊/非清冊統計的筆數
  duplicateRowsRemoved: number;
  infoOrderRows: number;
  lampMasterRows: number;
  unrecognizedFiles: string[];
  // 案件編號不保證唯一（既有教訓）：撞號的資料全部保留計算，buildAllCaseRows
  // 合併時只會取第一筆代表列進總表/圖表統計，這裡把撞號明細另外列出來，
  // 不能讓「案件總數」跟「上傳筆數」對不上卻沒有任何說明。
  repairCollisions: CaseExportRow[];
  reportCollisions: CaseExportRow[];
  nonSmartLampRepairExcluded: number;
  nonSmartLampReportExcluded: number;
}

// 跟既有「案件主檔」頁籤共用同一套檔案辨識/解析/去重模組，合併時同樣先篩掉
// 非智能燈案件（見 buildAllCaseRows 註解）。
export async function analyzePs41Uploads(files: File[]): Promise<Ps41AnalysisResult> {
  const infoOrderFiles: File[] = [];
  const repairExportFiles: File[] = [];
  const reportExportFiles: File[] = [];
  const lampMasterFiles: File[] = [];
  const unrecognizedFiles: string[] = [];

  for (const file of files) {
    const kind = identifyFile(file.name);
    if (kind === "infoOrder") infoOrderFiles.push(file);
    else if (kind === "repairExport") repairExportFiles.push(file);
    else if (kind === "reportExport") reportExportFiles.push(file);
    else if (kind === "lampMaster") lampMasterFiles.push(file);
    else unrecognizedFiles.push(file.name);
  }

  if (infoOrderFiles.length === 0) throw new Error("請至少上傳一個 Info_Order.csv 檔案");
  if (lampMasterFiles.length === 0) throw new Error("請至少上傳一個智能燈清冊.xlsx 檔案");
  if (repairExportFiles.length === 0 && reportExportFiles.length === 0) {
    throw new Error("請至少上傳一個報修清單匯出.xlsx 或維修案件匯出.xlsx 檔案");
  }

  const infoOrderRaw = (await Promise.all(infoOrderFiles.map(readInfoOrderFile))).flat();
  const infoOrderDedup = dedupeRows<InfoOrderRow>(infoOrderRaw, "idx");

  const repairExportRaw = (
    await Promise.all(repairExportFiles.map((f) => readCaseExportFile(f, "repairExport")))
  ).flat();
  const reportExportRaw = (
    await Promise.all(reportExportFiles.map((f) => readCaseExportFile(f, "reportExport")))
  ).flat();
  const repairDedup = dedupeRows<CaseExportRow>(repairExportRaw, "caseNo");
  const reportDedup = dedupeRows<CaseExportRow>(reportExportRaw, "caseNo");

  const lampMasterRows: LampMasterRow[] = (await Promise.all(lampMasterFiles.map(readLampMasterFile))).flat();
  const lampSet = new Set(lampMasterRows.map((r) => r.lampId).filter((id) => id !== ""));

  const allCaseRowsResult = buildAllCaseRows(repairDedup.rows, reportDedup.rows);
  const classifiedRows = classifyAllCases(allCaseRowsResult.rows, lampSet);

  const infoOrderIndex = buildInfoOrderIndex(infoOrderDedup.rows);
  const candidates = buildAnalysisCandidates(classifiedRows, infoOrderIndex);

  return {
    classifiedRows,
    candidates,
    totalCaseRows: allCaseRowsResult.rows.length,
    unclassifiedByBlankController: countUnclassifiedByBlankController(classifiedRows),
    duplicateRowsRemoved: infoOrderDedup.duplicateRowsRemoved + repairDedup.duplicateRowsRemoved + reportDedup.duplicateRowsRemoved,
    infoOrderRows: infoOrderDedup.rows.length,
    lampMasterRows: lampMasterRows.length,
    unrecognizedFiles,
    repairCollisions: repairDedup.collisions,
    reportCollisions: reportDedup.collisions,
    nonSmartLampRepairExcluded: allCaseRowsResult.nonSmartLampRepairExcluded,
    nonSmartLampReportExcluded: allCaseRowsResult.nonSmartLampReportExcluded,
  };
}
