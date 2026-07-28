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

  return { infoOrder, repairExport, reportExport, lampMaster, unrecognizedFiles };
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
