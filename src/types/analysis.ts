export interface Ingredient {
  name: string
  name_en: string
  category: string
  risk_level: "safe" | "moderate" | "caution"
  risk_reason: string | null
  additive_code: string | null
  daily_intake_limit: string | null
  description: string
}

export interface NutritionItem {
  value: number | null
  unit: string
  daily_pct: number | null
  status?: "recognized" | "not_listed" | "unreadable"
  reference_basis?: string | null
  label_daily_pct?: number | null
  comparisons?: Record<string, number | null>
}

export interface Nutrition {
  [key: string]: NutritionItem
  calories: NutritionItem
  protein: NutritionItem
  fat: NutritionItem
  carbs: NutritionItem
  sodium: NutritionItem
  sugar: NutritionItem
  fiber: NutritionItem
}

export interface RiskAlert {
  level: "info" | "warning" | "danger"
  title: string
  description: string
  ingredients: string[]
}

export interface Reference {
  id?: string
  kind?: "basis" | "ingredient" | "lookup" | "background"
  source: string
  source_full: string
  region: string
  url: string
  citation: string
  related_ingredients?: string[]
}

export interface AnalysisResult {
  product_name: string | null
  analysis_region?: "cn" | "us" | "eu" | "global"
  analysis_language?: "zh" | "en"
  analysis_version?: string
  nutrition_basis?: { amount: number; unit: "g" | "ml" } | null
  ingredients: Ingredient[]
  nutrition: Nutrition
  safety_score: number
  risk_level: "safe" | "moderate" | "caution"
  risk_alerts: RiskAlert[]
  references: Reference[]
  overall_assessment: string
}

export interface ScanRecord {
  id: string
  session_id: string
  image_url: string | null
  product_name: string | null
  ingredient_text: string | null
  analysis_result: AnalysisResult
  safety_score: number
  risk_level: "safe" | "moderate" | "caution"
  created_at: string
  cache_key?: string
}
