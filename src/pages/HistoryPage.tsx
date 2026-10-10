import { Box, HStack, Text, Heading, Flex, Icon, Spinner, Input, IconButton } from "@chakra-ui/react"
import { EmptyState } from "@/components/ui/empty-state"
import { LuTrash2, LuChevronRight, LuShieldCheck, LuSearch, LuHistory } from "react-icons/lu"
import { useLanguage } from "@/lib/i18n"
import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import type { ScanRecord } from "@/types/analysis"
import { getScanHistory, deleteScan } from "@/lib/api"
import { RiskBadge } from "@/components/RiskBadge"
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "@/components/ui/dialog"
import { Button } from "@chakra-ui/react"

export default function HistoryPage() {
  const isEn = useLanguage() === "en"
  const navigate = useNavigate()
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getScanHistory(20)
      setScans(data)
    } catch { setError("无法读取本机历史，原数据未改动。") }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadHistory()
    const completed = (event: Event) => {
      if ((event as CustomEvent).detail?.status === "completed") void loadHistory()
    }
    window.addEventListener("foodguard:analysis-job", completed)
    return () => window.removeEventListener("foodguard:analysis-job", completed)
  }, [loadHistory])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteScan(deleteId)
      setScans((prev) => prev.filter((s) => s.id !== deleteId))
    } catch { setError("删除未完成，请重试。") }
    setDeleteId(null)
  }, [deleteId])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredScans = scans.filter((scan) => {
    if (!normalizedQuery) return true
    const result = scan.analysis_result
    const text = [
      result?.overall_assessment,
      ...(result?.ingredients ?? []).flatMap((item) => [
        item.name,
        item.category,
        item.description,
        item.risk_reason,
      ]),
      ...(result?.risk_alerts ?? []).flatMap((alert) => [
        alert.title,
        alert.description,
        ...(alert.ingredients ?? []),
      ]),
    ].filter(Boolean).join(" ").toLowerCase()
    return text.includes(normalizedQuery)
  })
  const sortedScans = [...filteredScans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <Box className="page history-page">
      <div className="page-heading">
        <span className="page-symbol" aria-hidden="true"><LuHistory /></span>
        <div><Heading as="h1">{isEn ? "History" : "历史"}</Heading><p className="page-subtitle">{isEn ? "Your last 20 reports" : "最近 20 份报告"}</p></div>
      </div>
      <HStack className="history-search" bg="bg.panel" borderRadius="md" px="3" mb="6" borderWidth="1px" borderColor="border">
        <LuSearch color="var(--fg-muted)" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isEn ? "Search sodium, sugar, additives…" : "搜索高钠、防腐剂、糖…"}
          aria-label={isEn ? "Search history" : "搜索历史"} variant="flushed" border="none" h="46px" />
      </HStack>
      {error && <Text role="alert" color="fg.error" fontSize="sm" mb="4">{isEn ? "Local history could not be updated. Existing data was preserved." : error}</Text>}
      {loading ? <Flex justify="center" py="12"><Spinner color="green.500" /></Flex> : sortedScans.length === 0 ? (
        <EmptyState title={query ? (isEn ? "No matches" : "没有匹配记录") : (isEn ? "No reports yet" : "暂无扫描记录")}
          description={query ? (isEn ? "Try another keyword." : "换个关键词试试") : (isEn ? "Your reports will appear here." : "还没有保存的分析报告")}
          icon={<Icon fontSize="3xl" color="fg.muted"><LuShieldCheck /></Icon>} />
      ) : <div className="history-list">
        {sortedScans.map((scan) => <div key={scan.id} className="history-row" data-reveal>
          <RiskBadge risk={scan.risk_level} size="lg" />
          <button type="button" className="history-open" onClick={() => navigate(`/result/${scan.id}`)}>
            <Text fontWeight="semibold" fontSize="sm">{scan.analysis_result?.ingredients?.slice(0,3).map((i) => isEn ? i.name_en || i.name : i.name).join(" · ") || (isEn ? "Ingredient report" : "配料成分报告")}</Text>
            <Text fontSize="xs" color="fg.muted" mt="2">{new Date(scan.created_at).toLocaleString(isEn ? "en-US" : "zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {scan.analysis_result?.ingredients?.length ?? 0} {isEn ? "ingredients" : "种成分"}</Text>
          </button>
          <DialogRoot open={deleteId === scan.id} onOpenChange={(details) => { if (!details.open) setDeleteId(null) }}>
            <DialogTrigger asChild>
              <IconButton aria-label={isEn ? "Delete report" : "删除记录"} title={isEn ? "Delete" : "删除"} size="xs" variant="ghost" color="fg.muted" onClick={() => setDeleteId(scan.id)}><LuTrash2 /></IconButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>{isEn ? "Delete this report?" : "删除这份报告？"}</DialogHeader><DialogCloseTrigger />
              <DialogBody><Text fontSize="sm" color="fg.muted">{isEn ? "This cannot be undone." : "删除后无法恢复。"}</Text></DialogBody>
              <DialogFooter><DialogActionTrigger asChild><Button variant="ghost" size="sm">{isEn ? "Cancel" : "取消"}</Button></DialogActionTrigger>
                <Button colorPalette="red" size="sm" onClick={handleDelete}>{isEn ? "Delete" : "删除"}</Button></DialogFooter>
            </DialogContent>
          </DialogRoot>
          <LuChevronRight color="var(--fg-muted)" />
        </div>)}
      </div>}
    </Box>
  )
}
