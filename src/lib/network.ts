import { apiBase } from "@/lib/native"

export type ReachabilityStatus = "checking" | "online" | "offline"

export async function probeNetworkReachability(timeoutMs = 3500): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${apiBase()}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
    const data = await response.json()
    return response.ok && data.ok === true
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}
