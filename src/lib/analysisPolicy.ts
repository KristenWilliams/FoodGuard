import { validateAnalysis } from "../../shared/analysis.mjs"
import type { AnalysisResult } from "@/types/analysis"
import type { FoodGuardPreferences } from "@/lib/preferences"

export type AnalysisRegion = FoodGuardPreferences["region"]
export const REGION_LABELS = { cn: "中国", us: "美国", eu: "欧盟", global: "全球" }

export function normalizeAnalysisResult(result: AnalysisResult, region: AnalysisRegion, language: "zh" | "en" = "zh"): AnalysisResult {
  const normalized = validateAnalysis(result, result.analysis_region || region, result.analysis_language || language, false)
  if (!result.analysis_region) {
    delete normalized.analysis_region
    normalized.references = normalized.references.filter(ref => ref.kind !== "basis")
    for (const item of Object.values(normalized.nutrition)) {
      item.daily_pct = null; item.reference_basis = null; delete item.comparisons
    }
  }
  return normalized
}
