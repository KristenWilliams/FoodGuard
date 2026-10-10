import { useSyncExternalStore } from "react"
import { ApiRequestError, apiRequest, credentialFingerprint, isNativeAndroid, nativeLocal } from "@/lib/native"
import { DEFAULT_PROVIDER_URL, normalizeProviderUrl } from "../../shared/provider.mjs"
import { readPreferences } from "@/lib/preferences"

export type ModelChoices = { fast: string; deep: string }
export type ProviderConfig = { key: string; url: string }
type AuthState = { ready: boolean; loggedIn: boolean; error: boolean; url: string; connection: "unconfigured" | "unchecked" | "available" | "offline" | "error"; testedModels: string[]; models: string[]; choices: ModelChoices }
const MODEL_KEY = "foodguard_models_v1"
const SESSION_KEY = "foodguard_session_credential"
let key = ""
let identity = ""
let initialized: Promise<void> | undefined
const listeners = new Set<() => void>()
let state: AuthState = { ready: false, loggedIn: false, error: false, url: DEFAULT_PROVIDER_URL, connection: "unconfigured", testedModels: [], models: [], choices: readModels() }
const message = (zh: string, en: string) => readPreferences().language === "en" ? en : zh

function readModels(): ModelChoices {
  try {
    const data = JSON.parse(localStorage.getItem(MODEL_KEY) || "{}")
    return { fast: typeof data.fast === "string" ? data.fast : "gpt-6-luna", deep: typeof data.deep === "string" ? data.deep : "gpt-6.1-sol" }
  } catch { return { fast: "gpt-6-luna", deep: "gpt-6.1-sol" } }
}
function emit(next: Partial<AuthState>) { state = { ...state, ...next }; listeners.forEach(listener => listener()) }
export function useCredentials() { return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener) }, () => state) }
export function credentialState() { return state }
export function initializeCredentials(): Promise<void> {
  if (!initialized) initialized = (async () => {
    let url = DEFAULT_PROVIDER_URL
    try {
      const saved = isNativeAndroid() ? await nativeLocal.loadCredential() : readSession()
      key = saved.key; url = normalizeProviderUrl(saved.url || DEFAULT_PROVIDER_URL)
      identity = key ? await credentialFingerprint(url, key) : ""
    }
    catch { key = "" }
    emit({ ready: true, loggedIn: Boolean(key), url, connection: key ? "unchecked" : "unconfigured" })
  })()
  return initialized
}
export async function requireKey(): Promise<string> {
  await initializeCredentials()
  if (!key || state.error) throw new Error(message("请先在设置中使用 API Key 登录。", "Log in with your API Key in Settings first."))
  return key
}
function readSession(): { key: string; url?: string } {
  const raw = sessionStorage.getItem(SESSION_KEY) || ""
  if (!raw.startsWith("{")) return { key: raw }
  return JSON.parse(raw)
}
export async function requireProvider(): Promise<ProviderConfig> {
  await initializeCredentials()
  if (!key || state.error) throw new Error(message("请先在设置中使用 API Key 登录。", "Log in with your API Key in Settings first."))
  return { key, url: state.url }
}
export function validateProviderConfig(candidate: ProviderConfig): ProviderConfig {
  const trimmed = candidate.key.trim()
  if (!/^[^\s]{8,512}$/.test(trimmed)) throw new Error(message("请输入有效的 API Key。", "Enter a valid API Key."))
  let url
  try { url = normalizeProviderUrl(candidate.url) }
  catch { throw new Error(message("请输入有效的 HTTPS 接口地址，不要包含 Key 或查询参数。", "Enter a valid HTTPS API address without credentials or query parameters.")) }
  return { key: trimmed, url }
}
function connectionError(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 401) emit({ error: true, connection: "error" })
  else emit({ connection: error instanceof ApiRequestError ? "error" : "offline" })
}
export async function loadProviderModels(candidate: ProviderConfig, refresh = false) {
  const config = validateProviderConfig(candidate)
  const data = await apiRequest<{ models: string[]; defaults: ModelChoices }>("/api/models" + (refresh ? "?refresh=1" : ""), {}, config.key, 18_000, config.url)
  if (!Array.isArray(data.models) || !data.models.length) throw new Error(message("没有可用的模型。", "No available models."))
  const choices = { ...state.choices }
  for (const mode of ["fast", "deep"] as const) {
    if (!data.models.includes(choices[mode])) choices[mode] = data.models.includes(data.defaults[mode]) ? data.defaults[mode] : data.models[0]
  }
  return { models: data.models, choices }
}
export async function fetchModels() {
  const config = await requireProvider()
  try {
    const result = await loadProviderModels(config, true)
    if (state.url === config.url && key === config.key) {
      const changed = result.choices.fast !== state.choices.fast || result.choices.deep !== state.choices.deep
      localStorage.setItem(MODEL_KEY, JSON.stringify(result.choices))
      emit({ ...result, ...(changed ? { connection: "unchecked", testedModels: [] } : {}) })
    }
    return result
  } catch (error) { if (state.url === config.url && key === config.key) connectionError(error); throw error }
}
export async function testModel(model: string, candidate?: ProviderConfig) {
  const config = candidate ? validateProviderConfig(candidate) : await requireProvider()
  try {
    const result = await apiRequest<{ ok: boolean; elapsed_ms: number; vision_tested: boolean }>("/api/test-connection", {
    method: "POST", body: JSON.stringify({ model }),
    }, config.key, 30_000, config.url)
    if (!candidate && state.url === config.url && key === config.key) emit({ connection: "available", testedModels: [...new Set([...state.testedModels, model])] })
    return result
  } catch (error) { if (!candidate && state.url === config.url && key === config.key) connectionError(error); throw error }
}
export async function loginApiKey(candidate: ProviderConfig, selected?: ModelChoices) {
  await initializeCredentials()
  const config = validateProviderConfig(candidate)
  const listed = await loadProviderModels(config)
  const choices = selected || listed.choices
  if (!listed.models.includes(choices.fast) || !listed.models.includes(choices.deep)) throw new Error(message("请从当前接口的模型列表中选择。", "Select models from this provider's list."))
  const result = await testModel(choices.fast, config)
  if (isNativeAndroid()) await nativeLocal.saveCredential(config)
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(config))
  key = config.key
  identity = await credentialFingerprint(config.url, key)
  localStorage.setItem(MODEL_KEY, JSON.stringify(choices))
  emit({ loggedIn: true, error: false, url: config.url, choices, models: listed.models, connection: "available", testedModels: [choices.fast] })
  window.dispatchEvent(new Event("foodguard:provider-changed"))
  return result
}
export function selectModels(choices: ModelChoices) {
  if (!state.models.includes(choices.fast) || !state.models.includes(choices.deep)) return
  if (choices.fast === state.choices.fast && choices.deep === state.choices.deep) return
  localStorage.setItem(MODEL_KEY, JSON.stringify(choices))
  emit({ choices, connection: "unchecked", testedModels: [] })
}
export async function logoutApiKey() {
  if (isNativeAndroid()) await nativeLocal.clearCredential()
  sessionStorage.removeItem(SESSION_KEY)
  key = ""
  identity = ""
  emit({ loggedIn: false, error: false, models: [], connection: "unconfigured", testedModels: [] })
  window.dispatchEvent(new Event("foodguard:logout"))
}
window.addEventListener("foodguard:credential-error", event => {
  const id = (event as CustomEvent<{ credential_id?: string }>).detail?.credential_id
  if (key && id === identity) emit({ error: true, connection: "error" })
})
window.addEventListener("offline", () => { if (key) emit({ connection: "offline" }) })
window.addEventListener("foodguard:analysis-job", event => {
  const job = (event as CustomEvent<{ credential_id?: string; status: string; model?: string; cached?: boolean }>).detail
  if (key && job?.credential_id === identity && job.status === "completed" && !job.cached) emit({ connection: "available", testedModels: [...new Set([...state.testedModels, job.model || state.choices.fast])] })
})
