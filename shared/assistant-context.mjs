const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length

// Keep the existing 100 KB privacy budget, but omit whole fields instead of cutting JSON.
export function boundedAssistantContext(context, limit = 100000) {
  const history = (Array.isArray(context.history) ? context.history : []).slice(0, 20)
  let current = context.current_result || null
  const metadata = history.map(item => ({ id: item.id, created_at: item.created_at, region: item.region, language: item.language, details_omitted: true }))
  let result = { region: context.region, current_result: current, history: metadata }
  if (bytes(result) > limit && current) {
    current = { region: current.region, language: current.language, nutrition: current.nutrition, nutrition_basis: current.nutrition_basis,
      ingredients: (current.ingredients || []).map(item => ({ name: item.name, name_en: item.name_en, category: item.category })),
      alerts: (current.alerts || []).map(item => ({ level: item.level, title: String(item.title || "").slice(0, 120), description: String(item.description || "").slice(0, 120) })),
      references: (current.references || []).slice(0, 3), details_omitted: true }
    result = { ...result, current_result: current }
  }
  if (bytes(result) > limit) throw new Error("Assistant context exceeds the privacy limit")
  for (let index = 0; index < history.length; index++) {
    const candidate = { ...result, history: result.history.map((item, i) => i === index ? history[index] : item) }
    if (bytes(candidate) <= limit) result = candidate
  }
  return result
}
