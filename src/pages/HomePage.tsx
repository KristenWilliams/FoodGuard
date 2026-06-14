import { Box, Heading, Text, VStack, HStack, Button, Icon, Card, Flex, Badge, Grid } from "@chakra-ui/react"
import { LuScanLine, LuShieldCheck, LuLeafyGreen, LuBookOpen, LuChevronRight, LuTriangleAlert } from "react-icons/lu"
import { useEffect, useState } from "react"
import type { ScanRecord } from "@/types/analysis"
import { getScanHistory } from "@/lib/api"
import { RiskBadge } from "@/components/RiskBadge"

export default function HomePage() {
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([])

  useEffect(() => {
    getScanHistory(3).then(setRecentScans).catch(() => {})
  }, [])

  return (
    <Box px="4" py="6" maxW="3xl" mx="auto">
      <VStack gap="6" align="stretch">
        {/* Hero */}
        <Box
          borderRadius="2xl"
          bg="green.500/10"
          border="1px solid"
          borderColor="green.500/20"
          p="8"
          textAlign="center"
          position="relative"
          overflow="hidden"
        >
          <VStack gap="4">
            <Icon fontSize="5xl" color="green.500">
              <LuShieldCheck />
            </Icon>
            <Heading size="xl" color="fg">
              FoodGuard
            </Heading>
            <Text color="fg.muted" fontSize="md" maxW="md">
              AI驱动的食品安全分析 — 拍照识别配料表，获取基于权威标准的营养与安全评估
            </Text>
            <Button
              as="a"
              href="/scan"
              size="lg"
              colorPalette="green"
              borderRadius="full"
              px="8"
            >
              <Icon mr="2"><LuScanLine /></Icon>
              开始扫描
            </Button>
          </VStack>
        </Box>

        {/* Features */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="green.500"><LuScanLine /></Icon>
                <Text fontWeight="semibold" color="fg">智能识别</Text>
                <Text fontSize="sm" color="fg.muted">拍照自动识别配料表与食品添加剂</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="blue.500"><LuBookOpen /></Icon>
                <Text fontWeight="semibold" color="fg">权威参考</Text>
                <Text fontSize="sm" color="fg.muted">基于FDA、WHO、GB标准等官方数据库</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="orange.500"><LuTriangleAlert /></Icon>
                <Text fontWeight="semibold" color="fg">风险提示</Text>
                <Text fontSize="sm" color="fg.muted">添加剂标识与潜在健康风险预警</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <VStack gap="3" align="stretch">
            <HStack justify="space-between">
              <Heading size="md" color="fg">最近扫描</Heading>
              <Button variant="ghost" size="sm" as="a" href="/history">
                查看全部 <Icon ml="1"><LuChevronRight /></Icon>
              </Button>
            </HStack>
            {recentScans.map((scan) => (
              <Card.Root
                key={scan.id}
                as="a"
                href={`/result/${scan.id}`}
                _hover={{ shadow: "md" }}
                transition="shadow 0.2s"
                cursor="pointer"
              >
                <Card.Body p="4">
                  <Flex justify="space-between" align="center">
                    <VStack gap="1" align="start">
                      <Text fontWeight="semibold" color="fg">
                        {scan.product_name ?? "未识别产品"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {new Date(scan.created_at).toLocaleDateString("zh-CN")}
                      </Text>
                    </VStack>
                    <HStack gap="2">
                      <RiskBadge risk={scan.risk_level} />
                      <Badge colorPalette="green" variant="subtle">
                        {scan.safety_score}分
                      </Badge>
                    </HStack>
                  </Flex>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}

        {/* Supported Authorities */}
        <Box
          borderRadius="xl"
          bg="bg.subtle"
          border="1px solid"
          borderColor="border.subtle"
          p="5"
        >
          <HStack gap="2" mb="3">
            <Icon color="green.500"><LuLeafyGreen /></Icon>
            <Text fontWeight="semibold" color="fg">参考权威机构</Text>
          </HStack>
          <Flex wrap="wrap" gap="2">
            {["GB 2760", "FDA", "EFSA", "WHO/JECFA", "USDA", "NMPA", "FSANZ", "MHLW", "Lancet"].map((s) => (
              <Badge key={s} variant="outline" colorPalette="gray" fontSize="xs" px="2" py="0.5">
                {s}
              </Badge>
            ))}
          </Flex>
        </Box>
      </VStack>
    </Box>
  )
}
