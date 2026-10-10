import { Box, VStack, HStack, Text, Badge, Flex, Grid, Heading, Icon, IconButton } from "@chakra-ui/react"
import { useState } from "react"
import { LuChevronsDown, LuChevronsUp, LuFlaskConical, LuTriangleAlert } from "react-icons/lu"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import type { Nutrition, NutritionItem, Ingredient, AnalysisResult } from "@/types/analysis"
import { RiskBadge } from "@/components/RiskBadge"
import { categoryLabel, useLanguage } from "@/lib/i18n"
import { nutrientStatus } from "../../shared/analysis.mjs"
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from "@/components/ui/accordion"

type Props = { nutrition?: Partial<Nutrition> | null; basis?: AnalysisResult["nutrition_basis"] }
type Row = { key: string; name: string; value: number | null; daily_pct: number | null; unit: string; fill: string; item: NutritionItem }
const LABELS: Record<string, [string, string]> = {
  calories: ["能量", "Energy"], protein: ["蛋白质", "Protein"], fat: ["脂肪", "Fat"], carbs: ["碳水化合物", "Carbs"],
  sodium: ["钠", "Sodium"], sugar: ["总糖", "Total sugars"], fiber: ["膳食纤维", "Fibre"],
  saturated_fat: ["饱和脂肪", "Saturated fat"], calcium: ["钙", "Calcium"], iron: ["铁", "Iron"], potassium: ["钾", "Potassium"],
}
const COLORS: Record<string, string> = { sodium: "#c66058", sugar: "#d78243", fat: "#b89930", fiber: "#288a9c", protein: "#337aba", carbs: "#16856d" }
function rows(nutrition: Props["nutrition"], en: boolean): Row[] {
  return Object.entries(nutrition || {}).filter((entry): entry is [string, NutritionItem] => Boolean(entry[1])).map(([key, item]) => ({
    key, name: LABELS[key]?.[en ? 1 : 0] || key, value: item.status === "recognized" || !item.status ? item.value : null,
    daily_pct: item.daily_pct, unit: item.unit, fill: COLORS[key] || "#288a9c", item,
  }))
}
function EmptyChart({ text }: { text?: string }) {
  const en = useLanguage() === "en"
  return <Box py="5" px="3" bg="bg.subtle" borderRadius="md" textAlign="center">
    <Text fontSize="sm" color="fg.muted">{text || (en ? "Nutrition values could not be reliably read." : "营养数据无法可靠识别")}</Text>
  </Box>
}
function Caption({ basis, rows: data }: { basis: Props["basis"]; rows: Row[] }) {
  const en = useLanguage() === "en"
  const source = data.find(row => row.item.reference_basis)?.item.reference_basis
  return <Text fontSize="xs" color="fg.muted" mt="2">
    {basis ? (en ? "Label amount: " : "标签标示量：") + basis.amount + basis.unit : (en ? "Label amount unknown" : "标签计量基准不明")}
    {source ? " · " + source : ""} · {en ? "Not your actual intake" : "不是实际摄入量"}
  </Text>
}
function PercentTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Row }> }) {
  const en = useLanguage() === "en"
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return <Box bg="bg.panel" p="3" borderWidth="1px" borderRadius="md"><Text fontSize="xs">{row.name}: {row.value}{row.unit}</Text><Text fontSize="xs">{en ? "Label reference: " : "标签参考占比："}{row.daily_pct}%</Text></Box>
}
export function NutritionBarChart({ nutrition, basis }: Props) {
  const en = useLanguage() === "en"
  const data = rows(nutrition, en).filter(row => row.value !== null && row.daily_pct !== null)
  if (!data.length) return <EmptyChart text={en ? "No reliable reference percentages." : "没有可可靠计算的参考占比"} />
  const max = Math.ceil(Math.max(100, ...data.map(row => row.daily_pct!)) / 20) * 20
  return <Box minW="0"><Text fontWeight="semibold" fontSize="sm" mb="2">{en ? "Label reference percentages" : "标签参考占比"}</Text>
    <Box h="280px" minW="0"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 12, right: 18, top: 6, bottom: 4 }}>
      <CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" domain={[0, max]} tickFormatter={value => value + "%"} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={en ? 85 : 80} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
      <Tooltip content={<PercentTooltip />} /><Bar dataKey="daily_pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>{data.map(row => <Cell key={row.key} fill={row.fill} />)}</Bar>
    </BarChart></ResponsiveContainer></Box><Caption basis={basis} rows={data} />
  </Box>
}
export function NutritionRadarChart({ nutrition, basis }: Props) {
  const en = useLanguage() === "en"
  const data = rows(nutrition, en).filter(row => row.value !== null && row.daily_pct !== null).slice(0, 8).map(row => ({ ...row, reference: 100 }))
  if (data.length < 3) return <EmptyChart text={en ? "At least three reliable percentages are needed." : "雷达图需要至少三项可靠参考占比"} />
  const max = Math.ceil(Math.max(100, ...data.map(row => row.daily_pct!)) / 20) * 20
  return <Box minW="0"><Text fontWeight="semibold" fontSize="sm" mb="2">{en ? "Nutrition reference radar" : "营养参考雷达"}</Text>
    <Box h="290px" minW="0"><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="62%">
      <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, max]} tick={false} />
      <Radar name={en ? "Label reference %" : "标签参考占比"} dataKey="daily_pct" stroke="#16856d" fill="#16856d" fillOpacity={0.2} isAnimationActive={false} />
      <Radar name={en ? "100% reference" : "100% 参考线"} dataKey="reference" stroke="#94a3b8" fillOpacity={0} isAnimationActive={false} /><Tooltip />
    </RadarChart></ResponsiveContainer></Box><Caption basis={basis} rows={data} />
  </Box>
}
export function NutritionRiskPieChart({ nutrition, basis }: Props) {
  const en = useLanguage() === "en"
  const macros = rows(nutrition, en).filter(row => ["protein", "fat", "carbs"].includes(row.key))
  if (!basis || macros.length !== 3 || macros.some(row => row.value === null || !/^g(?:\/|$)/.test(row.unit))) return <EmptyChart text={en ? "Energy proportions need protein, fat and carbs on the same label basis." : "供能比例需要同一计量基准下的蛋白质、脂肪和碳水数据"} />
  const data = macros.map(row => ({ ...row, energy: row.value! * (row.key === "fat" ? 9 : 4) }))
  const sum = data.reduce((total, row) => total + row.energy, 0)
  if (!sum) return <EmptyChart text={en ? "All three labelled energy contributions are zero." : "三项标签数值计算的供能均为 0"} />
  return <Box minW="0"><Text fontWeight="semibold" fontSize="sm" mb="2">{en ? "Calculated macro energy proportions" : "三大营养素计算供能比例"}</Text>
    <Box h="240px" minW="0"><ResponsiveContainer width="100%" height="100%"><PieChart>
      <Pie data={data} dataKey="energy" nameKey="name" innerRadius="48%" outerRadius="80%" isAnimationActive={false}>{data.map(row => <Cell key={row.key} fill={row.fill} />)}</Pie>
      <Tooltip formatter={value => [((Number(value) / sum) * 100).toFixed(1) + "%", en ? "Calculated energy" : "计算供能"]} />
    </PieChart></ResponsiveContainer></Box>
    <Flex gap="3" justify="center" flexWrap="wrap">{data.map(row => <HStack key={row.key} gap="1"><Box w="2" h="2" bg={row.fill} borderRadius="full" /><Text fontSize="xs">{row.name} {((row.energy / sum) * 100).toFixed(1)}%</Text></HStack>)}</Flex>
    <Text fontSize="xs" color="fg.muted" mt="3">{en ? "Calculated with 4/9/4 kcal per gram, not the exact total energy printed on the label." : "按每克 4/9/4 千卡计算，不等同于包装标示总能量。"}</Text>
  </Box>
}
export function NutritionStatusCards({ nutrition, basis }: Props) {
  const language = useLanguage()
  const en = language === "en"
  const all = rows(nutrition, en)
  const reliable = all.filter(row => row.value !== null)
  const data = reliable.length ? reliable.sort((a, b) => {
    const rank = (key: string) => ["sodium", "sugar", "saturated_fat", "fat", "fiber", "protein", "calcium", "iron", "potassium", "carbs", "calories"].indexOf(key)
    return rank(a.key) - rank(b.key)
  }).slice(0, 4) : all.filter(row => ["sodium", "sugar", "fat", "fiber"].includes(row.key))
  return <Box><Text fontWeight="semibold" fontSize="sm" mb="3">{en ? "Label highlights" : "标签营养摘要"}</Text>
    <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="3">{data.map(row => {
      const status = nutrientStatus(row.key, row.item, language)
      return <Box key={row.key} p="3" borderWidth="1px" borderRadius="md" minW="0" data-testid={"nutrient-" + row.key}>
        <Text fontSize="sm" fontWeight="semibold">{row.name}</Text>
        <Text fontSize="sm" mt="1">{row.value === null ? "—" : row.value + row.unit}</Text>
        <Badge mt="2" colorPalette={status.color}>{status.label}</Badge>
        <Text fontSize="xs" color="fg.muted" mt="2">{row.daily_pct === null ? status.detail : row.daily_pct + "% · " + row.item.reference_basis}</Text>
        {row.item.comparisons?.["CN NRV"] !== undefined && <Text fontSize="xs" color="fg.muted" mt="1">CN NRV: {row.item.comparisons["CN NRV"]}%</Text>}
      </Box>
    })}</Grid><Caption basis={basis} rows={data} />
  </Box>
}

const CATEGORY_COLORS: Record<string, string> = {
  糖类原料: "orange",
  基础原料: "blue",
  凝胶剂: "cyan",
  果汁原料: "green",
  水果加工原料: "green",
  主料: "green",
  辅料: "blue",
  添加剂: "purple",
  防腐剂: "red",
  色素: "pink",
  甜味剂: "orange",
  增味剂: "yellow",
  抗氧化剂: "teal",
  乳化剂: "cyan",
  增稠剂: "gray",
  其他: "gray",
}

export function IngredientTagList({
  ingredients,
  showAdditiveCodes = true,
}: {
  ingredients: Ingredient[]
  showAdditiveCodes?: boolean
}) {
  const language = useLanguage()
  const en = language === "en"
  const [expanded, setExpanded] = useState<string[]>([])
  const values = ingredients.map((_, index) => `ingredient-${index}`)
  const allExpanded = values.length > 0 && values.every(value => expanded.includes(value))
  return (
    <VStack gap="2" align="stretch" as="section" aria-label={en ? "Ingredient details" : "配料详情"}>
      <HStack justify="space-between" gap="2">
        <HStack gap="2"><Icon color="purple.500"><LuFlaskConical /></Icon><Heading as="h2">{en ? "Ingredient details" : "配料详情"}</Heading><Badge variant="outline">{ingredients.length} {en ? "items" : "项"}</Badge></HStack>
        {ingredients.length > 0 && <IconButton variant="ghost" size="sm" title={allExpanded ? (en ? "Collapse all ingredient details" : "收起所有配料说明") : (en ? "Expand all ingredient details" : "展开所有配料说明")}
          aria-label={allExpanded ? (en ? "Collapse all ingredient details" : "收起所有配料说明") : (en ? "Expand all ingredient details" : "展开所有配料说明")}
          onClick={() => setExpanded(allExpanded ? [] : values)}>{allExpanded ? <LuChevronsUp /> : <LuChevronsDown />}</IconButton>}
      </HStack>
      {!ingredients.length && <Text fontSize="sm" color="fg.muted">{en ? "Ingredient text could not be reliably read." : "配料文字未可靠识别"}</Text>}
      <AccordionRoot multiple collapsible value={expanded} onValueChange={details => setExpanded(details.value)} lazyMount unmountOnExit className="ingredient-list">
        {ingredients.map((ing, index) => <AccordionItem key={index} value={values[index]} className="ingredient-row">
          <AccordionItemTrigger>
            <Flex direction="column" gap="1" flex="1" minW="0">
              <HStack gap="2" flexWrap="wrap" minW="0">
                <Text fontWeight="semibold" color="fg" fontSize="sm" overflowWrap="anywhere">{en ? ing.name_en || ing.name : ing.name}</Text>
                {showAdditiveCodes && ing.additive_code && <Badge variant="outline" colorPalette="purple" fontSize="xs">{ing.additive_code}</Badge>}
              </HStack>
              <Badge variant="subtle" colorPalette={CATEGORY_COLORS[ing.category] ?? "gray"} alignSelf="flex-start" fontSize="xs">{categoryLabel(ing.category, language)}</Badge>
            </Flex>
            <RiskBadge risk={ing.risk_level} size="md" />
          </AccordionItemTrigger>
          {ing.risk_reason && <HStack gap="2" align="start" pb="3" color="fg.error"><Icon mt="0.5" flexShrink="0"><LuTriangleAlert /></Icon><Text fontSize="xs">{ing.risk_reason}</Text></HStack>}
          <AccordionItemContent>
            {!en && ing.name_en && ing.name_en !== ing.name && <Text fontSize="xs" color="fg.muted" mb="2">{ing.name_en}</Text>}
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">{ing.description}</Text>
            {ing.daily_intake_limit && <Text fontSize="xs" color="fg.subtle" mt="2">{en ? "Daily limit: " : "每日限量: "}{ing.daily_intake_limit}</Text>}
          </AccordionItemContent>
        </AccordionItem>)}
      </AccordionRoot>
    </VStack>
  )
}
