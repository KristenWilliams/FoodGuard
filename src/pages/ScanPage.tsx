import {
  Box, HStack, Text, Button, Heading, IconButton, Spinner,
} from "@chakra-ui/react"
import { LuCamera, LuUpload, LuX, LuScanLine, LuSparkles } from "react-icons/lu"
import { useLanguage } from "@/lib/i18n"
import { useRef, useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fileToBase64, getActiveAnalysisJob, getAnalysisJob, getScanDraft, setScanDraft, startAnalysisJob } from "@/lib/api"
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger } from "@/components/ui/dialog"
import { useCredentials } from "@/lib/credentials"
import type { AnalysisJob, AnalysisMode, DemoAnalysisKey } from "@/lib/api"

const MAX_CAPTURE_EDGE = 1920
const CAPTURE_QUALITY = 0.88

const DEMO_IMAGES: Array<{
  key?: DemoAnalysisKey
  title: string
  description: string
  src: string
}> = [
  { title: "软糖标签", description: "Gummy label", src: "/demo/gummy-label-demo.png" },
  {
    key: "instant-noodle",
    title: "方便面配料表",
    description: "配料表较长，适合测试添加剂和高钠提示",
    src: "/demo/instant-noodle-ingredients.png",
  },
  {
    key: "soy-sauce",
    title: "酱油配料表",
    description: "调味品配料，适合测试高钠和防腐剂提示",
    src: "/demo/soy-sauce-ingredients.png",
  },
]

export default function ScanPage() {
  const isEn = useLanguage() === "en"
  const auth = useCredentials()
  const [imagePreview, setImagePreview] = useState<string | null>(() => getScanDraft()?.image || null)
  const [imageBase64, setImageBase64] = useState<string | null>(() => getScanDraft()?.image || null)
  const [demoKey, setDemoKey] = useState<DemoAnalysisKey | undefined>(() => getScanDraft()?.demo)
  const [freshMode, setFreshMode] = useState<AnalysisMode | null>(null)
  const [loadingMode, setLoadingMode] = useState<AnalysisMode | null>(() => getActiveAnalysisJob()?.mode || null)
  const [activeJobId, setActiveJobId] = useState<string | null>(() => getActiveAnalysisJob()?.id || null)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const navigate = useNavigate()
  const loading = loadingMode !== null
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)
    } catch {
      setError(isEn ? "Camera unavailable. Check camera permission." : "无法访问相机，请检查权限设置")
    }
  }, [isEn])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return
    const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(
      videoRef.current.videoWidth,
      videoRef.current.videoHeight,
    ))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(videoRef.current.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(videoRef.current.videoHeight * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", CAPTURE_QUALITY)
    setImagePreview(dataUrl)
    setImageBase64(dataUrl)
    setDemoKey(undefined)
    setScanDraft({ image: dataUrl })
    stopCamera()
  }, [stopCamera])

  const handleFileUpload = useCallback(async (files: FileList | undefined) => {
    if (!files || files.length === 0) return
    try {
      const file = files[0]
      const base64 = await fileToBase64(file)
      setImagePreview(base64)
      setImageBase64(base64)
      setDemoKey(undefined)
      setScanDraft({ image: base64 })
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : isEn ? "Upload failed." : "图片上传失败")
    }
  }, [isEn])

  const loadDemoImage = useCallback(async (demo: (typeof DEMO_IMAGES)[number]) => {
    setError(null)
    stopCamera()
    try {
    const response = await fetch(demo.src)
    if (!response.ok) throw new Error(isEn ? "Could not load the sample." : "样品图片加载失败")
    const blob = await response.blob()
    const file = new File([blob], `${demo.key}.png`, { type: blob.type || "image/png" })
    const base64 = await fileToBase64(file)
    setImagePreview(base64)
    setImageBase64(base64)
    setDemoKey(demo.key)
    setScanDraft({ image: base64, demo: demo.key })
    } catch (error) {
      setError(error instanceof Error ? error.message : "样品图片加载失败")
    }
  }, [stopCamera, isEn])

  const clearImage = useCallback(() => {
    setImagePreview(null)
    setImageBase64(null)
    setDemoKey(undefined)
    setScanDraft(null)
    setError(null)
  }, [])

  const handleAnalyze = useCallback(async (analysisMode: AnalysisMode, refresh = false) => {
    if (!imageBase64) return
    if (!auth.loggedIn || auth.error) { navigate("/settings"); return }
    setLoadingMode(analysisMode)
    setError(null)
    const job = startAnalysisJob(imageBase64, demoKey, analysisMode, refresh)
    setActiveJobId(job.id)
  }, [imageBase64, demoKey, auth.loggedIn, auth.error, navigate])

  useEffect(() => {
    const recover = (event: Event) => {
      const job = (event as CustomEvent<AnalysisJob>).detail
      if (job.status === "running") { setActiveJobId(job.id); setLoadingMode(job.mode) }
    }
    window.addEventListener("foodguard:analysis-job", recover)
    return () => window.removeEventListener("foodguard:analysis-job", recover)
  }, [])

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraActive])

  useEffect(() => {
    if (!activeJobId) return
    const handleJob = (event: Event) => {
      const job = (event as CustomEvent<AnalysisJob>).detail
      if (job.id !== activeJobId) return
      if (job.status === "completed") {
        setLoadingMode(null)
        setActiveJobId(null)
        navigate(job.record ? `/result/${job.record.id}` : `/result?data=${encodeURIComponent(JSON.stringify(job.result))}`)
      }
      if (job.status === "failed") {
        setLoadingMode(null)
        setActiveJobId(null)
        setError(job.error ?? "分析失败，请重试")
      }
    }
    window.addEventListener("foodguard:analysis-job", handleJob)
    const existing = getAnalysisJob(activeJobId)
    if (existing && existing.status !== "running") {
      handleJob(new CustomEvent("foodguard:analysis-job", { detail: existing }))
    }
    return () => window.removeEventListener("foodguard:analysis-job", handleJob)
  }, [activeJobId, navigate])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  return (
    <Box className="page scan-page">
      <div className="page-heading">
        <span className="page-symbol" aria-hidden="true"><LuScanLine /></span>
        <div>
          <Heading as="h1">{isEn ? "Scan a food label" : "扫描配料表"}</Heading>
          <p className="page-subtitle">{isEn ? "Ingredients, nutrition, and what to look for." : "看懂成分、营养与需要留意的细节"}</p>
        </div>
      </div>
      <div className="scan-layout">
        <div className={`scan-frame${loading ? " is-analyzing" : ""}`}>
          {loading && <span className="scan-sweep" aria-hidden="true" />}
          {cameraActive && !imagePreview ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="scan-preview" />
              <Button position="absolute" bottom="4" colorPalette="green" onClick={capturePhoto}><LuCamera />{isEn ? "Capture" : "拍照"}</Button>
            </>
          ) : imagePreview ? (
            <>
              <img src={imagePreview} alt={isEn ? "Selected food label" : "食品标签预览"} className="scan-preview" />
              <IconButton aria-label={isEn ? "Remove image" : "移除图片"} title={isEn ? "Remove image" : "移除图片"}
                position="absolute" top="3" right="3" size="sm" variant="solid" bg="bg.panel" color="fg" zIndex="2" onClick={clearImage} disabled={loading}><LuX /></IconButton>
            </>
          ) : (
            <div className="scan-empty">
              <LuScanLine />
              <Text fontWeight="medium" color="fg">{isEn ? "Food ingredient label" : "食品配料或营养标签"}</Text>
              <Text fontSize="xs">{isEn ? "JPG · PNG · WebP / up to 20 MB" : "JPG · PNG · WebP / 最大 20 MB"}</Text>
            </div>
          )}
        </div>
        <div>
          {auth.ready && (!auth.loggedIn || auth.error) && <HStack mb="4" justify="space-between" flexWrap="wrap"><Text fontSize="sm" color="fg.muted">{isEn ? "Log in with your API Key to analyze." : "使用自己的 API Key 登录后即可分析"}</Text><Button size="sm" variant="outline" onClick={() => navigate("/settings")}>{isEn ? "Log in" : "去登录"}</Button></HStack>}
          <div className="scan-actions">
            {imagePreview ? (
              <>
                <Button colorPalette="green" size="lg" h="48px" onClick={() => handleAnalyze("fast")}
                  loading={loadingMode === "fast"} loadingText={isEn ? "Analyzing…" : "快速分析中…"} disabled={loading}>
                  <LuScanLine />{isEn ? "Quick analysis" : "快速分析"}
                </Button>
                <Button colorPalette="blue" variant="outline" size="lg" h="48px" onClick={() => handleAnalyze("deep")}
                  loading={loadingMode === "deep"} loadingText={isEn ? "Analyzing…" : "深度分析中…"} disabled={loading}>
                  <LuSparkles />{isEn ? "Detailed analysis" : "深度分析"}
                </Button>
              </>
            ) : (
              <HStack gap="12px">
                <Button flex="1" colorPalette="green" size="lg" onClick={startCamera} disabled={cameraActive}><LuCamera />{isEn ? "Camera" : "拍照"}</Button>
                <Button flex="1" colorPalette="blue" variant="outline" bg="bg.panel" size="lg" onClick={() => fileInputRef.current?.click()}><LuUpload />{isEn ? "Upload" : "上传图片"}</Button>
              </HStack>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
              onChange={(event) => { void handleFileUpload(event.target.files ?? undefined); event.target.value = "" }} />
          </div>
          {imagePreview && !loading && <HStack mt="3" justify="flex-end" flexWrap="wrap">
            <Button size="xs" variant="ghost" onClick={() => setFreshMode("fast")}>{isEn ? "Fresh quick analysis" : "重新快速分析"}</Button>
            <Button size="xs" variant="ghost" onClick={() => setFreshMode("deep")}>{isEn ? "Fresh detailed analysis" : "重新深度分析"}</Button>
          </HStack>}
          <DialogRoot open={freshMode !== null} onOpenChange={event => { if (!event.open) setFreshMode(null) }}>
            <DialogContent><DialogHeader><DialogTitle>{isEn ? "Analyze again?" : "重新分析？"}</DialogTitle></DialogHeader><DialogCloseTrigger />
              <DialogBody><Text fontSize="sm">{isEn ? "This skips the saved cache and sends a new request. Your API provider may charge for it." : "将忽略缓存并发送新的分析请求，上游可能再次计费。"}</Text></DialogBody>
              <DialogFooter><DialogActionTrigger asChild><Button size="sm" variant="ghost">{isEn ? "Cancel" : "取消"}</Button></DialogActionTrigger>
                <Button size="sm" colorPalette="green" onClick={() => { const mode = freshMode; setFreshMode(null); if (mode) void handleAnalyze(mode, true) }}>{isEn ? "Analyze again" : "重新分析"}</Button></DialogFooter>
            </DialogContent>
          </DialogRoot>
          {loading && <HStack mt="5" p="4" bg="bg.panel" borderRadius="md" role="status">
            <Spinner color="green.500" size="sm" /><Text fontSize="sm" color="fg.muted">{isEn ? "Your report will be saved to History." : "正在识别标签，完成后自动存入历史"}</Text>
          </HStack>}
          {error && <Box mt="4" p="4" borderRadius="md" bg="red.500/10" role="alert"><Text color="fg.error" fontSize="sm">{error}</Text></Box>}
          {!loading && <>
            <p className="section-label">{isEn ? "SAMPLE LABELS" : "试试样品"}</p>
            <div className="sample-list">
              {DEMO_IMAGES.map((demo, i) => <button key={demo.src} type="button" className="sample-button" data-reveal onClick={() => void loadDemoImage(demo)}>
                <img src={demo.src} alt="" /><span>{isEn ? ["Gummies", "Noodles", "Soy sauce"][i] : demo.title.replace("配料表", "")}</span>
              </button>)}
            </div>
          </>}
          <Box mt="6" pt="4" borderTopWidth="1px" borderColor="border">
            <p className="quiet-note">{isEn ? "Food labels only. Keep text clear; avoid glare." : "仅分析食品标签。文字清晰、避免反光。"}</p>
            <p className="quiet-note">{isEn ? "AI may make mistakes. Check the original label." : "AI 可能识别错误，请核对包装原文。"}</p>
          </Box>
        </div>
      </div>
    </Box>
  )
}
