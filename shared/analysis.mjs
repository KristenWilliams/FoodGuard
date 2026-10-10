export const ANALYSIS_VERSION = "2026-10-09.2"
export const NUTRIENT_KEYS = ["calories", "protein", "fat", "carbs", "sodium", "sugar", "fiber", "saturated_fat", "calcium", "iron", "potassium"]
const CN_NRV_URL = "https://www.nhc.gov.cn/zwgk/zcjd/201402/6f68ec6692594cf28d190cb47b770c11.shtml"
const US_DV_URL = "https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels"
const CN_VALUES = { calories: 8400, protein: 60, fat: 60, carbs: 300, sodium: 2000, fiber: 25, saturated_fat: 20, calcium: 800, iron: 15, potassium: 2000 }
const US_VALUES = { calories: 2000, protein: 50, fat: 78, carbs: 275, sodium: 2300, fiber: 28, saturated_fat: 20, calcium: 1300, iron: 18, potassium: 4700 }
const CODES = { "山梨酸钾": "INS 202", "苯甲酸钠": "INS 211", "蔗糖素": "INS 955" }
const JECFA = { "山梨酸钾": "2724", "苯甲酸钠": "1098", "蔗糖素": "2340" }
const ALIASES = { "potassium sorbate": "山梨酸钾", "sodium benzoate": "苯甲酸钠", "sucralose": "蔗糖素" }
const canonical = item => CODES[item.name] ? item.name : ALIASES[String(item.name).toLowerCase()] || ALIASES[String(item.name_en).toLowerCase()] || item.name
const RISK = new Set(["safe", "moderate", "caution"])
const STATUS = new Set(["recognized", "not_listed", "unreadable"])

function fail(message) { throw new Error(message) }
function text(value, max = 1600) { return typeof value === "string" ? value.trim().slice(0, max) : "" }
function number(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null }
function stringArray(value) { return Array.isArray(value) ? value.filter((s) => typeof s === "string").map((s) => text(s, 100)).slice(0, 100) : [] }
function neutral(value, names = []) {
  let result = text(value)
  for (const name of names.filter((n) => n.length > 1)) result = result.split(name).join("")
  return result.replace(/(?:品牌|厂家|生产商|制造商|brand|manufacturer)\s*[:：]\s*[^。；;，,\n]+/gi, "").trim()
}

export function normalizeNutrition(nutrition, region = "cn", basis = null) {
  const input = nutrition && typeof nutrition === "object" && !Array.isArray(nutrition) ? nutrition : {}
  const normalized = {}
  for (const key of new Set([...NUTRIENT_KEYS, ...Object.keys(input).filter(key => /^[a-z][a-z0-9_]{0,40}$/.test(key) && !["constructor", "prototype"].includes(key)).slice(0, 30)])) {
    const item = input[key] && typeof input[key] === "object" ? input[key] : {}
    const value = number(item.value)
    const unknownUnit = /未可靠识别|unknown|unreadable/.test(String(item.unit || ""))
    const status = STATUS.has(item.status) ? item.status : unknownUnit || value === null ? "unreadable" : "recognized"
    const unit = text(item.unit, 50)
    const validUnit = key === "calories" ? /^(kcal|kJ|千卡|千焦)(?:\/|$)/i.test(unit) : /^(g|mg|克|毫克)(?:\/|$)/i.test(unit)
    const valid = status === "recognized" && value !== null && value <= 1_000_000 && validUnit
    const reference = region === "cn" ? CN_VALUES : US_VALUES
    let amount = valid ? value : null
    if (key === "calories" && amount !== null) {
      if (region === "cn" && /kcal|千卡/.test(unit)) amount *= 4.184
      else if (region !== "cn" && /kJ|千焦/i.test(unit)) amount /= 4.184
      else if (!/kcal|kJ|千卡|千焦/i.test(unit)) amount = null
    } else if (amount !== null && ["sodium", "calcium", "iron", "potassium"].includes(key) && /^(g|克)(?:\/|$)/i.test(unit)) amount *= 1000
    else if (amount !== null && !["sodium", "calcium", "iron", "potassium"].includes(key) && /^(mg|毫克)(?:\/|$)/i.test(unit)) amount /= 1000
    const expected = ["sodium", "calcium", "iron", "potassium"].includes(key) ? /^(mg|毫克)(?:\/|$)/i : /^(g|克)(?:\/|$)/i
    if (key !== "calories" && amount !== null && !expected.test(unit) && !validUnit) amount = null
    const pct = amount !== null && reference[key] && basis
      ? Math.round(amount / reference[key] * 1000) / 10 : null
    normalized[key] = {
      value: valid ? value : null, unit, status: valid ? "recognized" : status === "not_listed" ? status : "unreadable",
      daily_pct: pct, reference_basis: pct === null ? null : region === "cn" ? "CN NRV" : "US FDA DV",
      label_daily_pct: valid ? number(item.label_daily_pct) : null,
      ...(region !== "cn" && pct !== null ? { comparisons: { "CN NRV": CN_VALUES[key] ? Math.round(amount * (key === "calories" ? 4.184 : 1) / CN_VALUES[key] * 1000) / 10 : null, "US FDA DV": pct } } : {}),
    }
  }
  return normalized
}

export function nutritionBasis(value, nutrition) {
  const explicit = value && number(value.amount) > 0 && ["g", "ml"].includes(value.unit) ? { amount: value.amount, unit: value.unit } : null
  const units = Object.values(nutrition || {}).filter((item) => item && number(item.value) !== null).map((item) => String(item.unit || ""))
  const matches = units.map((unit) => unit.match(/\/(\d+(?:\.\d+)?)(g|ml)/i)).filter(Boolean)
  if (!matches.length) return explicit
  if (matches.some((match) => match[1] !== matches[0][1] || match[2].toLowerCase() !== matches[0][2].toLowerCase())) return null
  if (explicit && (explicit.amount !== Number(matches[0][1]) || explicit.unit !== matches[0][2].toLowerCase())) return null
  return { amount: Number(matches[0][1]), unit: matches[0][2].toLowerCase() }
}

export function buildReferences(ingredients, region, nutrition, language = "zh") {
  const refs = []
  const en = language === "en"
  const hasNutrition = Object.values(nutrition || {}).some((item) => item?.daily_pct !== null && item?.daily_pct !== undefined)
  if (region !== "cn" && hasNutrition) refs.push({ id: "cn-nrv-comparison", source: "GB 28050 NRV", source_full: "China nutrition label reference values", region: "CN", url: CN_NRV_URL, kind: "basis", citation: "Chinese label reference values, shown separately for comparison, not a foreign compliance judgment.", related_ingredients: [] })
  if (hasNutrition) refs.push({ id: region === "cn" ? "cn-nrv" : "us-dv", source: region === "cn" ? "GB 28050 NRV" : "FDA Daily Values", source_full: region === "cn" ? en ? "China nutrition label reference values" : "预包装食品营养标签参考值" : "FDA nutrition label daily values", region: region === "cn" ? "CN" : "US", url: region === "cn" ? CN_NRV_URL : US_DV_URL, kind: "basis", citation: en ? "Calculated using label amounts and the named reference values, not personal intake." : "按标签标示量计算参考占比；不是个人每日需求或实际摄入量。", related_ingredients: [] })
  for (const ingredient of ingredients.filter(item => CODES[canonical(item)] || item.additive_code || /添加剂|增味|防腐|甜味|色素|抗氧化|乳化|增稠|凝胶|酸度|酸味|稳定|additive|preservative|sweeten|colou?r|antioxid|emuls|thicken|gelling|acid|stabil/i.test(item.category))) {
    const name = ingredient.name
    const identity = canonical(ingredient)
    const displayName = en ? ingredient.name_en || name : name
    refs.push({ id: `cn-lookup-${name}`, source: en ? "Official standard search" : "官方标准查询", source_full: `${displayName} · ${en ? "Food additive standards" : "食品添加剂标准检索"}`, region: "CN", url: `https://std.samr.gov.cn/search/std?q=${encodeURIComponent(name)}`, kind: "lookup", citation: en ? `Search for ${displayName}. This is not a verified clause; food category and usage amount are needed to check compliance.` : `检索对象：${name}。查询入口不是已核对条款；食品类别和添加量不明时，不能判断限量合规。`, related_ingredients: [displayName] })
    if (region !== "cn" && JECFA[identity]) refs.push({ id: `jecfa-${JECFA[identity]}`, source: "WHO/JECFA", source_full: `${name} · JECFA ingredient entry`, region: "GLOBAL", url: `https://apps.who.int/food-additives-contaminants-jecfa-database/Home/Chemical/${JECFA[identity]}`, kind: "ingredient", citation: "Ingredient evaluation, not a measurement or compliance finding for this product.", related_ingredients: [name] })
  }
  for (const code of ["2760", "2761", "2762", "2763"]) refs.push({ id: `gb-${code}`, source: `GB ${code}`, source_full: (en ? { 2760: "Food additive use standard", 2761: "Mycotoxin limits in foods", 2762: "Contaminant limits in foods", 2763: "Maximum pesticide residue limits in foods" } : { 2760: "食品添加剂使用标准", 2761: "食品中真菌毒素限量", 2762: "食品中污染物限量", 2763: "食品中农药最大残留限量" })[code], region: "CN", url: `https://std.samr.gov.cn/search/std?q=GB%20${code}`, kind: "background", citation: en ? "Background standard search. A label photo cannot measure additive amounts, contaminants, mycotoxins or pesticide residues." : "背景标准查询。标签照片不能检测添加量、污染物、真菌毒素或农药残留。", related_ingredients: [] })
  return refs
}

export function validateAnalysis(raw, region = "cn", language = "zh", strict = true) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("AI 返回格式无效，请重试。")
  if (strict && raw.is_valid_food_label !== true) fail(text(raw.error) || "无法确认这是可读的食品配料或营养标签，请重新拍摄。")
  if (!Array.isArray(raw.ingredients) || raw.ingredients.length > 100 || !Array.isArray(raw.risk_alerts) || raw.risk_alerts.length > 100) fail("AI 返回数据不完整，请重试。")
  const evidence = raw.label_evidence && typeof raw.label_evidence === "object" ? raw.label_evidence : {}
  if (strict && !text(evidence.ingredient_text) && !text(evidence.nutrition_text)) fail("没有可靠识别到配料或营养文字，请重新拍摄标签。")
  if (strict && (!RISK.has(raw.risk_level) || !text(raw.overall_assessment) || !raw.nutrition || Array.isArray(raw.nutrition) || typeof raw.nutrition !== "object")) fail("分析结构不完整。")
  if (strict) {
    for (const item of Object.values(raw.nutrition)) {
      if (!item || !STATUS.has(item.status) || typeof item.unit !== "string" || item.value !== null && number(item.value) === null) fail("营养数据格式不可靠。")
      if (item.status === "recognized" && (item.value === null || !/^(g|mg|kcal|kJ)(?:\/|$)/i.test(item.unit))) fail("营养数据缺少可靠数值或单位。")
    }
    if (raw.nutrition.calories?.status === "recognized" && !/^(kcal|kJ)(?:\/|$)/i.test(raw.nutrition.calories.unit)) fail("能量单位不可靠。")
    for (const item of raw.risk_alerts) {
      if (!item || !["info", "warning", "danger"].includes(item.level) || !text(item.title) || !text(item.description) || !Array.isArray(item.ingredients)) fail("警示数据不完整。")
    }
  }
  const excludedNames = stringArray(raw.excluded_names)
  if (strict && region === "cn") {
    const judgments = [raw.overall_assessment, ...raw.ingredients.flatMap(item => [item?.description, item?.risk_reason]), ...raw.risk_alerts.flatMap(item => [item?.title, item?.description])].join(" ")
    if (/\b(?:FDA|EFSA|JECFA|WHO|USDA|FSANZ)\b|美国标准|欧盟标准|日本标准/.test(judgments)) fail("所选地区与分析依据不一致，请重试。")
  }
  const ingredients = raw.ingredients.map((item) => {
    if (!item || !text(item.name)) fail("AI 配料字段不完整，请重试。")
    if (strict && (!RISK.has(item.risk_level) || !text(item.description) || !text(item.category))) fail("配料解释不完整。")
    const name = neutral(text(item.name, 100), excludedNames)
    if (!name || (strict && excludedNames.includes(text(item.name)))) fail("识别内容混入了非配料信息，请重试。")
    return { name, name_en: neutral(text(item.name_en, 100), excludedNames), category: neutral(text(item.category, 60), excludedNames) || (language === "en" ? "Other" : "其他"), risk_level: RISK.has(item.risk_level) ? item.risk_level : "moderate", risk_reason: neutral(item.risk_reason, excludedNames) || null, additive_code: CODES[canonical({ name, name_en: item.name_en })] || null, daily_intake_limit: null, description: neutral(item.description, excludedNames) }
  })
  const basis = nutritionBasis(raw.nutrition_basis, raw.nutrition)
  const nutrition = normalizeNutrition(raw.nutrition, region, basis)
  if (strict && !ingredients.length && !Object.values(nutrition).some(item => item.status === "recognized")) fail("没有可可靠识别的标签内容。")
  const result = { product_name: null, safety_score: 0, analysis_region: region, analysis_language: language, analysis_version: strict ? ANALYSIS_VERSION : raw.analysis_version, ingredients, nutrition, nutrition_basis: basis, risk_level: RISK.has(raw.risk_level) ? raw.risk_level : "moderate", risk_alerts: raw.risk_alerts.map((item) => ({ level: ["info", "warning", "danger"].includes(item?.level) ? item.level : "info", title: neutral(item?.title, excludedNames), description: neutral(item?.description, excludedNames), ingredients: stringArray(item?.ingredients).filter((name) => ingredients.some((item) => item.name === name)) })), overall_assessment: neutral(raw.overall_assessment, excludedNames), references: buildReferences(ingredients, region, nutrition, language) }
  if (!result.overall_assessment) result.overall_assessment = language === "en" ? "Review the readable label details below." : "请查看下方已识别的标签信息。"
  return result
}

export function nutrientStatus(key, item, language = "zh") {
  const en = language === "en"
  if (!item || item.status && item.status !== "recognized" || item.value === null || item.value === undefined) return { label: en ? "Not available" : "无法判断", color: "gray", detail: en ? "Missing or unreadable label value" : "标签未标注或未可靠识别" }
  if (item.value === 0) return { label: en ? "Labelled zero" : "标签标示为 0", color: "blue", detail: en ? "A labelled zero is not missing data" : "仅表示标签数值，不等于绝对不含" }
  if (item.daily_pct === null || item.daily_pct === undefined) return { label: en ? "Label amount" : "标签含量", color: "blue", detail: en ? "No applicable reference percentage" : "没有适用的参考占比，不作高低判断" }
  const limiting = ["sodium", "fat", "saturated_fat"].includes(key)
  return { label: limiting ? en ? "Reference contribution" : "参考占比" : en ? "Nutrient contribution" : "营养贡献", color: limiting && item.daily_pct >= 100 ? "orange" : ["protein", "fiber", "calcium", "iron", "potassium"].includes(key) ? "teal" : "blue", detail: en ? "For the labelled amount, not your actual intake" : "按标签标示量计算，不是实际摄入量" }
}
