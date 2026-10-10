import { normalizeAnalysisResult } from "@/lib/analysisPolicy"
import { readPreferences } from "@/lib/preferences"
import { credentialState, requireProvider } from "@/lib/credentials"
import { apiBase, apiRequest, credentialFingerprint, isNativeAndroid, nativeLocal } from "@/lib/native"
import { ANALYSIS_VERSION } from "../../shared/analysis.mjs"
import { validCache } from "../../shared/local-cache.mjs"
import { boundedAssistantContext } from "../../shared/assistant-context.mjs"
import type { AnalysisResult, ScanRecord } from "@/types/analysis"

const LOCAL_HISTORY_KEY = "foodguard_scan_history"
const ANALYSIS_CACHE_KEY = "foodguard_analysis_cache_v3"
const LOCAL_HISTORY_LIMIT = 20
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const isFoodGuardApiConfigured = true
export const isRemoteAnalysisConfigured = true
export type DemoAnalysisKey = "instant-noodle" | "soy-sauce"
export type AnalysisMode = "fast" | "deep"
export type AssistantHistoryLink = { id: string; label: string }
export type AssistantMessage = { role: "user" | "assistant"; content: string; history?: AssistantHistoryLink[] }
export type DiscoverItem = {
  id: string; title: string; summary: string; source: string; url: string
  category: "食品安全" | "营养学" | "包装食品" | "官方来源"
  published_at?: string | null
  region: ReturnType<typeof readPreferences>["region"] | "global"
}
export type DiscoverFeed = {
  items: DiscoverItem[]; references: DiscoverItem[]; status: "live" | "cached" | "offline"
  fetched_at: string | null; partial?: boolean
}
export type AnalysisJobStatus = "running" | "completed" | "failed"
export type AnalysisJob = {
  id: string; status: AnalysisJobStatus; mode: AnalysisMode; result?: AnalysisResult; record?: ScanRecord
  error?: string; error_code?: string; cache_key?: string; created_at?: number; credential_id?: string; model?: string; cached?: boolean
}
const analysisJobs = new Map<string, AnalysisJob>()
let polling = false
let scanDraft: { image: string; demo?: DemoAnalysisKey } | null = null
export const getScanDraft = () => scanDraft
export function setScanDraft(draft: typeof scanDraft) { scanDraft = draft }

function emitJob(job: AnalysisJob) {
  analysisJobs.set(job.id, job)
  if (analysisJobs.size > 20) {
    const oldest = [...analysisJobs.values()].find(item => item.status !== "running")
    if (oldest) analysisJobs.delete(oldest.id)
  }
  window.dispatchEvent(new CustomEvent("foodguard:analysis-job", { detail: job }))
}
export function getAnalysisJob(id: string) { return analysisJobs.get(id) }
export function getActiveAnalysisJob() { return [...analysisJobs.values()].find(job => job.status === "running") }

export function monitorAnalysisJobs(): () => void {
  const refresh = () => { void recoverNativeJobs() }
  refresh()
  const timer = window.setInterval(refresh, 1800)
  window.addEventListener("visibilitychange", refresh)
  return () => { window.clearInterval(timer); window.removeEventListener("visibilitychange", refresh) }
}
async function recoverNativeJobs() {
  if (!isNativeAndroid() || polling) return
  polling = true
  try {
    const { jobs } = await nativeLocal.listJobs()
    for (const job of jobs) {
      if (job.status === "completed" && job.result) {
        const result = normalizeAnalysisResult(job.result, job.result.analysis_region || "cn", job.result.analysis_language)
        const record = await saveScan(result, undefined, job.id, job.created_at, job.cache_key)
        if (job.cache_key) writeAnalysisCache(job.cache_key, result)
        emitJob({ ...job, result, record })
        await nativeLocal.acknowledgeJob({ id: job.id })
      } else {
        if (job.status === "failed" && job.error_code === "KEY_INVALID") window.dispatchEvent(new CustomEvent("foodguard:credential-error", { detail: { credential_id: job.credential_id } }))
        const existing = analysisJobs.get(job.id)
        if (!existing || existing.status !== job.status) emitJob(job)
        if (job.status === "failed") await nativeLocal.acknowledgeJob({ id: job.id })
      }
    }
  } catch {
    // Completed native reports stay encrypted on disk until local history accepts them.
  } finally { polling = false }
}

export async function fetchDiscoverItems(): Promise<DiscoverFeed> {
  const region = readPreferences().region
  try {
    const data = await apiRequest<DiscoverFeed>("/api/discover?region=" + region, {}, undefined, 12_000)
    const now = Date.now()
    return {
      ...data,
      items: (data.items || []).filter(item => {
        const date = Date.parse(item.published_at || "")
        return Number.isFinite(date) && date <= now && date >= now - 30 * 86_400_000 && item.category !== "官方来源"
      }),
      references: data.references?.length ? data.references : getFallbackDiscoverItems(region),
    }
  } catch { return { items: [], references: getFallbackDiscoverItems(region), status: "offline", fetched_at: null } }
}

export function startAnalysisJob(image: string, _demo: DemoAnalysisKey | undefined, mode: AnalysisMode, refresh = false): AnalysisJob {
  const existing = getActiveAnalysisJob()
  if (existing) return existing
  const job: AnalysisJob = { id: crypto.randomUUID(), status: "running", mode, created_at: Date.now() }
  emitJob(job)
  void (async () => {
    const provider = await requireProvider()
    const prefs = readPreferences()
    const model = credentialState().choices[mode]
    job.model = model
    const cacheKey = await sha256(JSON.stringify([ANALYSIS_VERSION, provider.url, await sha256(provider.key), mode, model, prefs.region, prefs.language, await sha256(image)]))
    job.cache_key = cacheKey
    job.credential_id = await credentialFingerprint(provider.url, provider.key)
    const cached = refresh ? null : readAnalysisCache(cacheKey)
    if (cached) {
      const record = await saveScan(cached, undefined, job.id, Date.now(), cacheKey)
      emitJob({ ...job, status: "completed", result: cached, record, cached: true })
      return
    }
    const payload = { image_base64: image, analysis_mode: mode, model, region: prefs.region, language: prefs.language, client_cache_key: cacheKey }
    if (isNativeAndroid()) {
      await nativeLocal.startAnalysis({ id: job.id, base: apiBase(), payload })
      return
    }
    const data = await apiRequest<{ result: AnalysisResult }>("/api/analyze-ingredients", {
      method: "POST", body: JSON.stringify(payload),
    }, provider.key, mode === "deep" ? 195_000 : 105_000, provider.url)
    const result = normalizeAnalysisResult(data.result, prefs.region, prefs.language)
    const record = await saveScan(result, undefined, job.id, Date.now(), cacheKey)
    writeAnalysisCache(cacheKey, result)
    emitJob({ ...job, status: "completed", result, record })
  })().catch(error => emitJob({ ...job, status: "failed", error: error instanceof Error ? error.message : "分析失败，请重试。" }))
  return job
}

export async function saveScan(result: AnalysisResult, imageUrl?: string, id: string = crypto.randomUUID(), createdAt = Date.now(), cacheKey?: string): Promise<ScanRecord> {
  const history = readLocalHistory()
  const existing = history.find(record => record.id === id)
  if (existing) return existing
  let sessionId = localStorage.getItem("foodguard_session_id")
  if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem("foodguard_session_id", sessionId) }
  const record: ScanRecord = {
    id, session_id: sessionId, image_url: imageUrl || null, product_name: null, ingredient_text: null,
    analysis_result: result, safety_score: 0, risk_level: result.risk_level, created_at: new Date(createdAt).toISOString(),
    ...(cacheKey ? { cache_key: cacheKey } : {}),
  }
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify([record, ...history].slice(0, LOCAL_HISTORY_LIMIT)))
  return record
}
export async function getScanHistory(limit = 20, offset = 0): Promise<ScanRecord[]> {
  return readLocalHistory().slice(offset, offset + Math.min(limit, LOCAL_HISTORY_LIMIT))
}
export async function getScanById(id: string): Promise<ScanRecord | null> {
  const record = readLocalHistory().find(scan => scan.id === id)
  if (!record) return null
  const result = record.analysis_result
  return { ...record, analysis_result: normalizeAnalysisResult(result, result.analysis_region || "cn", result.analysis_language) }
}
export async function deleteScan(id: string): Promise<void> {
  const records = readLocalHistory()
  const removed = records.find(record => record.id === id)
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(records.filter(scan => scan.id !== id)))
  if (removed) {
    const cache = readCache()
    for (const [key, entry] of Object.entries(cache)) {
      if (key === removed.cache_key || JSON.stringify(entry.result) === JSON.stringify(removed.analysis_result)) delete cache[key]
    }
    localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache))
  }
}
function readLocalHistory(): ScanRecord[] {
  const parsed = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]")
  if (!Array.isArray(parsed)) throw new Error("本机历史数据格式异常。")
  return parsed.filter(record => record?.id && record.analysis_result).slice(0, LOCAL_HISTORY_LIMIT)
}
type Cached = Record<string, { result: AnalysisResult; created_at: number }>
function readCache(): Cached {
  try {
    const raw = localStorage.getItem(ANALYSIS_CACHE_KEY) || "{}"
    const valid = validCache(JSON.parse(raw), ANALYSIS_VERSION)
    if (JSON.stringify(valid) !== raw) localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(valid))
    return valid
  } catch { return {} }
}
function readAnalysisCache(key: string): AnalysisResult | null {
  const entry = readCache()[key]
  return entry?.result || null
}
function writeAnalysisCache(key: string, result: AnalysisResult) {
  try {
    const cache = readCache()
    cache[key] = { result, created_at: Date.now() }
    localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(validCache(cache, ANALYSIS_VERSION)))
  } catch { /* A cache failure must not discard a saved report. */ }
}
export function clearAnalysisCache() {
  for (const name of ["foodguard_analysis_cache_v1", "foodguard_analysis_cache_v2", ANALYSIS_CACHE_KEY]) localStorage.removeItem(name)
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")
}

export async function fileToBase64(file: File): Promise<string> {
  const en = readPreferences().language === "en"
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(en ? "Images must be 20 MB or less." : "图片不能超过 20MB。")
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(en ? "Use a JPG, PNG or WebP image." : "请上传 JPG、PNG 或 WebP 图片。")
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error(en ? "Unable to read the image." : "无法读取图片。")
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.88)
  } finally { URL.revokeObjectURL(objectUrl) }
}

export async function chatWithAssistant(message: string, messages: AssistantMessage[], currentResult?: AnalysisResult | null): Promise<{ reply: string; history: AssistantHistoryLink[] }> {
  const provider = await requireProvider()
  const prefs = readPreferences()
  const history = await getScanHistory()
  const summary = (raw: AnalysisResult, detailed = false) => {
    const result = normalizeAnalysisResult(raw, raw.analysis_region || "cn", raw.analysis_language)
    return {
    region: result.analysis_region, assessment: result.overall_assessment.slice(0, 500),
    language: result.analysis_language, version: result.analysis_version,
    nutrition: result.nutrition,
    nutrition_basis: result.nutrition_basis, ingredients: result.ingredients.map(item => ({ name: item.name, name_en: item.name_en, category: item.category, ...(detailed ? { description: item.description.slice(0, 240), risk_reason: item.risk_reason?.slice(0, 240) } : {}) })),
    alerts: result.risk_alerts.map(item => ({ ...item, description: item.description.slice(0, detailed ? 240 : 80) })),
    references: result.references.filter(ref => ref.kind !== "background").slice(0, detailed ? 8 : 2).map(ref => ({ source: ref.source, kind: ref.kind, url: ref.url, citation: ref.citation.slice(0, 180), related_ingredients: ref.related_ingredients })),
  } }
  const context = boundedAssistantContext({ region: prefs.region,
    current_result: currentResult ? summary(currentResult, true) : null,
    history: history.map(record => ({ id: record.id, created_at: record.created_at, ...summary(record.analysis_result) })),
  })
  const data = await apiRequest<{ reply: string; history_ids?: string[] }>("/api/assistant-chat", { method: "POST", body: JSON.stringify({
    model: credentialState().choices.fast, message, messages: messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 1200) })), language: prefs.language, ...context,
  }) }, provider.key, 40_000, provider.url)
  const allowed = new Set(data.history_ids || [])
  return { reply: data.reply, history: history.filter(record => allowed.has(record.id)).slice(0, 5).map(record => ({
    id: record.id, label: record.analysis_result.ingredients.slice(0, 3).map(item => prefs.language === "en" ? item.name_en || item.name : item.name).join(" · ") + " · " + new Date(record.created_at).toLocaleDateString(prefs.language === "en" ? "en-US" : "zh-CN"),
  })) }
}

function getFallbackDiscoverItems(region: ReturnType<typeof readPreferences>["region"]): DiscoverItem[] {
  const common: DiscoverItem[] = [
    {
      id: "global-who-food-safety",
      title: "WHO 食品安全与营养主题",
      summary: "查看食品安全、营养和公共健康相关的国际参考信息。",
      source: "WHO",
      url: "https://www.who.int/health-topics/food-safety",
      category: "官方来源",
      region: "global",
    },
    {
      id: "global-jecfa-additives",
      title: "JECFA 食品添加剂数据库",
      summary: "查询食品添加剂安全性评价、ADI 等参考资料。",
      source: "FAO/WHO JECFA",
      url: "https://apps.who.int/food-additives-contaminants-jecfa-database/",
      category: "官方来源",
      region: "global",
    },
  ]

  const byRegion: Record<ReturnType<typeof readPreferences>["region"], DiscoverItem[]> = {
    cn: [
      {
        id: "cn-samr-food",
        title: "市场监管总局食品安全信息",
        summary: "查看食品抽检、监管通告、食品安全消费提示等信息。",
        source: "国家市场监督管理总局",
        url: "https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/spcjs/",
        category: "食品安全",
        region: "cn",
      },
      {
        id: "cn-nhc-food-standards",
        title: "食品安全国家标准",
        summary: "查看食品安全标准、预包装食品标签、添加剂和污染物相关标准发布信息。",
        source: "国家卫生健康委员会",
        url: "https://sppt.cfsa.net.cn:8086/db",
        category: "包装食品",
        region: "cn",
      },
      {
        id: "cn-nutrition-guidelines",
        title: "中国居民膳食指南与 DRIs",
        summary: "查看中国居民膳食指南、营养素参考摄入量等营养学资料。",
        source: "中国营养学会",
        url: "https://www.cnsoc.org/latesachie/",
        category: "营养学",
        region: "cn",
      },
    ],
    us: [
      {
        id: "us-fda-food",
        title: "FDA Food 信息",
        summary: "查看美国食品安全、食品添加剂、标签和召回信息。",
        source: "FDA",
        url: "https://www.fda.gov/food",
        category: "食品安全",
        region: "us",
      },
      {
        id: "us-dga",
        title: "Dietary Guidelines for Americans",
        summary: "查看美国膳食指南和营养建议。",
        source: "DietaryGuidelines.gov",
        url: "https://www.dietaryguidelines.gov/",
        category: "营养学",
        region: "us",
      },
    ],
    eu: [
      {
        id: "eu-efsa-news",
        title: "EFSA 食品安全资讯",
        summary: "查看欧盟食品安全风险评估、食品添加剂和污染物相关信息。",
        source: "EFSA",
        url: "https://www.efsa.europa.eu/en/news",
        category: "食品安全",
        region: "eu",
      },
      {
        id: "eu-food-labeling",
        title: "EU Food Labelling",
        summary: "查看欧盟食品标签和消费者信息规则。",
        source: "European Commission",
        url: "https://food.ec.europa.eu/safety/labelling-and-nutrition_en",
        category: "包装食品",
        region: "eu",
      },
    ],
    global: common,
  }

  return [...(byRegion[region] ?? byRegion.cn), ...common].filter((item, index, all) =>
    all.findIndex((candidate) => candidate.id === item.id) === index
  )
}
