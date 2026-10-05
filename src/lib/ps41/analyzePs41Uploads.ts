import { buildCaseMaster, filterSmartLampCollisions } from "../caseFiles/buildCaseMaster";
import { buildDispatchRows } from "../caseFiles/buildDispatchRows";
import { dedupeRows } from "../caseFiles/dedupe";
import { identifyFile } from "../caseFiles/identifyFile";
import { readCaseExportFile } from "../caseFiles/parseCaseExport";
import { readInfoOrderFile } from "../caseFiles/parseInfoOrder";
import { readLampMasterFile } from "../caseFiles/parseLampMaster";
import type { CaseExportRow, CaseMasterRow, DispatchRow, InfoOrderRow, LampMasterRow } from "../caseFiles/types";
import { buildAllCaseRows } from "./buildAllCaseRows";
import { buildAnalysisCandidates } from "./buildAnalysisCandidates";
import { classifyAllCases, countUnclassifiedByBlankController } from "./classifyAllCases";
import { buildInfoOrderIndex } from "./infoOrderMatch";
import type { LampListVersion } from "./lampListVersions";
import { buildLampListVersions } from "./lampListVersions";
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
  // 供 buildWeeklyStats 計算「系統開單」對帳輔助數字（重複偵測既有案件／
  // 偵測到但未開單）用，見 infoOrderReconcile.ts。
  infoOrderRowsData: InfoOrderRow[];
  // 智能燈清冊可能有多份、分不同生效日期（見 lampListVersions.ts），依日期
  // 挑當時生效的版本，不是單一份 lampSet。
  lampListVersions: LampListVersion[];
  // 背景比對用：跟「維修案件統計」頁籤同一套中繼資料（同一套去重/合併規則，
  // 只是不在這個頁面顯示），給 ticketCountConsistency.ts 算「開單數量統計」
  // 頁籤的等效總數，不用使用者另外跑一次那個頁籤就能知道兩邊數字是否一致。
  dispatchRows: DispatchRow[];
  caseMasterRows: CaseMasterRow[];
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

  const lampMasterFileRows = await Promise.all(
    lampMasterFiles.map(async (f) => ({ name: f.name, rows: await readLampMasterFile(f) }))
  );
  const lampMasterRows: LampMasterRow[] = lampMasterFileRows.flatMap((f) => f.rows);
  const lampListVersions = buildLampListVersions(lampMasterFileRows);

  const allCaseRowsResult = buildAllCaseRows(repairDedup.rows, reportDedup.rows);
  const classifiedRows = classifyAllCases(allCaseRowsResult.rows, lampListVersions);

  const infoOrderIndex = buildInfoOrderIndex(infoOrderDedup.rows);
  const candidates = buildAnalysisCandidates(classifiedRows, infoOrderIndex);

  const dispatchRows = buildDispatchRows(infoOrderDedup.rows).rows;
  const caseMasterRows = buildCaseMaster(repairDedup.rows, reportDedup.rows).rows;

  return {
    classifiedRows,
    candidates,
    totalCaseRows: allCaseRowsResult.rows.length,
    unclassifiedByBlankController: countUnclassifiedByBlankController(classifiedRows),
    duplicateRowsRemoved: infoOrderDedup.duplicateRowsRemoved + repairDedup.duplicateRowsRemoved + reportDedup.duplicateRowsRemoved,
    infoOrderRows: infoOrderDedup.rows.length,
    lampMasterRows: lampMasterRows.length,
    unrecognizedFiles,
    repairCollisions: filterSmartLampCollisions(repairDedup.collisions),
    reportCollisions: filterSmartLampCollisions(reportDedup.collisions),
    nonSmartLampRepairExcluded: allCaseRowsResult.nonSmartLampRepairExcluded,
    nonSmartLampReportExcluded: allCaseRowsResult.nonSmartLampReportExcluded,
    infoOrderRowsData: infoOrderDedup.rows,
    lampListVersions,
    dispatchRows,
    caseMasterRows,
  };
}
