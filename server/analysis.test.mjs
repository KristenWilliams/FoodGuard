import test from "node:test"
import assert from "node:assert/strict"
import { validateAnalysis, nutrientStatus, normalizeNutrition, nutritionBasis } from "../shared/analysis.mjs"
import { foodLabel } from "./analysis-fixture.mjs"

test("printed zero and missing or unreadable values stay distinct", () => {
  const result = validateAnalysis(foodLabel())
  assert.equal(result.nutrition.fat.value, 0)
  assert.equal(result.nutrition.fat.daily_pct, 0)
  assert.equal(result.nutrition.sugar.value, null)
  assert.equal(result.nutrition.sugar.status, "not_listed")
  assert.equal(result.nutrition.fiber.status, "unreadable")
  assert.equal(nutrientStatus("fat", result.nutrition.fat).label, "标签标示为 0")
})
test("CN NRV and FDA DV are deterministic, never the AI percentage", () => {
  const cn = validateAnalysis(foodLabel(), "cn")
  const us = validateAnalysis(foodLabel(), "us", "en")
  assert.equal(cn.nutrition.protein.daily_pct, 20)
  assert.equal(cn.nutrition.sodium.daily_pct, 30)
  assert.equal(us.nutrition.sodium.daily_pct, 26.1)
  assert.ok(!cn.references.some(ref => ref.region !== "CN"))
  assert.equal(us.nutrition.sodium.reference_basis, "US FDA DV")
  assert.equal(us.nutrition.sodium.comparisons["CN NRV"], 30)
  assert.equal(cn.nutrition.sodium.comparisons, undefined)
})
test("total sugars have no invented daily value; protein is not a restriction", () => {
  const value = normalizeNutrition({ sugar: { value: 10, unit: "g" }, protein: { value: 80, unit: "g" } }, "us", { amount: 100, unit: "g" })
  assert.equal(value.sugar.daily_pct, null)
  assert.ok(!/控制|偏高|减少/.test(nutrientStatus("protein", value.protein).detail))
  assert.equal(nutrientStatus("protein", value.protein).color, "teal")
})
test("unknown portion basis and inconsistent units do not produce reference percentages", () => {
  const raw = foodLabel(); raw.nutrition_basis = null
  assert.equal(validateAnalysis(raw).nutrition.sodium.daily_pct, null)
  assert.equal(nutritionBasis({ amount: 100, unit: "g" }, { a: { value: 1, unit: "g/100g" }, b: { value: 1, unit: "g/20g" } }), null)
})
test("non-food, missing gate/evidence, partial schema and malformed numbers are rejected", () => {
  for (const change of [raw => raw.is_valid_food_label = false, raw => delete raw.is_valid_food_label,
    raw => raw.label_evidence = {}, raw => raw.ingredients = null, raw => raw.nutrition.sodium.value = "600", raw => raw.nutrition.sodium.value = -2,
    raw => raw.risk_level = "nonsense", raw => raw.risk_alerts[0].level = "unknown"]) {
    const raw = foodLabel(); change(raw); assert.throws(() => validateAnalysis(raw))
  }
})
test("warnings stay strong and generic words are not scrubbed as brands", () => {
  const raw = foodLabel(); raw.overall_assessment += " 测试品牌甲包装上标示。"
  const result = validateAnalysis(raw)
  assert.ok(result.overall_assessment.includes("统一计量"))
  assert.ok(!JSON.stringify(result).includes("测试品牌甲"))
  assert.ok(result.risk_alerts[0].description.includes("必须避免"))
})
test("sources use controlled catalog, preserve two ingredient-specific URLs and identify searches", () => {
  const result = validateAnalysis(foodLabel(), "global")
  assert.ok(!JSON.stringify(result.references).includes("malicious.invalid"))
  const lookups = result.references.filter(ref => ref.kind === "lookup")
  assert.equal(lookups.length, 2)
  assert.notEqual(lookups[0].url, lookups[1].url)
  assert.ok(result.references.some(ref => ref.url.endsWith("/2724")))
  assert.ok(result.references.some(ref => ref.url.endsWith("/1098")))
  assert.ok(result.ingredients.every(item => item.daily_intake_limit === null))
})
test("China rejects foreign criteria and old reports retain their legacy status", () => {
  const raw = foodLabel(); raw.overall_assessment = "依据 FDA 进行评判。"
  assert.throws(() => validateAnalysis(raw, "cn"))
  assert.equal(validateAnalysis(foodLabel(), "cn", "zh", false).analysis_version, undefined)
})
test("English ingredient names map to the same verified entries", () => {
  const raw = foodLabel(); raw.ingredients[1].name = "Potassium sorbate"
  const result = validateAnalysis(raw, "global", "en")
  assert.equal(result.ingredients[1].additive_code, "INS 202")
  assert.ok(result.references.some(ref => ref.url.endsWith("/2724")))
})
test("a warning after the first twelve entries is never dropped", () => {
  const raw = foodLabel()
  raw.risk_alerts = Array.from({ length: 12 }, () => ({ level: "info", title: "资料", description: "标签提示", ingredients: [] }))
  raw.risk_alerts.push({ level: "danger", title: "严重警示", description: "必须避免。", ingredients: [] })
  assert.equal(validateAnalysis(raw).risk_alerts[12].description, "必须避免。")
})
