import {
  Box, VStack, HStack, Text, Heading, Badge, Flex,
  Separator, Icon, Link, Button, Tabs,
} from "@chakra-ui/react"
import {
  LuTriangleAlert, LuInfo, LuBookOpen, LuLeafyGreen,
  LuChartBar, LuChartPie, LuRadar, LuChevronDown, LuChevronUp,
} from "react-icons/lu"
import { useEffect, useId, useRef, useState } from "react"
import { useSearchParams, useParams, Link as RouterLink } from "react-router-dom"
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from "@/components/ui/accordion"
import { Alert } from "@/components/ui/alert"
import { AssistantAvatar } from "@/components/AssistantAvatar"
import {
  NutritionBarChart, NutritionRadarChart, NutritionRiskPieChart,
  NutritionStatusCards, IngredientTagList,
} from "@/components/NutritionCharts"
import type { AnalysisResult } from "@/types/analysis"
import { getScanById } from "@/lib/api"
import { readPreferences } from "@/lib/preferences"
import { normalizeAnalysisResult } from "@/lib/analysisPolicy"
import { regionLabel, useLanguage } from "@/lib/i18n"
import { ANALYSIS_VERSION, buildReferences } from "../../shared/analysis.mjs"

function RiskMood({ risk }: { risk: AnalysisResult["risk_level"] }) {
  const en = useLanguage() === "en"
  return <Box role="img" aria-label={en ? "Report attention expression" : "分析状态表情"}><AssistantAvatar size={76} mood={risk} expression={risk === "safe" ? "happy" : undefined} /></Box>
}

function ReportOverview({ text, en }: { text: string; en: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [clipped, setClipped] = useState(false)
  const paragraph = useRef<HTMLParagraphElement>(null)
  const id = useId()
  useEffect(() => {
    const element = paragraph.current
    if (!element) return
    let active = true
    const measure = () => { if (active && !expanded) setClipped(element.scrollHeight > element.clientHeight + 1) }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    void document.fonts.ready.then(measure)
    return () => { active = false; observer.disconnect() }
  }, [text, expanded])
  return <Box className="report-section">
    <HStack gap="2" mb="2"><Icon color="green.500"><LuLeafyGreen /></Icon><Heading as="h2">{en ? "Overview" : "综合评估"}</Heading></HStack>
    <Text id={id} ref={paragraph} fontSize="sm" color="fg.muted" lineHeight="tall" lineClamp={expanded ? undefined : 3}>{text}</Text>
    {(clipped || expanded) && <Button size="xs" variant="plain" color="fg.muted" mt="2" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {expanded ? (en ? "Show less" : "收起") : (en ? "Read more" : "展开全文")}{expanded ? <LuChevronUp /> : <LuChevronDown />}
    </Button>}
  </Box>
}

function ReportAlert({ alert }: { alert: AnalysisResult["risk_alerts"][number] }) {
  return <Alert status={alert.level === "danger" ? "error" : alert.level === "warning" ? "warning" : "info"} title={alert.title}
    icon={<Icon>{alert.level === "info" ? <LuInfo /> : <LuTriangleAlert />}</Icon>}>
    {alert.description}
  </Alert>
}

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loadError, setLoadError] = useState("")
  const isEn = useLanguage() === "en"
  const [preferences, setPreferences] = useState(() => readPreferences())
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id?: string }>()

  useEffect(() => {
    const handlePreferences = () => setPreferences(readPreferences())
    window.addEventListener("foodguard:preferences", handlePreferences)
    return () => window.removeEventListener("foodguard:preferences", handlePreferences)
  }, [])

  useEffect(() => {
    setResult(null); setLoadError("")
    const data = searchParams.get("data")
    if (data) {
      try { setResult(normalizeAnalysisResult(JSON.parse(data), readPreferences().region, readPreferences().language)) }
      catch { setLoadError("invalid") }
      return
    }
    if (id) {
      getScanById(id).then(scan => {
        if (scan) setResult(scan.analysis_result)
        else setLoadError("missing")
      }).catch(() => setLoadError("unreadable"))
    } else { setLoadError("missing") }
  }, [searchParams, id])

  if (!result) {
    return <Box px="4" py="12" textAlign="center">
      <Text color="fg.muted">{loadError ? ({ invalid: isEn ? "Invalid report data." : "报告数据无效。", missing: isEn ? "This local report is missing or deleted." : "这份本机报告不存在或已删除。", unreadable: isEn ? "Unable to read this local report." : "无法读取这份本机报告。" }[loadError]) : (isEn ? "Loading report…" : "加载分析结果中...")}</Text>
      {loadError && <RouterLink to="/history">{isEn ? "Return to history" : "返回历史"}</RouterLink>}
    </Box>
  }

  const priorityAlerts = result.risk_alerts.filter(alert => alert.level !== "info")
  const otherAlerts = result.risk_alerts.filter(alert => alert.level === "info")
  const references = buildReferences(result.ingredients, result.analysis_region || "cn", result.nutrition, isEn ? "en" : "zh")

  return <Box className="page result-page">
    <VStack gap="5" align="stretch">
      <Box className="result-summary">
        <Flex justify="space-between" align="center" gap="3">
          <VStack gap="2" align="start" flex="1" minW="0">
            <Heading as="h1" color="fg">{isEn ? "Ingredient report" : "配料成分分析报告"}</Heading>
            <Text fontSize="sm" color="fg.muted">
              {result.risk_level === "safe" ? isEn ? "Review the visible label and ingredient details." : "请结合包装原文查看已识别的配料"
                : result.risk_level === "moderate" ? isEn ? "Some ingredients need attention; consider frequency and portions." : "部分成分需要留意，建议控制摄入频率"
                  : isEn ? "Pay attention to the specific ingredient warnings below." : "请重点查看下方具体配料警示"}
            </Text>
          </VStack>
          <RiskMood risk={result.risk_level} />
        </Flex>
        <Text fontSize="xs" color="fg.muted" mt="3" data-testid="report-region">
          {isEn ? "Report region: " : "报告地区："}{regionLabel(result.analysis_region, isEn ? "en" : "zh")}
          {result.analysis_language && " · " + (isEn ? "Report language: " : "报告语言：") + (result.analysis_language === "en" ? "English" : "中文")}
        </Text>
        {result.analysis_language && result.analysis_language !== preferences.language && <Text fontSize="xs" color="fg.muted" mt="2">{isEn ? "Report text stays in its original language; changing settings does not re-analyze a saved report." : "报告正文保留生成时的语言，切换设置不会重新分析旧报告。"}</Text>}
      </Box>

      <ReportOverview key={id || result.overall_assessment} text={result.overall_assessment} en={isEn} />

      {priorityAlerts.length > 0 && <VStack gap="3" align="stretch" as="section" aria-label={isEn ? "Important label notes" : "重要标签提示"}>
        {priorityAlerts.map((alert, index) => <ReportAlert key={index} alert={alert} />)}
      </VStack>}
      {otherAlerts.length > 0 && <AccordionRoot collapsible lazyMount unmountOnExit className="report-fold">
        <AccordionItem value="other-notes">
          <AccordionItemTrigger><Icon color="blue.500"><LuInfo /></Icon><Text fontWeight="semibold">{isEn ? "Other label notes" : "其他标签提示"}</Text><Badge variant="outline">{otherAlerts.length}</Badge></AccordionItemTrigger>
          <AccordionItemContent><VStack gap="3" align="stretch">{otherAlerts.map((alert, index) => <ReportAlert key={index} alert={alert} />)}</VStack></AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>}

      <IngredientTagList ingredients={result.ingredients} showAdditiveCodes={preferences.showAdditiveCodes} />

      {preferences.showNutritionChart && <>
        <Separator />
        <Box as="section" aria-label={isEn ? "Label highlights" : "标签营养摘要"}>
          <NutritionStatusCards nutrition={result.nutrition} basis={result.nutrition_basis} />
        </Box>
        <AccordionRoot collapsible lazyMount unmountOnExit className="report-fold" data-testid="report-charts">
          <AccordionItem value="charts">
            <AccordionItemTrigger><Icon color="blue.500"><LuChartBar /></Icon><Text fontWeight="semibold">{isEn ? "Nutrition charts" : "营养图表"}</Text></AccordionItemTrigger>
            <AccordionItemContent>
              <Tabs.Root defaultValue="bars" lazyMount unmountOnExit className="report-chart-tabs">
                <Tabs.List>
                  <Tabs.Trigger value="bars"><LuChartBar />{isEn ? "Values" : "占比"}</Tabs.Trigger>
                  <Tabs.Trigger value="radar"><LuRadar />{isEn ? "Radar" : "雷达"}</Tabs.Trigger>
                  <Tabs.Trigger value="energy"><LuChartPie />{isEn ? "Energy" : "供能"}</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="bars"><NutritionBarChart nutrition={result.nutrition} basis={result.nutrition_basis} /></Tabs.Content>
                <Tabs.Content value="radar"><NutritionRadarChart nutrition={result.nutrition} basis={result.nutrition_basis} /></Tabs.Content>
                <Tabs.Content value="energy"><NutritionRiskPieChart nutrition={result.nutrition} basis={result.nutrition_basis} /></Tabs.Content>
              </Tabs.Root>
            </AccordionItemContent>
          </AccordionItem>
        </AccordionRoot>
      </>}

      <AccordionRoot collapsible lazyMount unmountOnExit className="report-fold" data-testid="report-references">
        <AccordionItem value="references">
          <AccordionItemTrigger><Icon color="teal.500"><LuBookOpen /></Icon><Text fontWeight="semibold">{isEn ? "References" : "参考来源"}</Text><Badge variant="outline">{references.length}</Badge></AccordionItemTrigger>
          <AccordionItemContent>
            <Text fontSize="xs" color="fg.muted" mb="3">{isEn ? "Calculation bases, ingredient entries and standard search links are labelled separately. A search link is not a verified compliance clause." : "分别标明计算依据、成分资料和标准检索。查询入口不代表已核对具体条款或检测合规。"}</Text>
            <VStack gap="4" align="stretch">
              {references.map((ref, index) => <Box key={`${ref.id}-${index}`} pb="4" borderBottomWidth="1px" borderColor="border.subtle">
                <HStack gap="2" flexWrap="wrap" mb="1">
                  <Badge variant="outline">{ref.kind === "lookup" ? (isEn ? "Search" : "检索入口") : ref.kind === "background" ? (isEn ? "Background" : "背景资料") : ref.kind === "basis" ? (isEn ? "Calculation" : "计算依据") : (isEn ? "Ingredient" : "成分资料")}</Badge>
                  <Badge variant="subtle" colorPalette={ref.region === "CN" ? "red" : ref.region === "US" ? "blue" : "teal"}>{ref.region}</Badge>
                  <Text fontWeight="semibold" fontSize="sm">{ref.source}</Text>
                </HStack>
                <Text fontSize="xs" color="fg.muted">{ref.source_full}</Text>
                <Text fontSize="xs" color="fg.subtle" mt="1">{ref.citation}</Text>
                {!!ref.related_ingredients?.length && <Text fontSize="xs" color="fg.muted" mt="1">{isEn ? "Related: " : "相关成分："}{ref.related_ingredients.join("、")}</Text>}
                {ref.url && <Link href={ref.url} target="_blank" rel="noopener noreferrer" fontSize="xs" color="blue.400" textDecoration="underline" mt="2">{isEn ? "Open source" : "查看来源"}</Link>}
              </Box>)}
            </VStack>
          </AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>

      <Box bg="bg.subtle" borderRadius="lg" p="4" border="1px solid" borderColor="border.subtle">
        <Text fontWeight="semibold" fontSize="sm" color="fg" mb="1">{isEn ? "Notice" : "注意事项"}</Text>
        <Text fontSize="xs" color="fg.muted" lineHeight="tall">
          {isEn ? "AI can make mistakes. Check the original label and official sources. This report covers only visible ingredients and nutrition, not brands or manufacturers. Not medical, nutritional or legal advice." : "AI 可能识别错误，请以包装原文和官方标准为准。本报告只分析可见配料和营养，不评价品牌或厂家。本分析仅供参考，不构成医疗、营养或法律建议。"}
          {!result.analysis_version && (isEn ? " This older report has not passed the new label validation." : "这份旧报告未经过新版识别校验。")}
          {result.analysis_version && result.analysis_version !== ANALYSIS_VERSION && (isEn ? " This report uses an older analysis version." : "这份报告使用旧版分析规则。")}
        </Text>
      </Box>
    </VStack>
  </Box>
}
