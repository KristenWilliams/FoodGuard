import { Box, Button, HStack, Input, Text, VStack, IconButton, Spinner } from "@chakra-ui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { LuHistory, LuMessageCircle, LuSend, LuWifi, LuX, LuChevronRight } from "react-icons/lu"
import { chatWithAssistant, getScanById } from "@/lib/api"
import { AssistantAvatar } from "@/components/AssistantAvatar"
import { useLanguage } from "@/lib/i18n"
import { probeNetworkReachability } from "@/lib/network"
import type { AnalysisResult } from "@/types/analysis"
import type { AssistantMessage } from "@/lib/api"


async function resolveCurrentResult(pathname: string, search: string): Promise<AnalysisResult | null> {
  const params = new URLSearchParams(search)
  const data = params.get("data")
  if (data) {
    try {
      return JSON.parse(data) as AnalysisResult
    } catch {
      return null
    }
  }

  const match = pathname.match(/^\/result\/([^/]+)$/)
  if (!match) return null
  const scan = await getScanById(match[1])
  return scan?.analysis_result ?? null
}

export function PetAssistant() {
  const navigate = useNavigate()
  const location = useLocation()
  const isEn = useLanguage() === "en"
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [sending, setSending] = useState(false)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const [sleeping, setSleeping] = useState(false)
  const idleTimer = useRef<number | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const conversationEpoch = useRef(0)

  const wake = useCallback(() => {
    setSleeping(false)
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setSleeping(true), 18_000)
  }, [])

  useEffect(() => {
    let frame = 0
    const move = (event: PointerEvent) => {
      wake()
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = buttonRef.current?.getBoundingClientRect()
        if (rect) setGaze({
          x: Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / 150)),
          y: Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / 150)),
        })
      })
    }
    wake()
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", wake, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      if (idleTimer.current) window.clearTimeout(idleTimer.current)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", wake)
    }
  }, [wake])

  useEffect(() => {
    if (messageRef.current) messageRef.current.scrollTop = messageRef.current.scrollHeight
  }, [messages, open])
  useEffect(() => {
    const clear = () => { conversationEpoch.current++; setMessages([]); setInput(""); setOpen(false) }
    window.addEventListener("foodguard:logout", clear)
    window.addEventListener("foodguard:provider-changed", clear)
    return () => { window.removeEventListener("foodguard:logout", clear); window.removeEventListener("foodguard:provider-changed", clear) }
  }, [])

  const goHistory = useCallback(() => {
    navigate("/history")
    setOpen(false)
    wake()
  }, [navigate, wake])

  const send = useCallback(async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || busyRef.current) return
    busyRef.current = true
    setSending(true)
    setInput("")
    setOpen(true)
    wake()
    const epoch = conversationEpoch.current
    const nextMessages: AssistantMessage[] = [...messages.slice(-15), { role: "user", content: text }]
    setMessages(nextMessages)
    try {
      const currentResult = await resolveCurrentResult(location.pathname, location.search)
      const answer = await chatWithAssistant(text, messages, currentResult)
      if (epoch === conversationEpoch.current) setMessages([...nextMessages, { role: "assistant", content: answer.reply, history: answer.history }])
    } catch (error) {
      if (epoch === conversationEpoch.current) setMessages([...nextMessages, { role: "assistant", content: error instanceof Error ? error.message : (isEn ? "Assistant unavailable." : "小助理暂时不可用。") }])
    } finally {
      busyRef.current = false
      setSending(false)
    }
  }, [input, isEn, location.pathname, location.search, messages, wake])

  const checkNetwork = useCallback(async () => {
    const reachable = await probeNetworkReachability(2500)
    setMessages((prev) => [...prev, { role: "assistant", content: reachable ? (isEn ? "Network connected." : "网络已连接。") : (isEn ? "Offline. Your history is still available." : "网络未连接，仍可查看本机历史。") }])
  }, [isEn])

  return <div className="assistant-anchor">
    {open && <Box className="assistant-panel" mb="2" p="4" role="dialog" aria-label={isEn ? "FoodGuard assistant" : "FoodGuard 小助理"}>
      <HStack justify="space-between" mb="3">
        <Text fontWeight="semibold" fontSize="sm">{isEn ? "FoodGuard assistant" : "FoodGuard 小助理"}</Text>
        <IconButton aria-label={isEn ? "Close assistant" : "关闭小助理"} title={isEn ? "Close" : "关闭"} size="xs" variant="ghost" onClick={() => setOpen(false)}><LuX /></IconButton>
      </HStack>
      <VStack ref={messageRef} gap="3" align="stretch" maxH="230px" overflowY="auto" aria-live="polite">
        {messages.length === 0 && <Text fontSize="sm" color="fg.muted" lineHeight="1.8">{isEn ? "Ask about your labels, reports, or FoodGuard history." : "配料看不懂？我可以解读这份报告，也能帮你找自己的历史记录。"}</Text>}
        {messages.slice(-8).map((message, index) => <Box key={index} alignSelf={message.role === "user" ? "flex-end" : "flex-start"}
          maxW="95%" px="3" py="2" borderRadius="md" bg={message.role === "user" ? "green.500/12" : "bg.subtle"}>
          <Text fontSize="sm" lineHeight="1.8" overflowWrap="anywhere">{message.content}</Text>
          {message.history?.map(record => <Button key={record.id} data-testid="assistant-history-link" variant="ghost" size="sm" justifyContent="space-between" w="full" h="auto" py="2" mt="2" whiteSpace="normal" textAlign="left" onClick={async () => {
            try {
              if (await getScanById(record.id)) { navigate(`/result/${record.id}`); setOpen(false) }
              else setMessages(prev => [...prev.slice(-15), { role: "assistant", content: isEn ? "This local report was deleted." : "这份本机报告已删除。" }])
            } catch {
              setMessages(prev => [...prev.slice(-15), { role: "assistant", content: isEn ? "Could not open this local report." : "这份本机报告暂时无法打开。" }])
            }
          }}><LuHistory /><Text flex="1" fontSize="xs" overflowWrap="anywhere">{record.label}</Text><LuChevronRight /></Button>)}
        </Box>)}
        {sending && <HStack color="fg.muted"><Spinner size="xs" /><Text fontSize="xs">{isEn ? "Checking your report…" : "正在查看你的报告…"}</Text></HStack>}
      </VStack>
      <HStack gap="2" mt="4">
        <Input size="sm" aria-label={isEn ? "Message assistant" : "向小助理提问"} value={input} onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) void send() }}
          placeholder={isEn ? "Ask about this app" : "问配料、报告或历史"} />
        <IconButton aria-label={isEn ? "Send message" : "发送消息"} title={isEn ? "Send" : "发送"} size="sm" colorPalette="green" disabled={sending || !input.trim()} onClick={() => void send()}><LuSend /></IconButton>
      </HStack>
      <HStack gap="2" mt="3" flexWrap="wrap">
        <Button size="xs" variant="ghost" onClick={goHistory}><LuHistory />{isEn ? "History" : "历史"}</Button>
        <Button size="xs" variant="ghost" disabled={sending} onClick={() => void send(isEn ? "Explain the current report." : "帮我解读当前报告。")}><LuMessageCircle />{isEn ? "Explain" : "解读"}</Button>
        <IconButton aria-label={isEn ? "Check network" : "检查网络"} title={isEn ? "Network" : "网络"} size="xs" variant="ghost" onClick={checkNetwork}><LuWifi /></IconButton>
      </HStack>
    </Box>}
    <IconButton ref={buttonRef} aria-label={isEn ? "Open FoodGuard assistant" : "打开 FoodGuard 小助理"} aria-expanded={open}
      onClick={() => { setOpen((value) => !value); wake() }} w="50px" h="50px" p="0" float="right"
      borderRadius="full" bg="transparent" color="currentColor" shadow="none" _hover={{ bg: "transparent" }}>
      <span className={sleeping ? undefined : "assistant-float"}><AssistantAvatar size={50} gaze={gaze} sleeping={sleeping} animated /></span>
    </IconButton>
  </div>
}
