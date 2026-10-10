import { Capacitor, registerPlugin } from "@capacitor/core"
import type { AnalysisJob } from "@/lib/api"
import { readPreferences } from "@/lib/preferences"

export class ApiRequestError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

interface LocalPlugin {
  saveCredential(options: { key: string; url: string }): Promise<void>
  loadCredential(): Promise<{ key: string; url?: string }>
  clearCredential(): Promise<void>
  startAnalysis(options: { id: string; base: string; payload: Record<string, unknown> }): Promise<void>
  listJobs(): Promise<{ jobs: AnalysisJob[] }>
  acknowledgeJob(options: { id: string }): Promise<void>
}

export const nativeLocal = registerPlugin<LocalPlugin>("FoodGuardLocal")
export const isNativeAndroid = () => Capacitor.getPlatform() === "android"
const configured = (import.meta.env.VITE_FOODGUARD_API_URL || "https://foodguard.littlemelon.top").replace(/\/+$/, "")
export const apiBase = () => isNativeAndroid()
  ? configured.replace(/^http:\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, "http://10.0.2.2") : configured

export async function credentialFingerprint(url: string, key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url + "\n" + key))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")
}

export async function apiRequest<T>(route: string, options: RequestInit = {}, key?: string, timeout = 15_000, provider?: string): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${apiBase()}${route}`, {
      ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(provider ? { "X-FoodGuard-Upstream": provider } : {}), ...options.headers }, signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.error) {
      const status = data?.code === "KEY_INVALID" ? 401 : data?.code === "MODEL_PERMISSION" ? 403 : response.ok ? 502 : response.status
      if (status === 401 && key && provider && /analyze-ingredients|assistant-chat/.test(route)) window.dispatchEvent(new CustomEvent("foodguard:credential-error", { detail: { credential_id: await credentialFingerprint(provider, key) } }))
      const english: Record<string, string> = { LOGIN_REQUIRED: "Log in with your API Key first.", KEY_INVALID: "Invalid API Key. Please log in again.", MODEL_UNAVAILABLE: "Refresh the available model list.", UPSTREAM_QUOTA: "Upstream quota exhausted or rate limited.", UNRELIABLE_LABEL: "No reliably readable food label was found.", TIMEOUT: "Timed out. Try a clearer, cropped label.", BUSY: "Service busy. Try again later.", IMAGE: "Use JPG, PNG or WebP, up to 20 MB.", INCOMPLETE_RESULT: "The model returned an incomplete report.", RATE_LIMIT: "Too many requests. Try again later." }
      if (data?.code === "MODEL_PERMISSION") english.MODEL_PERMISSION = "This model is not permitted. Select another model."
      Object.assign(english, { PROVIDER_URL: "Enter a valid HTTPS API address without credentials or query parameters.", PROVIDER_BLOCKED: "Use a public HTTPS API address, not a private or FoodGuard address.", PROVIDER_REDIRECT: "Enter the final HTTPS API address; redirects are not followed.", NO_MODELS: "No available chat models were found.", UPSTREAM_NETWORK: "Cannot reach this API provider.", INVALID_RESULT: "The model returned an invalid response. Try another model." })
      throw new ApiRequestError(status, readPreferences().language === "en" ? english[data?.code] || "The service could not complete this request." : data?.error || "服务暂时不可用，请稍后重试。")
    }
    if (!data) throw new Error(readPreferences().language === "en" ? "The service returned an invalid response." : "服务返回了无效内容。")
    return data as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error(readPreferences().language === "en" ? "Timed out. Check the network or try again later." : "等待超时，请检查网络或稍后重试。")
    if (error instanceof TypeError) throw new Error(readPreferences().language === "en" ? "Cannot connect. Check your network and try again." : "无法连接服务，请检查网络后重试。")
    throw error
  } finally { window.clearTimeout(timer) }
}
