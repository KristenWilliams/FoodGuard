import { useEffect, useState } from "react"
import { readPreferences } from "@/lib/preferences"

export type Language = "zh" | "en"
const CATEGORIES: Record<string, string> = {
  糖类原料: "Sugars", 基础原料: "Base ingredient", 凝胶剂: "Gelling agent", 果汁原料: "Fruit juice", 水果加工原料: "Fruit ingredient",
  主料: "Main ingredient", 辅料: "Other ingredient", 添加剂: "Additive", 防腐剂: "Preservative", 色素: "Colour", 甜味剂: "Sweetener",
  增味剂: "Flavour enhancer", 抗氧化剂: "Antioxidant", 乳化剂: "Emulsifier", 增稠剂: "Thickener", 酸度调节剂: "Acidity regulator", 其他: "Other",
}
export const categoryLabel = (category: string, language: Language) => language === "en" ? CATEGORIES[category] || category : Object.entries(CATEGORIES).find(([, en]) => en.toLowerCase() === category.toLowerCase())?.[0] || category
export const regionLabel = (region: string | undefined, language: Language) => {
  const labels = language === "en" ? { cn: "China", us: "US", eu: "EU", global: "Global" } : { cn: "中国", us: "美国", eu: "欧盟", global: "全球" }
  return region ? labels[region as keyof typeof labels] || (language === "en" ? "Not recorded" : "未记录") : language === "en" ? "Not recorded" : "未记录"
}

const DICT = {
  zh: {
    home: "首页",
    scan: "扫描",
    history: "历史",
    discover: "发现",
    settings: "设置",
    assistant: "食品安全助手",
    startScan: "开始扫描",
    appSubtitle: "AI驱动的食品安全分析 — 拍照识别配料表，获取基于官方标准的营养与成分评估",
    smartScan: "智能识别",
    smartScanDesc: "拍照自动识别配料表与食品添加剂",
    references: "权威参考",
    referencesDesc: "根据你选择的地区偏好匹配官方参考来源",
    riskTips: "风险提示",
    riskTipsDesc: "添加剂标识与潜在健康风险预警",
  },
  en: {
    home: "Home",
    scan: "Scan",
    history: "History",
    discover: "Discover",
    settings: "Settings",
    assistant: "Food safety assistant",
    startScan: "Start scan",
    appSubtitle: "AI food safety analysis for ingredient labels and nutrition facts",
    smartScan: "Smart Scan",
    smartScanDesc: "Recognize ingredients and additives from photos",
    references: "References",
    referencesDesc: "Matches official references to your selected region",
    riskTips: "Risk Notes",
    riskTipsDesc: "Ingredient and additive risk notes",
  },
} as const

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => readPreferences().language)

  useEffect(() => {
    const handle = () => setLanguage(readPreferences().language)
    window.addEventListener("foodguard:preferences", handle)
    return () => window.removeEventListener("foodguard:preferences", handle)
  }, [])

  return language
}

export function useT() {
  const language = useLanguage()
  return (key: keyof typeof DICT.zh) => DICT[language][key]
}
