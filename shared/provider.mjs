export const DEFAULT_PROVIDER_URL = "https://api.littlemelon.top/v1"

export function normalizeProviderUrl(value) {
  if (typeof value !== "string" || value.length > 1024 || /[\s\\]/.test(value.trim())) throw new Error("PROVIDER_URL")
  let url
  try { url = new URL(value.trim()) } catch { throw new Error("PROVIDER_URL") }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash) throw new Error("PROVIDER_URL")
  const path = url.pathname.replace(/\/+$/, "")
  url.pathname = path || "/v1"
  return url.toString().replace(/\/+$/, "")
}
