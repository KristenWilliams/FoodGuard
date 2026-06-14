import { Box, VStack, HStack, Text, Heading, Card, Flex, Badge, Icon, Spinner } from "@chakra-ui/react"
import { EmptyState } from "@/components/ui/empty-state"
import { LuHistory, LuTrash2, LuChevronRight, LuShieldCheck } from "react-icons/lu"
import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import type { ScanRecord } from "@/types/analysis"
import { getScanHistory, deleteScan } from "@/lib/api"
import { RiskBadge } from "@/components/RiskBadge"
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "@/components/ui/dialog"
import { Button } from "@chakra-ui/react"

type SortKey = "date" | "score"

export default function HistoryPage() {
  const navigate = useNavigate()
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>("date")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getScanHistory(50)
      setScans(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      await deleteScan(deleteId)
      setScans((prev) => prev.filter((s) => s.id !== deleteId))
    } catch { /* ignore */ }
    setDeleteId(null)
  }, [deleteId])

  const sortedScans = [...scans].sort((a, b) => {
    if (sortBy === "score") return a.safety_score - b.safety_score
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <Box px="4" py="6" maxW="3xl" mx="auto">
      <VStack gap="5" align="stretch">
        <Flex justify="space-between" align="center">
          <HStack gap="2">
            <Icon color="blue.500"><LuHistory /></Icon>
            <Heading size="lg" color="fg">扫描历史</Heading>
          </HStack>
          <HStack gap="2">
            <Text fontSize="xs" color="fg.muted">排序:</Text>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              style={{
                background: "var(--chakra-colors-bg-subtle)",
                border: "1px solid var(--chakra-colors-border-subtle)",
                borderRadius: "var(--chakra-radii-md)",
                padding: "2px 8px",
                fontSize: "var(--chakra-fontSizes-xs)",
                color: "var(--chakra-colors-fg-muted)",
              }}
            >
              <option value="date">按日期</option>
              <option value="score">按评分</option>
            </select>
          </HStack>
        </Flex>

        {loading ? (
          <Flex justify="center" py="12">
            <Spinner size="lg" color="green.500" />
          </Flex>
        ) : sortedScans.length === 0 ? (
          <EmptyState
            title="暂无扫描记录"
            description="扫描食品配料表后，结果将保存在这里"
            icon={<Icon fontSize="3xl" color="fg.muted"><LuShieldCheck /></Icon>}
          />
        ) : (
          <VStack gap="3" align="stretch">
            {sortedScans.map((scan) => (
              <Card.Root
                key={scan.id}
                _hover={{ shadow: "md" }}
                transition="shadow 0.2s"
                cursor="pointer"
              >
                <Card.Body p="4">
                  <Flex justify="space-between" align="center" gap="3">
                    <Box
                      as="a"
                      href={`/result/${scan.id}`}
                      flex="1"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault()
                        navigate(`/result?data=${encodeURIComponent(JSON.stringify(scan.analysis_result))}`)
                      }}
                    >
                      <VStack gap="1" align="start">
                        <Text fontWeight="semibold" color="fg" fontSize="sm">
                          {scan.product_name ?? "未识别产品"}
                        </Text>
                        <HStack gap="2">
                          <Text fontSize="xs" color="fg.muted">
                            {new Date(scan.created_at).toLocaleDateString("zh-CN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                          <Text fontSize="xs" color="fg.subtle">
                            {scan.analysis_result?.ingredients?.length ?? 0} 种成分
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                    <HStack gap="2">
                      <RiskBadge risk={scan.risk_level} />
                      <Badge colorPalette="green" variant="subtle" fontSize="xs">
                        {scan.safety_score}分
                      </Badge>
                      <DialogRoot
                        open={deleteId === scan.id}
                        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
                      >
                        <DialogTrigger asChild>
                          <Icon
                            fontSize="md"
                            color="fg.muted"
                            cursor="pointer"
                            _hover={{ color: "red.500" }}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              setDeleteId(scan.id)
                            }}
                          >
                            <LuTrash2 />
                          </Icon>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>确认删除</DialogHeader>
                          <DialogCloseTrigger />
                          <DialogBody>
                            <Text fontSize="sm" color="fg.muted">
                              确定要删除这条扫描记录吗？此操作无法撤销。
                            </Text>
                          </DialogBody>
                          <DialogFooter>
                            <DialogActionTrigger asChild>
                              <Button variant="ghost" size="sm">取消</Button>
                            </DialogActionTrigger>
                            <Button colorPalette="red" size="sm" onClick={handleDelete}>
                              删除
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </DialogRoot>
                      <Icon color="fg.muted"><LuChevronRight /></Icon>
                    </HStack>
                  </Flex>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
