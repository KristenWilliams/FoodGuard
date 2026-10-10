import { lookup } from "node:dns/promises"
import https from "node:https"
import { isIP } from "node:net"
import ipaddr from "ipaddr.js"
import { normalizeProviderUrl } from "../shared/provider.mjs"

export class ProviderAddressError extends Error {}
export function isPublicAddress(address) {
  try { return ipaddr.process(address).range() === "unicast" } catch { return false }
}

export async function resolvePublicProvider(base, { resolve = lookup, blockedHosts = [], signal } = {}) {
  const normalized = normalizeProviderUrl(base)
  const host = new URL(normalized).hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase()
  if (!host.includes(".") && !isIP(host) || /(?:^|\.)(?:localhost|local|internal|invalid|test)$/.test(host) || blockedHosts.includes(host)) throw new ProviderAddressError("PROVIDER_BLOCKED")
  const records = isIP(host) ? [{ address: host, family: isIP(host) }] : await abortable(resolve(host, { all: true, verbatim: true }), signal)
  if (!records.length || records.some(record => !isPublicAddress(record.address))) throw new ProviderAddressError("PROVIDER_BLOCKED")
  return { base: normalized, host, address: records.find(record => record.family === 4) || records[0] }
}

function abortable(promise, signal) {
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new Error("Aborted"))
    if (signal.aborted) { cancel(); return }
    signal.addEventListener("abort", cancel, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel))
  })
}

// Pin the checked DNS address to the TLS connection; never follow redirects with a Key.
export async function providerRequest(url, options, settings = {}) {
  const target = await resolvePublicProvider(settings.base, { ...settings, signal: options.signal })
  return new Promise((resolve, reject) => {
    const request = (settings.request || https.request)(url, {
      method: options.method, headers: { ...options.headers, "Accept-Encoding": "identity" }, signal: options.signal, agent: false,
      lookup: (_host, opts, callback) => opts.all ? callback(null, [target.address]) : callback(null, target.address.address, target.address.family),
    }, async response => {
      try {
        const parts = []; let size = 0
        for await (const chunk of response) {
          size += chunk.length
          if (size > 4 * 1024 * 1024) { response.destroy(); throw new Error("Response too large") }
          parts.push(chunk)
        }
        resolve(new Response([204, 205, 304].includes(response.statusCode) ? null : Buffer.concat(parts), { status: response.statusCode, headers: { "Content-Type": "application/json" } }))
      } catch (error) { reject(error) }
    })
    request.once("error", reject)
    request.end(options.body)
  })
}
