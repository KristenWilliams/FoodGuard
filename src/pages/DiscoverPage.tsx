import { Box, Heading, HStack, IconButton, Spinner, Text } from "@chakra-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { LuArrowUpRight, LuChevronRight, LuLeaf, LuPackage, LuRefreshCw, LuShieldCheck, LuCompass } from "react-icons/lu"
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from "@/components/ui/accordion"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { fetchDiscoverItems } from "@/lib/api"
import type { DiscoverFeed } from "@/lib/api"
import { readPreferences } from "@/lib/preferences"
import { useLanguage } from "@/lib/i18n"

const CATEGORIES = ["all", "食品安全", "营养学", "包装食品"] as const

export default function DiscoverPage() {
  const isEn = useLanguage() === "en"
  const [feed, setFeed] = useState<DiscoverFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("all")
  const generation = useRef(0)
  const mounted = useRef(false)
  const locale = isEn ? "en-US" : "zh-CN"

  const load = useCallback(async () => {
    const request = ++generation.current
    setLoading(true)
    const data = await fetchDiscoverItems()
    if (!mounted.current || request !== generation.current) return
    setFeed(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    window.addEventListener("foodguard:preferences", load)
    return () => { mounted.current = false; window.removeEventListener("foodguard:preferences", load) }
  }, [load])

  const items = feed?.items.filter((item) => category === "all" || item.category === category) || []
  const region = readPreferences().region
  const labels = isEn ? ["All", "Safety", "Nutrition", "Labels"] : ["全部", "食品安全", "营养", "包装"]
  const regionLabels = isEn ? { cn: "China", us: "US", eu: "Europe", global: "Global" } : { cn: "中国", us: "美国", eu: "欧盟", global: "全球" }

  return <Box className="page discover-page">
    <div className="page-heading">
      <span className="page-symbol" aria-hidden="true"><LuCompass /></span>
      <div><Heading as="h1">{isEn ? "Discover" : "发现"}</Heading><p className="page-subtitle">{new Date().toLocaleDateString(locale, { month: "long", day: "numeric" })} · {regionLabels[region]}</p></div>
      <IconButton aria-label={isEn ? "Refresh news" : "刷新资讯"} title={isEn ? "Refresh" : "刷新"} variant="ghost" size="sm" onClick={() => void load()} disabled={loading}><LuRefreshCw /></IconButton>
    </div>
    <SegmentedControl value={category} onValueChange={(details) => setCategory(details.value || "all")}
      items={CATEGORIES.map((value, index) => ({ value, label: labels[index] }))} size="sm" w="full" />
    <HStack justify="space-between" mt="7" mb="3">
      <Heading as="h2">{isEn ? "Recent updates" : "近期关注"}</Heading>
      <Text fontSize="xs" color="fg.muted">{isEn ? "Last 30 days" : "近 30 天"}</Text>
    </HStack>
    {loading ? <HStack py="10" justify="center"><Spinner size="sm" color="green.500" /><Text fontSize="sm" color="fg.muted">{isEn ? "Updating…" : "正在更新…"}</Text></HStack> : <>
      {feed?.status !== "live" && <Text role="status" fontSize="xs" color="fg.muted" mb="3">{feed?.status === "cached" ? (isEn ? "Offline · showing saved updates" : "暂时离线，显示已获取的资讯") : (isEn ? "News unavailable. Official references remain below." : "资讯暂时未连接，下方官方资料仍可查看。")}</Text>}
      {items.length ? <div className="news-list">{items.map((item) => {
        const TopicIcon = item.category === "营养学" ? LuLeaf : item.category === "包装食品" ? LuPackage : LuShieldCheck
        return <a key={item.id} className="news-row" data-reveal href={item.url} target="_blank" rel="noopener noreferrer">
          <div className={`news-art ${item.category === "营养学" ? "nutrition" : item.category === "包装食品" ? "packaging" : ""}`}><TopicIcon size={26} strokeWidth={1.5} /></div>
          <div>
            <p className="news-title">{item.title}</p>
            {item.summary && item.summary !== item.title && <Text className="news-summary" lineClamp={2}>{item.summary}</Text>}
            <div className="news-meta"><span>{item.source}</span><span>·</span><time dateTime={item.published_at || undefined}>{new Date(item.published_at!).toLocaleDateString(locale, { month: "short", day: "numeric" })}</time></div>
          </div>
          <LuArrowUpRight color="var(--fg-muted)" size={16} />
        </a>
      })}</div> : <Box py="8" borderTopWidth="1px" borderBottomWidth="1px" borderColor="border"><Text color="fg.muted" fontSize="sm">{isEn ? "No verified recent updates in this category." : "此分类暂无可核实的近期资讯"}</Text></Box>}
      {feed?.fetched_at && <Text fontSize="xs" color="fg.muted" mt="3">{isEn ? "Updated" : "获取于"} {new Date(feed.fetched_at).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}{feed.partial ? (isEn ? " · some sources unavailable" : " · 部分来源暂不可用") : ""}</Text>}
    </>}
    <Heading as="h2" mt="8" mb="2">{isEn ? "Understand the label" : "看懂标签"}</Heading>
    <a className="topic-link" href={region === "cn" ? "https://www.cnsoc.org/latesachie/" : "https://www.dietaryguidelines.gov/"} target="_blank" rel="noopener noreferrer">
      <img src="/demo/gummy-label-demo.png" alt="" /><span>{isEn ? "Sugar and your daily diet" : "糖与每日膳食，应该怎么看？"}</span><LuChevronRight size={16} />
    </a>
    <a className="topic-link" href={region === "cn" ? "https://www.samr.gov.cn/spcjs/" : "https://www.fda.gov/food/food-labeling-nutrition"} target="_blank" rel="noopener noreferrer">
      <img src="/demo/soy-sauce-ingredients.png" alt="" /><span>{isEn ? "Ingredients, additives, and labels" : "配料、添加剂与包装标签"}</span><LuChevronRight size={16} />
    </a>
    <Box mt="7"><AccordionRoot collapsible>
      <AccordionItem value="official"><AccordionItemTrigger><Text fontWeight="semibold" fontSize="sm">{isEn ? "Official references" : "官方资料"}</Text></AccordionItemTrigger>
        <AccordionItemContent>{feed?.references.map((item) => <a className="topic-link" key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"><span>{item.title}</span><LuArrowUpRight size={16} /></a>)}</AccordionItemContent>
      </AccordionItem>
    </AccordionRoot></Box>
  </Box>
}
