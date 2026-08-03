import { classifyExclusion, suggestedDecisionOf } from "./classifyExclusion";
import type { InfoOrderIndex } from "./infoOrderMatch";
import { systemDetectedInAdvance } from "./infoOrderMatch";
import type { AnalysisCandidateRow, ClassifiedCaseRow } from "./types";
import { parseDateTime } from "./weekBucket";

const TARGET_FAULT_TYPE = "路燈不亮";

// 「分析」候選規則（合併原 Anaysis 表 C 欄 FAIL + D 欄跨表比對為單一規則，
// 已用 2868 筆真實資料逐列驗證 100% 吻合）：
//   故障類別＝路燈不亮 且 InfoOrder 跨表比對 Not Found
//   且 維修原因不是「無異常」、施工內容不是「正常放亮」。
// 只會出現在清冊名單案件裡（InfoOrder 比對需要控制器編號，跟清冊判定同一個
// 前提），且排除通報來源本身就是系統開單（自主API/承商自主通報）的案件。
export function buildAnalysisCandidates(
  rows: ClassifiedCaseRow[],
  infoOrderIndex: InfoOrderIndex
): AnalysisCandidateRow[] {
  const candidates: AnalysisCandidateRow[] = [];

  for (const row of rows) {
    if (row.lampListStatus !== "清冊名單") continue;
    if (row.notifyCategory === "system") continue;
    if (row.faultType !== TARGET_FAULT_TYPE) continue;
    if (row.repairReason === "無異常" || row.workContent === "正常放亮") continue;

    const filedDate = parseDateTime(row.filedDate);
    if (!filedDate) continue;

    const detected = systemDetectedInAdvance(row.lampId, row.controllerId, filedDate, infoOrderIndex);
    if (detected) continue; // 系統已提前偵測，不是候選

    const suggestedCategory = classifyExclusion(row.workContent, row.note);
    const suggestedDecision = suggestedDecisionOf(suggestedCategory);

    candidates.push({
      ...row,
      suggestedCategory,
      suggestedDecision,
      decision: suggestedDecision,
      decisionSource: "suggested",
    });
  }

  return candidates;
}
