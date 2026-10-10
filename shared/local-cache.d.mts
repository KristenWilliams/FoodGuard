import type { AnalysisResult } from "../src/types/analysis"
export const CACHE_TTL: number
export function validCache(raw: unknown, version: string, now?: number): Record<string, { result: AnalysisResult; created_at: number }>
