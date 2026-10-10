import { test } from "node:test"
import assert from "node:assert/strict"
import { articleUrl, createDiscoverService, parseOfficialList, parseRss, recentItems } from "./discover.mjs"

const now = Date.parse("2026-10-08T04:00:00Z")
const source = { name: "Official", category: "食品安全", region: "cn", url: "https://www.samr.gov.cn/spcjs/", selector: ".row", type: "html" }
const html = '<ul class="row"><li><a href="/art/2026/news.html" title="食品标签新消息">新闻</a></li><li>09-28</li></ul>'

test("official list uses explicit article year, never a guessed current date", () => {
  const items = parseOfficialList(html, source)
  assert.equal(items[0].title, "食品标签新消息")
  assert.equal(items[0].published_at, "2026-09-28T00:00:00+08:00")
  assert.equal(items[0].category, "包装食品")
  assert.deepEqual(parseOfficialList(html.replace("/art/2026/", "/article/"), source), [])
})

test("RSS XML, CDATA and canonical publisher URLs", () => {
  const xml = '<rss><channel><item><title><![CDATA[糖 & 营养]]></title><link>https://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fexample.com%2Fnews</link><description><![CDATA[<b>Readable summary</b>]]></description><pubDate>Mon, 28 Sep 2026 08:00:00 GMT</pubDate><source>Publisher</source></item></channel></rss>'
  const items = parseRss(xml, source)
  assert.equal(items[0].url, "https://example.com/news")
  assert.equal(items[0].source, "Publisher")
  assert.equal(items[0].summary, "Readable summary")
  assert.equal(items[0].category, "营养学")
  assert.throws(() => parseRss("<html>blocked</html>", source))
})

test("reject old, future, missing-date, duplicate and irrelevant notices", () => {
  const item = { title: "食品标签新闻", url: "https://example.com/news", published_at: "2026-09-28T00:00:00Z" }
  assert.equal(recentItems([item, item, { ...item, url: "https://x.com/old", published_at: "2025-01-01" }, { ...item, url: "https://x.com/future", published_at: "2026-10-09" }, { ...item, published_at: null }, { ...item, title: "学术年会通知", url: "https://x.com/meeting" }, { ...item, title: "品牌斩获营养新品大奖", url: "https://x.com/ad" }], now).length, 1)
  assert.equal(articleUrl("javascript:alert(1)"), null)
  assert.equal(articleUrl("https://user:password@example.com"), null)
})

test("coalesce concurrent fetches, cache and preserve freshness on outages", async () => {
  let calls = 0
  let time = now
  let offline = false
  const fetcher = async () => { calls++; if (offline) throw new Error("offline"); return new Response(html) }
  const discover = createDiscoverService({ fetcher, clock: () => time, sources: () => [source] })
  const [a, b] = await Promise.all([discover("cn"), discover("cn")])
  assert.equal(calls, 1)
  assert.equal(a, b)
  assert.equal(a.status, "live")
  assert.equal(a.items.length, 1)
  await discover("cn")
  assert.equal(calls, 1)
  offline = true
  time += 11 * 60_000
  assert.equal((await discover("cn")).status, "cached")
  time += 31 * 86_400_000
  const expired = await discover("cn")
  assert.equal(expired.status, "offline")
  assert.deepEqual(expired.items, [])
})

test("offline response never presents reference pages as news", async () => {
  const discover = createDiscoverService({ fetcher: async () => { throw new Error("offline") }, clock: () => now, sources: () => [source] })
  const feed = await discover("cn")
  assert.equal(feed.status, "offline")
  assert.equal(feed.fetched_at, null)
  assert.deepEqual(feed.items, [])
})
