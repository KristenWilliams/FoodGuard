import { Box, VStack, HStack, Text, Heading, Badge, Flex } from "@chakra-ui/react"
import { Chart, useChart } from "@chakra-ui/charts"
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  Tooltip,
} from "recharts"
import type { Nutrition, Ingredient } from "@/types/analysis"

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "热量",
  protein: "蛋白质",
  fat: "脂肪",
  carbs: "碳水",
  sodium: "钠",
  sugar: "糖",
  fiber: "纤维",
}

export function NutritionBarChart({ nutrition }: { nutrition: Nutrition }) {
  const data = Object.entries(nutrition).map(([key, val]) => ({
    name: NUTRIENT_LABELS[key] ?? key,
    value: val.daily_pct,
    fill: key === "sugar" || key === "sodium" ? "orange.solid" : "green.solid",
  }))

  const chart = useChart({
    data,
    series: [{ name: "value", color: "green.solid" }],
  })

  return (
    <Box>
      <Text fontWeight="semibold" fontSize="sm" mb="2" color="fg">
        营养成分 — 每日推荐摄入占比 (%)
      </Text>
      <Chart.Root maxH="240px" chart={chart}>
        <BarChart data={chart.data} barCategoryGap="20%" responsive>
          <CartesianGrid stroke={chart.color("border.muted")} vertical={false} />
          <XAxis
            axisLine={false}
            tickLine={false}
            dataKey="name"
            tick={{ fill: chart.color("fg.muted"), fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tick={{ fill: chart.color("fg.muted"), fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<Chart.Tooltip />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            shape={(props: Record<string, unknown>) => {
              const fill = (props.payload as { fill?: string })?.fill === "orange.solid"
                ? chart.color("orange.solid")
                : chart.color("green.solid")
              return (
                <rect
                  x={props.x as number}
                  y={props.y as number}
                  width={props.width as number}
                  height={props.height as number}
                  rx={4}
                  fill={fill}
                />
              )
            }}
          />
        </BarChart>
      </Chart.Root>
    </Box>
  )
}

export function NutritionRadarChart({ nutrition }: { nutrition: Nutrition }) {
  const data = Object.entries(nutrition).map(([key, val]) => ({
    nutrient: NUTRIENT_LABELS[key] ?? key,
    daily: val.daily_pct,
    recommended: 100,
  }))

  const chart = useChart({
    data,
    series: [
      { name: "daily", color: "green.solid" },
      { name: "recommended", color: "gray.solid" },
    ],
  })

  return (
    <Box>
      <Text fontWeight="semibold" fontSize="sm" mb="2" color="fg">
        营养雷达图
      </Text>
      <Chart.Root maxW="320px" chart={chart} mx="auto">
        <RadarChart data={chart.data} responsive>
          <PolarGrid stroke={chart.color("border")} />
          <PolarAngleAxis
            dataKey="nutrient"
            tick={{ fill: chart.color("fg.muted"), fontSize: 10 }}
          />
          <PolarRadiusAxis tick={false} />
          {chart.series.map((item) => (
            <Radar
              key={item.name}
              isAnimationActive={false}
              name={item.name}
              dataKey={item.name}
              stroke={chart.color(item.color)}
              fill={chart.color(item.color)}
              fillOpacity={item.name === "recommended" ? 0.05 : 0.2}
            />
          ))}
          <Tooltip content={<Chart.Tooltip />} />
        </RadarChart>
      </Chart.Root>
      <HStack justify="center" gap="4" mt="2">
        <HStack gap="1">
          <Box w="3" h="3" borderRadius="full" bg="green.500" />
          <Text fontSize="xs" color="fg.muted">实际摄入</Text>
        </HStack>
        <HStack gap="1">
          <Box w="3" h="3" borderRadius="full" bg="gray.400" />
          <Text fontSize="xs" color="fg.muted">推荐摄入</Text>
        </HStack>
      </HStack>
    </Box>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
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

export function IngredientTagList({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <VStack gap="3" align="stretch">
      {ingredients.map((ing, i) => (
        <Flex
          key={i}
          p="3"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.subtle"
          bg="bg.subtle"
          direction="column"
          gap="2"
        >
          <HStack justify="space-between" flexWrap="wrap" gap="2">
            <HStack gap="2">
              <Badge
                colorPalette={CATEGORY_COLORS[ing.category] ?? "gray"}
                variant="subtle"
              >
                {ing.category}
              </Badge>
              <Text fontWeight="semibold" color="fg" fontSize="sm">
                {ing.name}
              </Text>
              {ing.name_en !== ing.name && (
                <Text fontSize="xs" color="fg.muted">{ing.name_en}</Text>
              )}
            </HStack>
            <HStack gap="2">
              {ing.additive_code && (
                <Badge variant="outline" colorPalette="purple" fontSize="xs">
                  {ing.additive_code}
                </Badge>
              )}
              <Badge
                colorPalette={
                  ing.risk_level === "safe"
                    ? "green"
                    : ing.risk_level === "moderate"
                      ? "orange"
                      : "red"
                }
                variant="subtle"
              >
                {ing.risk_level === "safe"
                  ? "安全"
                  : ing.risk_level === "moderate"
                    ? "注意"
                    : "谨慎"}
              </Badge>
            </HStack>
          </HStack>
          <Text fontSize="xs" color="fg.muted">{ing.description}</Text>
          {ing.daily_intake_limit && (
            <Text fontSize="xs" color="fg.subtle">
              每日限量: {ing.daily_intake_limit}
            </Text>
          )}
          {ing.risk_reason && (
            <Text fontSize="xs" color="fg.error">
              ⚠ {ing.risk_reason}
            </Text>
          )}
        </Flex>
      ))}
    </VStack>
  )
}
