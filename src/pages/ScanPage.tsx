import {
  Box, VStack, HStack, Text, Button, Icon, Heading,
  Card, Spinner, Flex, Separator,
} from "@chakra-ui/react"
import { LuCamera, LuUpload, LuImage, LuX, LuScanLine } from "react-icons/lu"
import { FileUploadRoot, FileUploadDropzone } from "@/components/ui/file-upload"
import { useRef, useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { analyzeIngredients, saveScan, fileToBase64 } from "@/lib/api"
import type { AnalysisResult } from "@/types/analysis"

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
      setError("无法访问相机，请检查权限设置")
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
    setImagePreview(dataUrl)
    setImageBase64(dataUrl)
    stopCamera()
  }, [stopCamera])

  const handleFileUpload = useCallback(async (files: FileList | undefined) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const base64 = await fileToBase64(file)
    setImagePreview(base64)
    setImageBase64(base64)
  }, [])

  const clearImage = useCallback(() => {
    setImagePreview(null)
    setImageBase64(null)
    setError(null)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64) return
    setLoading(true)
    setError(null)
    try {
      const result: AnalysisResult = await analyzeIngredients(imageBase64)
      await saveScan(result)
      navigate(`/result?data=${encodeURIComponent(JSON.stringify(result))}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败，请重试")
    } finally {
      setLoading(false)
    }
  }, [imageBase64])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  return (
    <Box px="4" py="6" maxW="2xl" mx="auto">
      <VStack gap="6" align="stretch">
        <VStack gap="1" textAlign="center">
          <Heading size="lg" color="fg">扫描配料表</Heading>
          <Text color="fg.muted" fontSize="sm">拍照或上传食品配料表图片，AI将为你分析安全性</Text>
        </VStack>

        {/* Image Preview / Camera */}
        <Box
          borderRadius="xl"
          border="2px dashed"
          borderColor="border.emphasized"
          bg="bg.subtle"
          minH="280px"
          position="relative"
          overflow="hidden"
        >
          {cameraActive && !imagePreview ? (
            <VStack gap="3" p="4" align="center" justify="center" minH="280px">
              <Box
                as="video"
                ref={videoRef}
                autoPlay
                playsInline
                borderRadius="lg"
                maxH="240px"
                w="full"
                objectFit="contain"
                bg="black"
              />
              <Button colorPalette="green" onClick={capturePhoto} size="md">
                <Icon mr="2"><LuCamera /></Icon>
                拍照
              </Button>
            </VStack>
          ) : imagePreview ? (
            <Box position="relative">
              <Box
                as="img"
                src={imagePreview}
                alt="预览"
                w="full"
                maxH="400px"
                objectFit="contain"
                borderRadius="lg"
              />
              <Button
                position="absolute"
                top="2"
                right="2"
                size="sm"
                colorPalette="red"
                variant="solid"
                borderRadius="full"
                onClick={clearImage}
              >
                <Icon><LuX /></Icon>
              </Button>
            </Box>
          ) : (
            <VStack gap="4" p="6" align="center" justify="center" minH="280px">
              <Icon fontSize="5xl" color="fg.muted"><LuImage /></Icon>
              <Text color="fg.muted" fontSize="sm">请拍照或上传配料表图片</Text>
            </VStack>
          )}
        </Box>

        {/* Controls */}
        {!imagePreview && (
          <VStack gap="3">
            <HStack gap="3" w="full">
              <Button
                flex="1"
                variant="outline"
                size="lg"
                onClick={startCamera}
                disabled={cameraActive}
              >
                <Icon mr="2"><LuCamera /></Icon>
                拍照
              </Button>
              <FileUploadRoot
                accept="image/*"
                onFileChange={(e) => handleFileUpload(e.acceptedFiles)}
              >
                <FileUploadDropzone
                  label="上传图片"
                  description="支持 JPG、PNG 格式"
                  flex="1"
                  border="none"
                  bg="transparent"
                  cursor="pointer"
                  p="0"
                >
                  <Button as="span" variant="outline" size="lg" w="full">
                    <Icon mr="2"><LuUpload /></Icon>
                    上传
                  </Button>
                </FileUploadDropzone>
              </FileUploadRoot>
            </HStack>
          </VStack>
        )}

        {/* Analyze Button */}
        {imagePreview && (
          <Button
            colorPalette="green"
            size="lg"
            w="full"
            onClick={handleAnalyze}
            loading={loading}
            loadingText="AI分析中..."
            borderRadius="xl"
          >
            <Icon mr="2"><LuScanLine /></Icon>
            开始分析
          </Button>
        )}

        {loading && (
          <Card.Root>
            <Card.Body p="5">
              <VStack gap="3" align="center">
                <Spinner size="xl" color="green.500" />
                <Text fontWeight="medium" color="fg">正在分析配料表...</Text>
                <Text fontSize="sm" color="fg.muted">
                  AI正在识别成分并对比权威数据库
                </Text>
                <Separator />
                <Text fontSize="xs" color="fg.muted">
                  参考标准: GB 2760 | FDA GRAS | EFSA | WHO/JECFA
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {error && (
          <Box
            p="4"
            borderRadius="lg"
            bg="red.500/10"
            border="1px solid"
            borderColor="red.500/30"
          >
            <Text color="fg.error" fontSize="sm">{error}</Text>
          </Box>
        )}

        {/* Tips */}
        <Box bg="bg.subtle" borderRadius="lg" p="4" border="1px solid" borderColor="border.subtle">
          <VStack gap="2" align="start">
            <Text fontWeight="semibold" fontSize="sm" color="fg">扫描提示</Text>
            <Text fontSize="xs" color="fg.muted">
              1. 确保配料表文字清晰可见，避免模糊或反光
            </Text>
            <Text fontSize="xs" color="fg.muted">
              2. 尽量只拍摄配料表区域，减少无关内容
            </Text>
            <Text fontSize="xs" color="fg.muted">
              3. 结果仅供参考，具体健康建议请咨询专业人士
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}
