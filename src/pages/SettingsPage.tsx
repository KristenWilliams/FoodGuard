import {
  Box, VStack, HStack, Text, Heading, Icon,
  Card, Separator, Badge, Flex, Grid,
} from "@chakra-ui/react"
import {
  LuSettings, LuBookOpen, LuGlobe, LuShieldCheck,
  LuFlaskConical, LuHeart, LuInfo,
} from "react-icons/lu"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useState } from "react"

const REGIONS = [
  { value: "cn", label: "中国" },
  { value: "us", label: "美国" },
  { value: "eu", label: "欧盟" },
  { value: "global", label: "全球" },
]

const AUTHORITIES = [
  { name: "GB 2760", full: "中国食品添加剂使用标准", region: "CN", url: "https://std.samr.gov.cn/" },
  { name: "GB 7718", full: "中国预包装食品标签通则", region: "CN", url: "https://std.samr.gov.cn/" },
  { name: "NMPA", full: "中国国家药品监督管理局", region: "CN", url: "https://www.nmpa.gov.cn/" },
  { name: "FDA", full: "U.S. Food and Drug Administration", region: "US", url: "https://www.fda.gov/" },
  { name: "GRAS", full: "FDA Generally Recognized as Safe", region: "US", url: "https://www.fda.gov/food/food-ingredients-packaging/gras" },
  { name: "EFSA", full: "European Food Safety Authority", region: "EU", url: "https://www.efsa.europa.eu/" },
  { name: "E-Numbers", full: "EU Food Additives Database", region: "EU", url: "https://ec.europa.eu/food/" },
  { name: "WHO/JECFA", full: "WHO/FAO食品添加剂联合专家委员会", region: "GLOBAL", url: "https://www.fao.org/food-safety/" },
  { name: "USDA", full: "U.S. Department of Agriculture", region: "US", url: "https://www.usda.gov/" },
  { name: "MHLW", full: "日本厚生劳动省", region: "JP", url: "https://www.mhlw.go.jp/" },
  { name: "FSANZ", full: "澳新食品标准局", region: "AU", url: "https://www.foodstandards.gov.au/" },
  { name: "The Lancet", full: "顶级医学期刊《柳叶刀》", region: "GLOBAL", url: "https://www.thelancet.com/" },
  { name: "Science", full: "顶级科学期刊《科学》", region: "GLOBAL", url: "https://www.science.org/" },
  { name: "Nature Food", full: "Nature食品科学期刊", region: "GLOBAL", url: "https://www.nature.com/natfood/" },
]

const REGION_COLORS: Record<string, string> = {
  CN: "red",
  US: "blue",
  EU: "purple",
  GLOBAL: "teal",
  JP: "pink",
  AU: "orange",
}

export default function SettingsPage() {
  const [region, setRegion] = useState("cn")
  const [showAdditiveCodes, setShowAdditiveCodes] = useState(true)
  const [showNutritionChart, setShowNutritionChart] = useState(true)

  return (
    <Box px="4" py="6" maxW="3xl" mx="auto">
      <VStack gap="6" align="stretch">
        <HStack gap="2">
          <Icon color="green.500"><LuSettings /></Icon>
          <Heading size="lg" color="fg">设置</Heading>
        </HStack>

        {/* Preferences */}
        <Card.Root>
          <Card.Body p="5">
            <VStack gap="5" align="stretch">
              <Text fontWeight="semibold" color="fg">偏好设置</Text>

              <Flex justify="space-between" align="center">
                <VStack gap="0" align="start">
                  <Text fontSize="sm" color="fg">优先监管区域</Text>
                  <Text fontSize="xs" color="fg.muted">选择主要参考的食品安全标准区域</Text>
                </VStack>
                <SegmentedControl
                  value={region}
                  onValueChange={(e) => setRegion(e.value)}
                  items={REGIONS}
                  size="sm"
                />
              </Flex>

              <Separator />

              <Flex justify="space-between" align="center">
                <VStack gap="0" align="start">
                  <Text fontSize="sm" color="fg">显示添加剂编号</Text>
                  <Text fontSize="xs" color="fg.muted">在成分列表中显示E编号/INS编码</Text>
                </VStack>
                <Switch
                  checked={showAdditiveCodes}
                  onCheckedChange={(e) => setShowAdditiveCodes(e.checked)}
                  colorPalette="green"
                />
              </Flex>

              <Separator />

              <Flex justify="space-between" align="center">
                <VStack gap="0" align="start">
                  <Text fontSize="sm" color="fg">营养图表</Text>
                  <Text fontSize="xs" color="fg.muted">在分析结果中展示营养成分图表</Text>
                </VStack>
                <Switch
                  checked={showNutritionChart}
                  onCheckedChange={(e) => setShowNutritionChart(e.checked)}
                  colorPalette="green"
                />
              </Flex>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* About */}
        <Card.Root>
          <Card.Body p="5">
            <VStack gap="4" align="stretch">
              <HStack gap="2">
                <Icon color="green.500"><LuShieldCheck /></Icon>
                <Text fontWeight="semibold" color="fg">关于 FoodGuard</Text>
              </HStack>
              <Text fontSize="sm" color="fg.muted" lineHeight="tall">
                FoodGuard 是一款基于AI的食品安全分析应用。通过拍照识别食品配料表，
                结合全球权威食品安全数据库，为用户提供营养评估与风险提示。
                所有分析结果均引用官方监管机构与顶级学术期刊文献，确保信息可信度。
              </Text>
              <Text fontSize="xs" color="fg.subtle">
                版本 1.0.0 · 数据仅供参考，不构成医疗建议
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Reference Sources */}
        <VStack gap="4" align="stretch">
          <HStack gap="2">
            <Icon color="teal.500"><LuBookOpen /></Icon>
            <Text fontWeight="semibold" color="fg">参考权威来源</Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted">
            本应用的分析数据来源于以下官方机构与学术期刊
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="3">
            {AUTHORITIES.map((auth) => (
              <Card.Root key={auth.name} size="sm">
                <Card.Body p="3">
                  <VStack gap="1" align="start">
                    <HStack gap="2">
                      <Badge
                        variant="solid"
                        colorPalette={REGION_COLORS[auth.region] ?? "gray"}
                        fontSize="2xs"
                      >
                        {auth.region}
                      </Badge>
                      <Text fontWeight="semibold" fontSize="sm" color="fg">
                        {auth.name}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">{auth.full}</Text>
                    <Text
                      as="a"
                      href={auth.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontSize="xs"
                      color="blue.400"
                      textDecoration="underline"
                    >
                      访问官网
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </VStack>

        {/* Disclaimer */}
        <Box bg="bg.subtle" borderRadius="lg" p="4" border="1px solid" borderColor="border.subtle">
          <VStack gap="2" align="start">
            <HStack gap="2">
              <Icon color="fg.muted" fontSize="sm"><LuInfo /></Icon>
              <Text fontWeight="semibold" fontSize="xs" color="fg.muted">免责声明</Text>
            </HStack>
            <Text fontSize="xs" color="fg.muted" lineHeight="tall">
              本应用提供的食品安全分析由AI生成，基于公开可获取的权威监管数据与学术文献。
              分析结果仅供参考，不构成医疗、营养或法律建议。食品添加剂安全评估依据JECFA、
              FDA GRAS、EFSA及中国GB 2760等标准，具体限量值请以最新官方文件为准。
              如有健康疑虑，请咨询专业医师或注册营养师。
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}
