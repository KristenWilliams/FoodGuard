// Synthetic label values used only by automated tests, never as analysis fallbacks.
export function foodLabel() {
  return {
    is_valid_food_label: true, label_evidence: { ingredient_text: "配料：小麦粉、山梨酸钾、苯甲酸钠", nutrition_text: "每100g 钠600mg 蛋白质12g 脂肪0g 碳水60g" },
    excluded_names: ["测试品牌甲"], risk_level: "moderate", overall_assessment: "按可读标签使用统一计量基准。",
    ingredients: [
      { name: "小麦粉", name_en: "Wheat flour", category: "主料", risk_level: "safe", description: "含小麦。", risk_reason: "对小麦严重过敏者必须避免。" },
      { name: "山梨酸钾", name_en: "Potassium sorbate", category: "防腐剂", risk_level: "moderate", description: "用于防腐，不判断添加量。", risk_reason: null },
      { name: "苯甲酸钠", name_en: "Sodium benzoate", category: "防腐剂", risk_level: "moderate", description: "用于防腐。", risk_reason: null },
    ],
    nutrition_basis: { amount: 100, unit: "g" },
    nutrition: {
      protein: { value: 12, unit: "g", status: "recognized", daily_pct: 999 },
      fat: { value: 0, unit: "g", status: "recognized" },
      carbs: { value: 60, unit: "g", status: "recognized" },
      sodium: { value: 600, unit: "mg", status: "recognized" },
      sugar: { value: null, unit: "g", status: "not_listed" },
      fiber: { value: null, unit: "g", status: "unreadable" },
    },
    risk_alerts: [{ level: "danger", title: "小麦过敏", description: "严重过敏者必须避免。", ingredients: ["小麦粉"] }],
    references: [{ source: "fake", region: "CN", url: "https://malicious.invalid", citation: "已检测合规" }],
  }
}
