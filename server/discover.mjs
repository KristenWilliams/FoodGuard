import { DOMParser } from "linkedom"
import { createHash } from "node:crypto"

const DAY = 86_400_000
const MAX_AGE = 30 * DAY
const CACHE_TTL = 10 * 60_000
const MAX_SOURCE_BYTES = 1024 * 1024
const parser = new DOMParser()

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

export function articleUrl(value, base) {
  try {
    const url = new URL(value, base)
    if (url.hostname === "www.bing.com" && url.pathname.includes("apiclick")) {
      return articleUrl(url.searchParams.get("url"))
    }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null
    url.hash = ""
    return url.href
  } catch { return null }
}

export function recentItems(items, now = Date.now()) {
  const seen = new Set()
  return items.filter((item) => {
    const timestamp = Date.parse(item.published_at)
    if (!Number.isFinite(timestamp) || timestamp < now - MAX_AGE || timestamp > now) return false
    if (!item.title || !articleUrl(item.url) || seen.has(item.url)) return false
    if (/会议通知|学术年会|培训班|征文|招聘|投稿|招标|党建|党支部|领衔|斩获|品牌奖|特邀专访|携手.*发布/.test(item.title)) return false
    seen.add(item.url)
    return true
  }).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 18)
}

function makeItem(title, url, date, source, summary = "") {
  const category = /包装|标签|标识|packag|labell?ing/i.test(title) ? "包装食品"
    : /营养|膳食|摄入|diet|nutrition/i.test(title) ? "营养学" : source.category
  return {
    id: createHash("sha256").update(url).digest("hex").slice(0, 16),
    title: clean(title), summary: clean(summary).slice(0, 240), url,
    source: source.name, category, region: source.region,
    published_at: date,
  }
}

export function parseRss(xml, source) {
  const doc = parser.parseFromString(xml, "text/xml")
  if (!doc.getElementsByTagName("rss").length) throw new Error("Not an RSS document")
  const text = (node, tag) => clean(node.getElementsByTagName(tag)[0]?.textContent)
  return [...doc.getElementsByTagName("item")].flatMap((node) => {
    const url = articleUrl(text(node, "link"))
    const timestamp = Date.parse(text(node, "pubDate"))
    if (!url || !Number.isFinite(timestamp)) return []
    const description = parser.parseFromString(`<div>${text(node, "description")}</div>`, "text/html").querySelector("div")?.textContent
    const publisher = text(node, "source") || text(node, "News:Source")
    return [makeItem(text(node, "title"), url, new Date(timestamp).toISOString(), { ...source, name: publisher || new URL(url).hostname }, description)]
  })
}

export function parseOfficialList(html, source) {
  const doc = parser.parseFromString(html, "text/html")
  return [...doc.querySelectorAll(source.selector)].flatMap((row) => {
    const link = row.querySelector("a[href]")
    const url = articleUrl(link?.getAttribute("href"), source.url)
    if (!url) return []
    const text = clean(row.textContent)
    const full = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
    const short = text.match(/\b(\d{2})-(\d{2})\b/)
    const explicitYear = new URL(url).pathname.match(/\/art\/(20\d{2})\//)?.[1]
    const date = full ? `${full[1]}-${full[2]}-${full[3]}` : short && explicitYear ? `${explicitYear}-${short[1]}-${short[2]}` : null
    if (!date || !Number.isFinite(Date.parse(date))) return []
    return [makeItem(link.getAttribute("title") || link.textContent, url, `${date}T00:00:00+08:00`, source)]
  })
}

export function sourcesForRegion(region) {
  const queries = {
    cn: ["食品安全 抽检 消费提示", "营养 膳食 中国", "预包装食品 营养 标签"],
    us: ["FDA food safety recalls", "nutrition dietary guidelines", "packaged food labels"],
    eu: ["EFSA food safety", "Europe nutrition", "EU food packaging labels"],
    global: ["WHO food safety", "nutrition dietary guidance", "food packaging labels"],
  }
  const categories = ["食品安全", "营养学", "包装食品"]
  const sources = (queries[region] || queries.cn).map((query, i) => ({
    url: `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,
    name: "News", category: categories[i], type: "rss", region,
  }))
  if (region === "cn") sources.unshift(
    { url: "https://www.samr.gov.cn/spcjs/", selector: ".contentLeft0102box", name: "国家市场监督管理总局", category: "食品安全", type: "html", region },
    { url: "https://www.cnsoc.org/scienpopulg/", selector: ".notice_li", name: "中国营养学会", category: "营养学", type: "html", region },
  )
  return sources
}

async function sourceText(response) {
  if (!response.ok) throw new Error(`Source status ${response.status}`)
  if (!response.body?.getReader) return response.text()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_SOURCE_BYTES) throw new Error("Source too large")
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally { await reader.cancel().catch(() => {}) }
}

export function createDiscoverService({ fetcher = fetch, clock = Date.now, sources = sourcesForRegion } = {}) {
  const cache = new Map()
  const pending = new Map()
  return async function discover(region = "cn") {
    if (!["cn", "us", "eu", "global"].includes(region)) region = "cn"
    const previous = cache.get(region)
    if (previous && clock() - previous.saved < previous.ttl) return previous.feed
    if (pending.has(region)) return pending.get(region)
    const request = (async () => {
      const fetched = await Promise.allSettled(sources(region).map(async (source) => {
        const response = await fetcher(source.url, {
          signal: AbortSignal.timeout(8_000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FoodGuard/1.0)", "Accept": "application/rss+xml, text/html, application/xml" },
        })
        const body = await sourceText(response)
        return source.type === "rss" ? parseRss(body, source) : parseOfficialList(body, source)
      }))
      const successes = fetched.filter((entry) => entry.status === "fulfilled")
      const items = recentItems(successes.flatMap((entry) => entry.value), clock())
      const stale = successes.length === 0 ? recentItems(previous?.feed.items || [], clock()) : []
      const feed = {
        items: items.length ? items : stale,
        status: successes.length === 0 ? (stale.length ? "cached" : "offline") : "live",
        partial: successes.length !== fetched.length,
        fetched_at: successes.length ? new Date(clock()).toISOString() : previous?.feed.fetched_at || null,
        max_age_days: 30,
      }
      cache.set(region, { feed, saved: clock(), ttl: successes.length ? CACHE_TTL : 30_000 })
      return feed
    })().finally(() => pending.delete(region))
    pending.set(region, request)
    return request
  }
}

export const fetchDiscoverFeed = createDiscoverService()
