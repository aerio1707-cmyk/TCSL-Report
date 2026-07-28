// 四種來源檔案的型別定義，對應規劃文件第 1 節的真實 schema。

export type SourceFileKind = "infoOrder" | "repairExport" | "reportExport" | "lampMaster";

export interface InfoOrderRow {
  idx: string;
  type: string; // B/D/F/G/H/I
  district: string;
  content: string;
  notify: string; // Y/N
  notifyTime: string;
  creationTime: string; // 系統開單時間，圖表時間軸分組依據
  streetlightId: string; // 系統內部路燈序號，跟燈桿編號是不同的兩組數字
  notifyResult: string; // 見規劃文件第 0-2 節分類（Phase 2 才解析成報修單號）
  controllerId: string;
  polesId: string; // 燈桿編號，固定 7 位數
  note: string; // 台電合併批次時會是逗號分隔燈桿清單
  sourceFile: string;
}

// 維修案件匯出（已結案）與報修清單匯出（未結案）欄位名稱完全相同，
// 只差在後者少了 5 個結案才有的欄位；用 sourceKind 標記差異。
export type CaseExportKind = "repairExport" | "reportExport";

export interface CaseExportRow {
  caseNo: string; // 案件編號
  offlineNo: string; // 線下單號
  lampId: string; // 路燈編號
  projectCategory: string; // 專案類別
  isEnabled: string; // 是否啟用
  fixtureId: string; // 燈具編號
  controllerId: string; // 控制器編號
  district: string; // 行政區
  address: string; // 詳細位置
  faultType: string; // 故障類別
  reportSource: string; // 通報來源
  filedDate: string; // 立案日期
  completedTime: string; // 手填完工時間（僅 repairExport 有值）
  overdueHours: string; // 逾期時數
  status: string; // 狀態
  caseCategory: string; // 案件類別
  repairReason: string; // 維修原因
  workContent: string; // 施工內容
  reporterName: string; // 通報人
  reporterPhone: string; // 通報人電話
  reporterEmail: string; // 通報人信箱
  note: string; // 備註
  lng: string; // 經度
  lat: string; // 緯度
  emergencyReason: string; // 緊急搶修原因（僅 repairExport 有值）
  noticeDocNo: string; // 通知公文字號（僅 repairExport 有值）
  noticeDocDate: string; // 通知公文發文日期（僅 repairExport 有值）
  noticeDocTarget: string; // 通知公文發文對象（僅 repairExport 有值）
  sourceKind: CaseExportKind;
  sourceFile: string;
}

export interface LampMasterRow {
  seq: string; // 項次
  lampId: string; // 路燈編號
  district: string; // 行政區
  address: string; // 詳細位置
  lng: string; // 經度
  lat: string; // 緯度
  poleType: string; // 燈桿類型
  sourceFile: string;
}
