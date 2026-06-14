import {
  Box, VStack, HStack, Text, Heading, Badge, Flex,
  Card, Separator, Icon, Grid,
} from "@chakra-ui/react"
import { ProgressCircleRoot, ProgressCircleRing, ProgressCircleValueText } from "@/components/ui/progress-circle"
import {
  LuShieldCheck, LuTriangleAlert, LuInfo, LuBookOpen,
  LuFlaskConical, LuHeart, LuLeafyGreen,
} from "react-icons/lu"
import { useEffect, useState } from "react"
import { useSearchParams, useParams } from "react-router-dom"
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from "@/components/ui/accordion"
import { Alert } from "@/components/ui/alert"
import { RiskBadge } from "@/components/RiskBadge"
import { NutritionBarChart, NutritionRadarChart, IngredientTagList } from "@/components/NutritionCharts"
import type { AnalysisResult } from "@/types/analysis"
import { getScanById } from "@/lib/api"

const RISK_COLORS = {
  safe: "green",
  moderate: "orange",
  caution: "red",
} as const

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [searchParams] = useSearchParams()
  const { id } = useParams<{ id?: string }>()

  useEffect(() => {
    const data = searchParams.get("data")
    if (data) {
      try {
        setResult(JSON.parse(data))
      } catch { /* ignore */ }
      return
    }
    if (id) {
      getScanById(id).then((scan) => {
        if (scan) setResult(scan.analysis_result)
      }).catch(() => {})
    }
  }, [searchParams, id])

  if (!result) {
    return (
      <Box px="4" py="12" textAlign="center">
        <Text color="fg.muted">加载分析结果中...</Text>
      </Box>
    )
  }

  const riskColor = RISK_COLORS[result.risk_level]

  return (
    <Box px="4" py="6" maxW="3xl" mx="auto">
      <VStack gap="6" align="stretch">
        {/* Safety Score Card */}
        <Box
          borderRadius="2xl"
          bg={`${riskColor}.500/10`}
          border="1px solid"
          borderColor={`${riskColor}.500/30`}
          p="6"
        >
          <Flex justify="space-between" align="center" flexWrap="wrap" gap="4">
            <VStack gap="2" align="start">
              <Heading size="md" color="fg">
                {result.product_name ?? "食品安全分析报告"}
              </Heading>
              <RiskBadge risk={result.risk_level} size="lg" />
              <Text fontSize="sm" color="fg.muted">
                {result.risk_level === "safe"
                  ? "该产品成分安全，可放心食用"
                  : result.risk_level === "moderate"
                    ? "该产品部分成分需注意，建议适量食用"
                    : "该产品含高风险成分，建议谨慎选择"}
              </Text>
            </VStack>
            <ProgressCircleRoot size="xl" value={result.safety_score} colorPalette={riskColor}>
              <ProgressCircleRing cap="round" />
              <ProgressCircleValueText />
            </ProgressCircleRoot>
          </Flex>
        </Box>

        {/* Overall Assessment */}
        <Card.Root>
          <Card.Body p="5">
            <HStack gap="2" mb="2">
              <Icon color="green.500"><LuLeafyGreen /></Icon>
              <Text fontWeight="semibold" color="fg">综合评估</Text>
            </HStack>
            <Text fontSize="sm" color="fg.muted" lineHeight="tall">
              {result.overall_assessment}
            </Text>
          </Card.Body>
        </Card.Root>

        <Separator />

        {/* Risk Alerts */}
        {result.risk_alerts.length > 0 && (
          <VStack gap="3" align="stretch">
            <HStack gap="2">
              <Icon color="orange.500"><LuTriangleAlert /></Icon>
              <Text fontWeight="semibold" color="fg">风险提示</Text>
            </HStack>
            {result.risk_alerts.map((alert, i) => (
              <Alert
                key={i}
                status={
                  alert.level === "danger"
                    ? "error"
                    : alert.level === "warning"
                      ? "warning"
                      : "info"
                }
                title={alert.title}
                icon={
                  alert.level === "danger" ? (
                    <Icon><LuTriangleAlert /></Icon>
                  ) : alert.level === "warning" ? (
                    <Icon><LuTriangleAlert /></Icon>
                  ) : (
                    <Icon><LuInfo /></Icon>
                  )
                }
              >
                {alert.description}
              </Alert>
            ))}
          </VStack>
        )}

        <Separator />

        {/* Nutrition Charts */}
        <VStack gap="5" align="stretch">
          <HStack gap="2">
            <Icon color="blue.500"><LuHeart /></Icon>
            <Text fontWeight="semibold" color="fg">营养成分分析</Text>
          </HStack>
          <NutritionBarChart nutrition={result.nutrition} />
          <NutritionRadarChart nutrition={result.nutrition} />
        </VStack>

        <Separator />

        {/* Ingredients */}
        <VStack gap="4" align="stretch">
          <HStack gap="2">
            <Icon color="purple.500"><LuFlaskConical /></Icon>
            <Text fontWeight="semibold" color="fg">成分详情</Text>
            <Badge variant="outline" colorPalette="gray">
              {result.ingredients.length} 项
            </Badge>
          </HStack>
          <IngredientTagList ingredients={result.ingredients} />
        </VStack>

        <Separator />

        {/* Additive-specific section */}
        {result.ingredients.some((i) => i.additive_code) && (
          <VStack gap="4" align="stretch">
            <HStack gap="2">
              <Icon color="pink.500"><LuFlaskConical /></Icon>
              <Text fontWeight="semibold" color="fg">食品添加剂</Text>
            </HStack>
            <AccordionRoot multiple>
              {result.ingredients
                .filter((i) => i.additive_code)
                .map((ing, i) => (
                  <AccordionItem key={i} value={`additive-${i}`}>
                    <AccordionItemTrigger>
                      <HStack gap="2" flex="1">
                        <Badge variant="outline" colorPalette="purple">
                          {ing.additive_code}
                        </Badge>
                        <Text fontSize="sm" fontWeight="medium" color="fg">
                          {ing.name} ({ing.name_en})
                        </Text>
                        <RiskBadge risk={ing.risk_level} />
                      </HStack>
                    </AccordionItemTrigger>
                    <AccordionItemContent>
                      <VStack gap="2" align="start" px="2">
                        <Text fontSize="sm" color="fg.muted">{ing.description}</Text>
                        {ing.daily_intake_limit && (
                          <Text fontSize="sm" color="fg.subtle">
                            每日限量 (ADI): {ing.daily_intake_limit}
                          </Text>
                        )}
                        {ing.risk_reason && (
                          <Text fontSize="sm" color="fg.error">
                            风险说明: {ing.risk_reason}
                          </Text>
                        )}
                        <Text fontSize="xs" color="fg.muted">
                          类别: {ing.category}
                        </Text>
                      </VStack>
                    </AccordionItemContent>
                  </AccordionItem>
                ))}
            </AccordionRoot>
          </VStack>
        )}

        <Separator />

        {/* References */}
        <VStack gap="3" align="stretch">
          <HStack gap="2">
            <Icon color="teal.500"><LuBookOpen /></Icon>
            <Text fontWeight="semibold" color="fg">参考权威来源</Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted" mb="1">
            以下为本报告所引用的权威机构与标准文献
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="3">
            {result.references.map((ref, i) => (
              <Card.Root key={i} size="sm">
                <Card.Body p="3">
                  <VStack gap="1" align="start">
                    <HStack gap="2">
                      <Badge
                        variant="solid"
                        colorPalette={
                          ref.region === "CN"
                            ? "red"
                            : ref.region === "US"
                              ? "blue"
                              : ref.region === "EU"
                                ? "purple"
                                : ref.region === "JP"
                                  ? "pink"
                                  : ref.region === "AU"
                                    ? "orange"
                                    : "teal"
                        }
                        fontSize="2xs"
                      >
                        {ref.region}
                      </Badge>
                      <Text fontWeight="semibold" fontSize="sm" color="fg">
                        {ref.source}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {ref.source_full}
                    </Text>
                    <Text fontSize="xs" color="fg.subtle">
                      {ref.citation}
                    </Text>
                    {ref.url && (
                      <Text
                        as="a"
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        fontSize="xs"
                        color="blue.400"
                        textDecoration="underline"
                      >
                        查看来源
                      </Text>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </VStack>

        {/* Disclaimer */}
        <Box
          bg="bg.subtle"
          borderRadius="lg"
          p="4"
          border="1px solid"
          borderColor="border.subtle"
        >
          <Text fontSize="xs" color="fg.muted">
            免责声明：本分析结果由AI生成，仅供参考。数据来源于公开权威数据库，但不构成医疗或营养建议。
            如有健康疑虑，请咨询专业医师或营养师。添加剂限量数据来自JECFA、FDA、EFSA及中国GB标准。
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}
