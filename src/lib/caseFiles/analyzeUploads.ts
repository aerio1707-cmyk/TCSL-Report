import { buildCaseMaster, type CaseMasterResult } from "./buildCaseMaster";
import { buildDispatchRows, type DispatchResult } from "./buildDispatchRows";
import { dedupeRows } from "./dedupe";
import { identifyFile } from "./identifyFile";
import { readCaseExportFile } from "./parseCaseExport";
import { readInfoOrderFile } from "./parseInfoOrder";
import { readLampMasterFile } from "./parseLampMaster";
import type { CaseExportRow, InfoOrderRow, LampMasterRow } from "./types";

export interface FileTypeAnalysis<T> {
  fileNames: string[];
  totalRows: number;
  duplicateRowsRemoved: number;
  collisions: T[];
  rows: T[];
}

export interface UploadAnalysisResult {
  infoOrder: FileTypeAnalysis<InfoOrderRow> | null;
  repairExport: FileTypeAnalysis<CaseExportRow> | null;
  reportExport: FileTypeAnalysis<CaseExportRow> | null;
  lampMaster: { fileNames: string[]; totalRows: number; rows: LampMasterRow[] } | null;
  caseMaster: CaseMasterResult | null; // 需要 repairExport 或 reportExport 至少一種才會產出
  dispatch: DispatchResult | null; // 需要 infoOrder 才會產出
  unrecognizedFiles: string[];
}

export async function analyzeUploads(files: File[]): Promise<UploadAnalysisResult> {
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

  const infoOrder = infoOrderFiles.length
    ? await buildAnalysis(infoOrderFiles, readInfoOrderFile, "idx")
    : null;

  const repairExport = repairExportFiles.length
    ? await buildAnalysis(
        repairExportFiles,
        (f) => readCaseExportFile(f, "repairExport"),
        "caseNo"
      )
    : null;

  const reportExport = reportExportFiles.length
    ? await buildAnalysis(
        reportExportFiles,
        (f) => readCaseExportFile(f, "reportExport"),
        "caseNo"
      )
    : null;

  let lampMaster: UploadAnalysisResult["lampMaster"] = null;
  if (lampMasterFiles.length) {
    const rows = (await Promise.all(lampMasterFiles.map(readLampMasterFile))).flat();
    lampMaster = {
      fileNames: lampMasterFiles.map((f) => f.name),
      totalRows: rows.length,
      rows,
    };
  }

  const caseMaster =
    repairExport || reportExport
      ? buildCaseMaster(repairExport?.rows ?? [], reportExport?.rows ?? [])
      : null;

  const dispatch = infoOrder ? buildDispatchRows(infoOrder.rows) : null;

  return { infoOrder, repairExport, reportExport, lampMaster, caseMaster, dispatch, unrecognizedFiles };
}

async function buildAnalysis<T extends object>(
  files: File[],
  reader: (file: File) => Promise<T[]>,
  keyField: keyof T
): Promise<FileTypeAnalysis<T>> {
  const allRows = (await Promise.all(files.map(reader))).flat();
  const { rows, duplicateRowsRemoved, collisions } = dedupeRows(allRows, keyField);
  return {
    fileNames: files.map((f) => f.name),
    totalRows: allRows.length,
    duplicateRowsRemoved,
    collisions,
    rows,
  };
}
