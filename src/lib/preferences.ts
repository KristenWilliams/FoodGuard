export interface FoodGuardPreferences {
  region: "cn" | "us" | "eu" | "global"
  language: "zh" | "en"
  showAdditiveCodes: boolean
  showNutritionChart: boolean
}

const STORAGE_KEY = "foodguard_preferences"

export const DEFAULT_PREFERENCES: FoodGuardPreferences = {
  region: "cn",
  language: "zh",
  showAdditiveCodes: true,
  showNutritionChart: true,
}

export function readPreferences(): FoodGuardPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES
    return {
      ...parsed,
      region: ["cn", "us", "eu", "global"].includes(parsed.region) ? parsed.region : "cn",
      language: parsed.language === "en" ? "en" : "zh",
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: FoodGuardPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent("foodguard:preferences", { detail: preferences }))
}
