export const CACHE_TTL = 7 * 86400000
export function validCache(raw, version, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([key, value]) => /^[a-f0-9]{64}$/.test(key)
    && value?.result?.analysis_version === version && Number.isFinite(value.created_at)
    && value.created_at <= now && now - value.created_at < CACHE_TTL)
    .sort((a, b) => b[1].created_at - a[1].created_at).slice(0, 20))
}
