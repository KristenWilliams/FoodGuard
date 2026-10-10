import { Box, Heading, Text, VStack, HStack, Button, Icon, Card, Flex, Badge, Grid } from "@chakra-ui/react"
import { LuScanLine, LuShieldCheck, LuLeafyGreen, LuBookOpen, LuChevronRight, LuTriangleAlert } from "react-icons/lu"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { ScanRecord } from "@/types/analysis"
import { getScanHistory } from "@/lib/api"
import { RiskBadge } from "@/components/RiskBadge"
import { useT } from "@/lib/i18n"

export default function HomePage() {
  const navigate = useNavigate()
  const t = useT()
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([])

  useEffect(() => {
    getScanHistory(3).then(setRecentScans).catch(() => {})
  }, [])

  return (
    <Box px="4" py="6" maxW="3xl" mx="auto">
      <style>{`
        @keyframes foodguard-scan-sweep {
          0%, 100% { transform: translateY(-42px); opacity: .35; }
          50% { transform: translateY(42px); opacity: .95; }
        }
        @keyframes foodguard-pack-tilt {
          0%, 100% { transform: rotateX(58deg) rotateZ(-12deg) translateY(0); }
          50% { transform: rotateX(54deg) rotateZ(-8deg) translateY(-7px); }
        }
      `}</style>
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
          <Flex direction={{ base: "column", md: "row" }} gap="6" align="center" justify="center">
            <VStack gap="4" flex="1">
              <Icon fontSize="5xl" color="green.500">
                <LuShieldCheck />
              </Icon>
              <Heading size="xl" color="fg">
                FoodGuard
              </Heading>
              <Text color="fg.muted" fontSize="md" maxW="md">
                {t("appSubtitle")}
              </Text>
              <Button
                onClick={() => navigate("/scan")}
                size="lg"
                colorPalette="green"
                borderRadius="full"
                px="8"
              >
                <Icon mr="2"><LuScanLine /></Icon>
                {t("startScan")}
              </Button>
            </VStack>
            <Box
              w={{ base: "180px", md: "210px" }}
              h="150px"
              position="relative"
              style={{ perspective: "700px" }}
              aria-hidden="true"
            >
              <Box
                position="absolute"
                inset="18px 18px 8px 18px"
                borderRadius="2xl"
                bg="whiteAlpha.800"
                border="1px solid"
                borderColor="green.200"
                shadow="lg"
                style={{
                  transformStyle: "preserve-3d",
                  animation: "foodguard-pack-tilt 4s ease-in-out infinite",
                }}
              >
                <Box position="absolute" inset="10px" borderRadius="lg" bg="red.500/90" />
                <Box position="absolute" left="20px" right="20px" top="36px" h="50px" borderRadius="md" bg="white" />
                <Box position="absolute" left="30px" right="30px" top="48px" h="5px" borderRadius="full" bg="gray.700" />
                <Box position="absolute" left="30px" right="42px" top="60px" h="5px" borderRadius="full" bg="gray.500" />
                <Box position="absolute" left="30px" right="54px" top="72px" h="5px" borderRadius="full" bg="gray.500" />
              </Box>
              <Box
                position="absolute"
                left="20px"
                right="20px"
                top="67px"
                h="4px"
                borderRadius="full"
                bg="green.400"
                boxShadow="0 0 22px rgba(34,197,94,.75)"
                style={{ animation: "foodguard-scan-sweep 2.2s ease-in-out infinite" }}
              />
            </Box>
          </Flex>
        </Box>

        {/* Features */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="green.500"><LuScanLine /></Icon>
                <Text fontWeight="semibold" color="fg">{t("smartScan")}</Text>
                <Text fontSize="sm" color="fg.muted">{t("smartScanDesc")}</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="blue.500"><LuBookOpen /></Icon>
                <Text fontWeight="semibold" color="fg">{t("references")}</Text>
                <Text fontSize="sm" color="fg.muted">{t("referencesDesc")}</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p="4">
              <VStack gap="2" align="start">
                <Icon fontSize="xl" color="orange.500"><LuTriangleAlert /></Icon>
                <Text fontWeight="semibold" color="fg">{t("riskTips")}</Text>
                <Text fontSize="sm" color="fg.muted">{t("riskTipsDesc")}</Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <VStack gap="3" align="stretch">
            <HStack justify="space-between">
              <Heading size="md" color="fg">最近扫描</Heading>
              <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                查看全部 <Icon ml="1"><LuChevronRight /></Icon>
              </Button>
            </HStack>
            {recentScans.map((scan) => (
              <Card.Root
                key={scan.id}
                onClick={() => navigate(`/result/${scan.id}`)}
                _hover={{ shadow: "md" }}
                transition="shadow 0.2s"
                cursor="pointer"
              >
                <Card.Body p="4">
                  <Flex justify="space-between" align="center">
                    <VStack gap="1" align="start">
                      <Text fontWeight="semibold" color="fg">
                        配料成分分析报告
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {new Date(scan.created_at).toLocaleDateString("zh-CN")}
                      </Text>
                    </VStack>
                    <HStack gap="2">
                      <RiskBadge risk={scan.risk_level} />
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
            {["GB 2760", "GB 2761", "GB 2762", "GB 2763", "中国居民膳食指南", "中国 DRIs", "FDA", "EFSA", "WHO/JECFA", "DGA", "US DRI", "FSANZ"].map((s) => (
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
