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
  value: number
  unit: string
  daily_pct: number
}

export interface Nutrition {
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
  source: string
  source_full: string
  region: string
  url: string
  citation: string
}

export interface AnalysisResult {
  product_name: string | null
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
}
