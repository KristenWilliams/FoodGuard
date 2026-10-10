import test from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { normalizeProviderUrl } from "../shared/provider.mjs"
import { isPublicAddress, resolvePublicProvider, providerRequest } from "./provider-request.mjs"
import { validCache, CACHE_TTL } from "../shared/local-cache.mjs"
import { boundedAssistantContext } from "../shared/assistant-context.mjs"

test("provider paths normalize without leaking URL credentials", () => {
  assert.equal(normalizeProviderUrl("https://api.example.com/"), "https://api.example.com/v1")
  assert.equal(normalizeProviderUrl("https://api.example.com/openai/v1/"), "https://api.example.com/openai/v1")
  for (const url of ["http://api.example.com/v1", "https://user:password@api.example.com", "https://api.example.com?key=secret", "https://api.example.com#token", "file:///etc/passwd", "https://api.example.com\\@localhost"]) assert.throws(() => normalizeProviderUrl(url))
})
test("private, special and mapped addresses are blocked", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "2001:db8::1"]) assert.equal(isPublicAddress(address), false, address)
  assert.equal(isPublicAddress("1.1.1.1"), true)
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true)
})
test("unsafe DNS, mixed records, self-address and integer localhost never connect", async () => {
  const resolve = async () => [{ address: "1.1.1.1", family: 4 }, { address: "127.0.0.1", family: 4 }]
  await assert.rejects(resolvePublicProvider("https://api.example.com/v1", { resolve }), /PROVIDER_BLOCKED/)
  for (const url of ["https://2130706433/v1", "https://localhost/v1", "https://[::ffff:127.0.0.1]/v1", "https://foodguard.littlemelon.top/v1"]) await assert.rejects(resolvePublicProvider(url, { resolve, blockedHosts: ["foodguard.littlemelon.top"] }), /PROVIDER_BLOCKED/)
})
test("HTTPS lookup is pinned, TLS verification remains enabled and redirects are not followed", async () => {
  let lookups = 0, calls = 0
  const response = await providerRequest("https://api.example.com/v1/models", { method: "GET", headers: { Authorization: "Bearer fictional-test-key" } }, {
    base: "https://api.example.com/v1", resolve: async () => { lookups++; return [{ address: "1.1.1.1", family: 4 }] },
    request: (url, options, callback) => {
      calls++; assert.equal(url, "https://api.example.com/v1/models")
      assert.equal(options.agent, false); assert.notEqual(options.rejectUnauthorized, false)
      options.lookup("api.example.com", { all: true }, (error, records) => { assert.equal(error, null); assert.deepEqual(records, [{ address: "1.1.1.1", family: 4 }]) })
      const request = new EventEmitter()
      request.end = () => { const body = Readable.from([Buffer.from("redirect")]); body.statusCode = 302; callback(body) }
      return request
    },
  })
  assert.equal(lookups, 1); assert.equal(calls, 1); assert.equal(response.status, 302)
})
test("DNS resolution shares the request's absolute deadline", async () => {
  const controller = new AbortController()
  const promise = resolvePublicProvider("https://api.example.com/v1", { signal: controller.signal, resolve: () => new Promise(() => {}) })
  controller.abort(); await assert.rejects(promise, /Aborted/)
})
test("cache rules expire old and future entries, reject malformed data and cap at 20", () => {
  const now = Date.now(), entry = (version, created_at) => ({ result: { analysis_version: version }, created_at })
  const key = "a".repeat(64)
  for (const raw of [[], null, { [key]: null }, { [key]: entry("old", now) }, { [key]: entry("current", now - CACHE_TTL) }, { [key]: entry("current", now + 1) }]) assert.deepEqual(validCache(raw, "current", now), {})
  const raw = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i.toString(16).padStart(64, "0"), entry("current", now - i)]))
  assert.equal(Object.keys(validCache(raw, "current", now)).length, 20)
  assert.equal(Object.keys(validCache(raw, "current", now))[0], "0".repeat(64))
})

test("large assistant histories remain valid JSON inside the same 100KB budget", () => {
  const history = Array.from({ length: 20 }, (_, i) => ({ id: `own-${i}`, region: "cn", nutrition: { sodium: { value: 800, unit: "mg" } }, ingredients: [{ name: "糖", description: "长配料说明".repeat(4000) }] }))
  const context = boundedAssistantContext({ region: "cn", current_result: { nutrition: { sodium: { value: 1000, unit: "mg" } } }, history })
  assert.ok(Buffer.byteLength(JSON.stringify(context)) <= 100000)
  assert.equal(context.history.length, 20)
  assert.equal(context.current_result.nutrition.sodium.value, 1000)
  assert.ok(context.history.some(item => item.details_omitted))
  assert.deepEqual(JSON.parse(JSON.stringify(context)).history.map(item => item.id), history.map(item => item.id))
})
