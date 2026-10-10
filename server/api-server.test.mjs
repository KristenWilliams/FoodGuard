import test from "node:test"
import assert from "node:assert/strict"
import { createApiServer } from "./api-server.mjs"
import { foodLabel } from "./analysis-fixture.mjs"

const KEY = "qa-only-not-a-real-key"
async function fixture(fn, implementation, settings = {}) {
  const calls = []
  const server = createApiServer({ ...settings, upstream: "https://unit.invalid/v1", fetch: async (url, options) => {
    calls.push({ url, options })
    if (implementation) return implementation(url, options, calls)
    if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }, { id: "gpt-6.1-sol" }, { id: "text-embedding-3" }] })
    const body = JSON.parse(options.body)
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: body.response_format ? JSON.stringify(foodLabel()) : "OK" } }] })
  } })
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (route, body, key = KEY, provider) => fetch(base + route, { method: body ? "POST" : "GET", headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(provider ? { "X-FoodGuard-Upstream": provider } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) })
  try { await fn(request, calls) } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}
const payload = { image_base64: "data:image/png;base64,iVBORw0KGgo=", analysis_mode: "fast", model: "gpt-6-luna", region: "cn", language: "zh" }

test("server key is never an anonymous fallback and no history API exists", () => fixture(async request => {
  assert.equal((await request("/api/models", null, "")).status, 401)
  assert.equal((await request("/api/analyze-ingredients", payload, "")).status, 401)
  assert.equal((await request("/api/history")).status, 404)
  const health = await (await request("/health")).json()
  assert.equal(health.history_storage, "device-only")
  assert.equal(health.api_key_login, true)
}))
test("fetch models, test selected model and forward only the user's key", () => fixture(async (request, calls) => {
  const data = await (await request("/api/models")).json()
  assert.deepEqual(data.models, ["gpt-6-luna", "gpt-6.1-sol"])
  const tested = await (await request("/api/test-connection", { model: "gpt-6.1-sol" })).json()
  assert.equal(tested.ok, true); assert.equal(tested.vision_tested, false)
  assert.equal(JSON.parse(calls[1].options.body).model, "gpt-6.1-sol")
  assert.ok(calls.every(call => call.options.headers.Authorization === `Bearer ${KEY}`))
  assert.equal((await request("/api/test-connection", { model: "invented" })).status, 400)
}))
test("both modes validate food in one completion, with language and selected model", () => fixture(async (request, calls) => {
  const response = await request("/api/analyze-ingredients", { ...payload, analysis_mode: "deep", model: "gpt-6.1-sol", language: "en" })
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.result.analysis_language, "en")
  const completions = calls.filter(call => call.url.endsWith("/chat/completions"))
  assert.equal(completions.length, 1)
  assert.equal(JSON.parse(completions[0].options.body).reasoning_effort, "low")
}))
test("provider errors are sanitized, never echo credentials", () => fixture(async request => {
  const response = await request("/api/models")
  assert.equal(response.status, 401)
  assert.ok(!(await response.text()).includes(KEY))
}, async () => Response.json({ error: `invalid ${KEY}` }, { status: 401 })))
test("model permission failure is not misreported as a bad login key", () => fixture(async request => {
  const response = await request("/api/models")
  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, "MODEL_PERMISSION")
}, async () => Response.json({}, { status: 403 })))
test("partial output and nonfood are rejected without a fabricated report", async () => {
  for (const variant of ["truncated", "nonfood", "missinggate", "invalidjson"]) await fixture(async request => {
    const response = await request("/api/analyze-ingredients", payload)
    assert.equal(response.status, 422); assert.equal((await response.json()).result, undefined)
  }, async url => {
    if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
    const raw = foodLabel(); if (variant === "nonfood") raw.is_valid_food_label = false
    if (variant === "missinggate") delete raw.is_valid_food_label
    return Response.json({ choices: [{ finish_reason: variant === "truncated" ? "length" : "stop", message: { content: variant === "invalidjson" ? "oops" : JSON.stringify(raw) } }] })
  })
})
test("identical in-flight requests share a completion but finished results are not retained", () => fixture(async (request, calls) => {
  await request("/api/models")
  const responses = await Promise.all([request("/api/analyze-ingredients", payload), request("/api/analyze-ingredients", payload)])
  assert.ok(responses.every(response => response.status === 200))
  assert.equal(calls.filter(call => call.url.endsWith("/chat/completions")).length, 1)
  await request("/api/analyze-ingredients", payload)
  assert.equal(calls.filter(call => call.url.endsWith("/chat/completions")).length, 2)
}, async url => {
  if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
  await new Promise(resolve => setTimeout(resolve, 60))
  return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(foodLabel()) } }] })
}))

test("slow analysis emits JSON whitespace without breaking the final report", () => fixture(async request => {
  const response = await request("/api/analyze-ingredients", payload)
  assert.equal(response.headers.get("x-accel-buffering"), "no")
  assert.ok(response.headers.get("cache-control").includes("no-transform"))
  const text = await response.text()
  assert.ok(text.startsWith("\n"))
  assert.equal(JSON.parse(text).result.analysis_region, "cn")
}, async url => {
  if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
  await new Promise(resolve => setTimeout(resolve, 40))
  return Response.json({ choices: [{ message: { content: JSON.stringify(foodLabel()) } }] })
}, { heartbeatMs: 5 }))

test("a late rejection remains an explicit error after keepalive headers", () => fixture(async request => {
  const response = await request("/api/analyze-ingredients", payload)
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.code, "UNRELIABLE_LABEL")
  assert.equal(data.result, undefined)
}, async url => {
  if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
  await new Promise(resolve => setTimeout(resolve, 40))
  return Response.json({ choices: [{ message: { content: '{"is_valid_food_label":false}' } }] })
}, { heartbeatMs: 5 }))

test("the analysis deadline aborts a stalled response body, not only response headers", () => fixture(async request => {
  const data = await (await request("/api/analyze-ingredients", payload)).json()
  assert.equal(data.code, "TIMEOUT")
  assert.equal(data.result, undefined)
}, async (url, options) => {
  if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
  return new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"choices":'))
    options.signal.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true })
  } }))
}, { heartbeatMs: 5, analysisTimeouts: { fast: 35, deep: 35 } }))

test("providers have separate model caches and each route uses the requested provider", () => fixture(async (request, calls) => {
  for (const provider of ["https://a.example.com/v1", "https://b.example.com/openai/v1"]) {
    assert.equal((await request("/api/models", null, KEY, provider)).status, 200)
    assert.equal((await request("/api/test-connection", { model: "gpt-6-luna" }, KEY, provider)).status, 200)
    assert.equal((await request("/api/analyze-ingredients", payload, KEY, provider)).status, 200)
  }
  assert.equal(calls.filter(call => call.url.endsWith("/models")).length, 2)
  assert.ok(calls.some(call => call.url === "https://b.example.com/openai/v1/chat/completions"))
  assert.ok(calls.every(call => call.options.headers.Authorization === `Bearer ${KEY}`))
  assert.equal((await request("/api/models?refresh=1", null, KEY, "https://a.example.com/v1")).status, 200)
  assert.equal(calls.filter(call => call.url.endsWith("/models")).length, 3)
}, undefined, { resolveDNS: async () => [{ address: "1.1.1.1", family: 4 }] }))

test("invalid/private providers and redirects never send a second credential-bearing request", () => fixture(async (request, calls) => {
  for (const provider of ["http://api.example.com/v1", "https://api.example.com?key=x", "https://127.0.0.1/v1", "https://foodguard.littlemelon.top/v1"]) assert.equal((await request("/api/models", null, KEY, provider)).status, 400)
  assert.equal(calls.length, 0)
  const response = await request("/api/models", null, KEY, "https://api.example.com/v1")
  assert.equal((await response.json()).code, "PROVIDER_REDIRECT")
  assert.equal(calls.length, 1)
}, async () => new Response(null, { status: 302, headers: { Location: "https://foreign.example.com" } }), { resolveDNS: async () => [{ address: "1.1.1.1", family: 4 }] }))

test("fast and deep retain a long ingredient list; only explanations differ", () => fixture(async (request, calls) => {
  for (const mode of ["fast", "deep"]) {
    const data = await (await request("/api/analyze-ingredients", { ...payload, analysis_mode: mode })).json()
    assert.equal(data.result.ingredients.length, 35)
    assert.equal(data.result.ingredients.at(-1).name, "最后一项配料")
  }
  const bodies = calls.filter(call => call.url.endsWith("/chat/completions")).map(call => JSON.parse(call.options.body))
  assert.match(bodies[0].messages[1].content[0].text, /include all readable ingredients/)
  assert.match(bodies[1].messages[1].content[0].text, /more detail/)
}, async url => {
  if (url.endsWith("/models")) return Response.json({ data: [{ id: "gpt-6-luna" }] })
  const raw = foodLabel(); raw.ingredients = Array.from({ length: 35 }, (_, i) => ({ ...raw.ingredients[0], name: i === 34 ? "最后一项配料" : `配料 ${i + 1}` }))
  return Response.json({ choices: [{ message: { content: JSON.stringify(raw) } }] })
}))

test("assistant sees values, uncertainty and sources, and only links supplied local histories", () => fixture(async (request, calls) => {
  const body = { model: "gpt-6-luna", message: "Find sodium reports", region: "us", language: "en", current_result: { region: "cn", nutrition_basis: { amount: 100, unit: "g" }, nutrition: { sodium: { value: 1600, unit: "mg", daily_pct: 80, status: "recognized", reference_basis: "CN NRV" }, fiber: { value: null, status: "unreadable" } }, references: [{ url: "https://www.nhc.gov.cn/", kind: "basis" }] }, history: [{ id: "own-report", region: "cn", nutrition: { sodium: { value: 1600, unit: "mg" } } }] }
  const data = await (await request("/api/assistant-chat", body)).json()
  assert.deepEqual(data.history_ids, ["own-report"])
  const sent = JSON.parse(calls[1].options.body)
  assert.ok(sent.messages[1].content.includes('"value":1600'))
  assert.ok(sent.messages[1].content.includes('"status":"unreadable"'))
  assert.ok(sent.messages[1].content.includes("https://www.nhc.gov.cn/"))
  assert.match(sent.messages[0].content, /ITS saved region/)
  assert.ok(!sent.messages[0].content.includes("For newly requested China criteria"))
}, async url => url.endsWith("/models") ? Response.json({ data: [{ id: "gpt-6-luna" }] }) : Response.json({ choices: [{ message: { content: JSON.stringify({ reply: "1600mg per 100g.", history_ids: ["own-report", "other-person", "own-report"] }) } }] })))
