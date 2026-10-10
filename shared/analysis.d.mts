import type { AnalysisResult, Ingredient, Nutrition, NutritionItem } from "../src/types/analysis"
export const ANALYSIS_VERSION: string
export const NUTRIENT_KEYS: readonly string[]
export function validateAnalysis(raw: unknown, region?: string, language?: string, strict?: boolean): AnalysisResult
export function normalizeNutrition(raw: unknown, region?: string, basis?: unknown): Nutrition
export function nutritionBasis(value: unknown, nutrition?: unknown): AnalysisResult["nutrition_basis"]
export function buildReferences(ingredients: Ingredient[], region: string, nutrition?: Nutrition, language?: string): AnalysisResult["references"]
export function nutrientStatus(key: string, item: NutritionItem | undefined, language?: string): { label: string; color: string; detail: string }
