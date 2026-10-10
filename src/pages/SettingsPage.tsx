import {
  Box, VStack, HStack, Text, Heading, Link, Input, Button, IconButton,
} from "@chakra-ui/react"
import {
  LuBookOpen, LuInfo, LuWifi, LuBot, LuSettings, LuMapPin, LuLanguages, LuFlaskConical, LuChartNoAxesCombined,
  LuKeyRound, LuLogIn, LuLogOut, LuRefreshCw, LuPlugZap, LuEye, LuEyeOff,
  LuLink, LuTrash2,
} from "react-icons/lu"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useEffect, useState } from "react"
import { clearAnalysisCache, getActiveAnalysisJob } from "@/lib/api"
import { fetchModels, loadProviderModels, loginApiKey, logoutApiKey, requireKey, selectModels, testModel, useCredentials, validateProviderConfig } from "@/lib/credentials"
import type { ModelChoices } from "@/lib/credentials"
import { NativeSelectRoot, NativeSelectField } from "@/components/ui/native-select"
import { probeNetworkReachability } from "@/lib/network"
import { readPreferences, savePreferences } from "@/lib/preferences"
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from "@/components/ui/accordion"
import type { ReachabilityStatus } from "@/lib/network"
import type { FoodGuardPreferences } from "@/lib/preferences"

const REGIONS = [
  { value: "cn", label: "中国" },
  { value: "us", label: "美国" },
  { value: "eu", label: "欧盟" },
  { value: "global", label: "全球" },
]

const AUTHORITIES = [
  { name: "GB 2760", full: "中国食品添加剂使用标准", fullEn: "China: use of food additives", region: "CN", url: "https://std.samr.gov.cn/search/std?q=GB%202760" },
  { name: "GB 2761", full: "中国食品中真菌毒素限量", fullEn: "China: maximum levels of mycotoxins in foods", region: "CN", url: "https://std.samr.gov.cn/search/std?q=GB%202761" },
  { name: "GB 2762", full: "中国食品中污染物限量", fullEn: "China: maximum levels of contaminants in foods", region: "CN", url: "https://std.samr.gov.cn/search/std?q=GB%202762" },
  { name: "GB 2763", full: "中国食品中农药最大残留限量", fullEn: "China: maximum residue limits for pesticides in foods", region: "CN", url: "https://std.samr.gov.cn/search/std?q=GB%202763" },
  { name: "GB 7718", full: "中国预包装食品标签通则", fullEn: "China: general rules for prepackaged food labels", region: "CN", url: "https://std.samr.gov.cn/" },
  { name: "中国居民膳食指南", nameEn: "China dietary guidelines", full: "中国居民膳食指南（2022）", fullEn: "Dietary Guidelines for Chinese Residents (2022)", region: "CN", url: "https://www.cnsoc.org/latesachie/" },
  { name: "中国 DRIs", nameEn: "China DRIs", full: "中国居民膳食营养素参考摄入量（2023版）", fullEn: "Chinese Dietary Reference Intakes (2023)", region: "CN", url: "https://www.cnsoc.org/latesachie/" },
  { name: "FDA", full: "U.S. Food and Drug Administration", region: "US", url: "https://www.fda.gov/" },
  { name: "GRAS", full: "FDA Generally Recognized as Safe", region: "US", url: "https://www.fda.gov/food/food-ingredients-packaging/gras" },
  { name: "DGA", full: "Dietary Guidelines for Americans 2025-2030", region: "US", url: "https://www.dietaryguidelines.gov/" },
  { name: "US DRI", full: "Dietary Reference Intakes by National Academies", region: "US", url: "https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator" },
  { name: "EFSA", full: "European Food Safety Authority", region: "EU", url: "https://www.efsa.europa.eu/" },
  { name: "E-Numbers", full: "EU Food Additives Database", region: "EU", url: "https://ec.europa.eu/food/" },
  { name: "WHO/JECFA", full: "WHO/FAO食品添加剂联合专家委员会", fullEn: "Joint FAO/WHO Expert Committee on Food Additives", region: "GLOBAL", url: "https://www.fao.org/food-safety/" },
  { name: "MHLW", full: "日本厚生劳动省", fullEn: "Japan Ministry of Health, Labour and Welfare", region: "JP", url: "https://www.mhlw.go.jp/" },
  { name: "FSANZ", full: "澳新食品标准局", fullEn: "Food Standards Australia New Zealand", region: "AU", url: "https://www.foodstandards.gov.au/" },
]

const LANGUAGES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
]

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<FoodGuardPreferences>(() => readPreferences())
  const [reachability, setReachability] = useState<ReachabilityStatus>("checking")
  const auth = useCredentials()
  const [keyInput, setKeyInput] = useState("")
  const [urlInput, setUrlInput] = useState(auth.url)
  const [draft, setDraft] = useState<{ models: string[]; choices: ModelChoices } | null>(null)
  const [jobActive, setJobActive] = useState(Boolean(getActiveAnalysisJob()))
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const isEn = preferences.language === "en"

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(name); setNotice(null)
    try {
      const result = await action()
      setNotice({ text: typeof result === "string" ? result : name === "logout" ? (isEn ? "Logged out" : "已退出") : (isEn ? "Connected" : "连接成功"), error: false })
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : (isEn ? "Connection failed" : "连接失败"), error: true }) }
    finally { setBusy(null) }
  }

  useEffect(() => {
    if (auth.ready && auth.loggedIn && !auth.models.length) {
      void fetchModels().catch(() => { /* Manual refresh remains available. */ })
    }
  }, [auth.ready, auth.loggedIn, auth.url, auth.models.length])
  useEffect(() => { setUrlInput(auth.url) }, [auth.url])
  useEffect(() => {
    const changed = () => setJobActive(Boolean(getActiveAnalysisJob()))
    window.addEventListener("foodguard:analysis-job", changed)
    return () => window.removeEventListener("foodguard:analysis-job", changed)
  }, [])

  const candidate = async () => {
    let key = keyInput.trim()
    if (!key && auth.loggedIn && urlInput.replace(/\/+$/, "") === auth.url) key = await requireKey()
    return validateProviderConfig({ key, url: urlInput })
  }

  const updatePreferences = (next: Partial<FoodGuardPreferences>) => {
    const updated = {
      ...preferences,
      ...next,
      language: next.region ? next.region === "cn" ? "zh" : "en" : next.language ?? preferences.language,
    } as FoodGuardPreferences
    setPreferences(updated)
    savePreferences(updated)
  }

  useEffect(() => {
    let active = true

    const refreshReachability = async () => {
      setReachability("checking")
      const reachable = await probeNetworkReachability()
      if (active) setReachability(reachable ? "online" : "offline")
    }

    const handleOnline = () => void refreshReachability()
    const handleOffline = () => setReachability("offline")
    void refreshReachability()
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      active = false
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <Box className="page settings-page">
      <div className="page-heading"><span className="page-symbol" aria-hidden="true"><LuSettings /></span><Heading as="h1">{isEn ? "Settings" : "设置"}</Heading></div>
      <p className="section-label">{isEn ? "PREFERENCES" : "偏好"}</p>
      <div className="settings-group">
        <div className="settings-row">
          <HStack gap="3"><LuMapPin className="tone-blue" /><Text fontSize="sm">{isEn ? "Region" : "地区"}</Text></HStack>
          <SegmentedControl value={preferences.region} onValueChange={(e) => updatePreferences({ region: e.value as FoodGuardPreferences["region"] })}
            items={isEn ? [{value:"cn",label:"China"},{value:"us",label:"US"},{value:"eu",label:"EU"},{value:"global",label:"Global"}] : REGIONS} size="sm" />
        </div>
        <div className="settings-row">
          <HStack gap="3"><LuLanguages className="tone-coral" /><Text fontSize="sm">{isEn ? "Language" : "语言"}</Text></HStack>
          <SegmentedControl value={preferences.language} onValueChange={(e) => updatePreferences({ language: e.value as FoodGuardPreferences["language"] })} items={LANGUAGES} size="sm" />
        </div>
        <div className="settings-row">
          <HStack gap="3"><LuFlaskConical className="tone-green" /><Text fontSize="sm">{isEn ? "Additive codes" : "添加剂编号"}</Text></HStack>
          <Switch aria-label={isEn ? "Additive codes" : "添加剂编号"} checked={preferences.showAdditiveCodes} onCheckedChange={(e) => updatePreferences({ showAdditiveCodes: e.checked })} colorPalette="green" />
        </div>
        <div className="settings-row">
          <HStack gap="3"><LuChartNoAxesCombined className="tone-amber" /><Text fontSize="sm">{isEn ? "Nutrition charts" : "营养图表"}</Text></HStack>
          <Switch aria-label={isEn ? "Nutrition charts" : "营养图表"} checked={preferences.showNutritionChart} onCheckedChange={(e) => updatePreferences({ showNutritionChart: e.checked })} colorPalette="blue" />
        </div>
      </div>
      <p className="section-label">{isEn ? "CONNECTION" : "连接"}</p>
      <div className="settings-group">
        <div className="settings-row">
          <HStack gap="3"><LuWifi color="#1473eb" /><Text fontSize="sm">{isEn ? "FoodGuard service" : "FoodGuard 服务"}</Text></HStack>
          <HStack gap="2"><Box w="6px" h="6px" borderRadius="full" bg={reachability === "online" ? "green.500" : reachability === "offline" ? "red.500" : "fg.muted"} />
            <Text fontSize="sm" color="fg.muted">{reachability === "online" ? (isEn ? "Connected" : "已连接") : reachability === "offline" ? (isEn ? "Disconnected" : "未连接") : (isEn ? "Checking" : "检测中")}</Text></HStack>
        </div>
        <div className="settings-row">
          <HStack gap="3"><LuBot color="#13886a" /><Text fontSize="sm">{isEn ? "AI service" : "AI 服务"}</Text></HStack>
          <Text fontSize="sm" data-testid="ai-status" color={auth.error || auth.connection === "error" ? "fg.error" : "fg.muted"}>{auth.error ? (isEn ? "Key error" : "Key 错误") : auth.connection === "available" ? (isEn ? "Connected" : "可用") : auth.connection === "offline" ? (isEn ? "Disconnected" : "未连接") : auth.connection === "error" ? (isEn ? "Test failed" : "测试失败") : auth.loggedIn ? (isEn ? "Not tested" : "待测试") : (isEn ? "Not configured" : "未配置")}</Text>
        </div>
      </div>
      <p className="section-label">{isEn ? "API CONNECTION" : "API 连接"}</p>
      <div className="settings-group" style={{ padding: "16px" }}>
        <form onSubmit={(event) => { event.preventDefault(); void run("login", async () => { await loginApiKey(await candidate(), draft?.choices); setKeyInput(""); setDraft(null); setVisible(false) }) }}>
          <label htmlFor="api-url"><HStack gap="2" mb="2"><LuLink /><Text fontSize="sm">{isEn ? "API address" : "接口地址"}</Text></HStack></label>
          <Input id="api-url" type="url" autoComplete="off" spellCheck={false} maxLength={1024} mb="4" value={urlInput} placeholder="https://api.example.com/v1"
            onChange={event => { setUrlInput(event.target.value); setDraft(null) }} />
          <label htmlFor="api-key"><HStack gap="2" mb="3"><LuKeyRound /><Text fontSize="sm">{isEn ? "API Key login" : "API Key 登录"}</Text></HStack></label>
          <HStack gap="2">
            <Input id="api-key" type={visible ? "text" : "password"} autoComplete="new-password" spellCheck={false} maxLength={512}
              value={keyInput} onChange={(event) => { setKeyInput(event.target.value); setDraft(null) }} placeholder={auth.loggedIn ? (isEn ? "New address? Enter its key" : "更换地址时填写对应 Key") : "sk-…"} minW="0" />
            <IconButton aria-label={isEn ? "Show or hide key" : "显示或隐藏 Key"} title={isEn ? "Show or hide key" : "显示或隐藏 Key"} variant="ghost" onClick={() => setVisible(!visible)}>{visible ? <LuEyeOff /> : <LuEye />}</IconButton>
          </HStack>
          <HStack mt="3" gap="3" flexWrap="wrap">
            <Button type="button" size="sm" variant="outline" loading={busy === "pull"} disabled={Boolean(busy) || !urlInput.trim()} onClick={() => void run("pull", async () => {
              const listed = await loadProviderModels(await candidate(), true); setDraft(listed)
              return isEn ? `${listed.models.length} models found` : `已获取 ${listed.models.length} 个模型`
            })}><LuRefreshCw />{isEn ? "Get models" : "拉取模型"}</Button>
            <Button type="submit" colorPalette="green" size="sm" loading={busy === "login"} disabled={Boolean(busy) || !urlInput.trim() || !keyInput.trim() && !auth.loggedIn || jobActive}><LuLogIn />{auth.loggedIn ? (isEn ? "Save & test" : "保存并测试") : (isEn ? "Log in" : "登录")}</Button>
            {auth.loggedIn && <Button size="sm" variant="ghost" disabled={Boolean(busy) || jobActive} onClick={() => void run("logout", async () => { await logoutApiKey(); setKeyInput(""); setDraft(null) })}><LuLogOut />{isEn ? "Log out" : "退出"}</Button>}
          </HStack>
        </form>
        {draft && <Box mt="4">{(["fast", "deep"] as const).map(mode => <Box key={mode} mb="3">
          <label htmlFor={`draft-${mode}`}><Text mb="2" fontSize="sm">{mode === "fast" ? (isEn ? "Quick model" : "快速模型") : (isEn ? "Detailed model" : "深度模型")}</Text></label>
          <HStack><NativeSelectRoot flex="1" minW="0" disabled={Boolean(busy)}><NativeSelectField id={`draft-${mode}`} value={draft.choices[mode]} items={draft.models}
            onChange={event => setDraft({ ...draft, choices: { ...draft.choices, [mode]: event.target.value } })} /></NativeSelectRoot>
            <IconButton size="sm" title={isEn ? "Test connection" : "测试连通性"} aria-label={isEn ? `Test draft ${mode}` : `测试待保存${mode === "fast" ? "快速" : "深度"}模型`} variant="outline" disabled={Boolean(busy)} loading={busy === `draft-${mode}`} onClick={() => void run(`draft-${mode}`, async () => {
              const result = await testModel(draft.choices[mode], await candidate()); return `${isEn ? "Text connected" : "文本连通"} · ${(result.elapsed_ms / 1000).toFixed(1)}s`
            })}><LuPlugZap /></IconButton></HStack>
        </Box>)}</Box>}
        {notice && <Text mt="3" fontSize="sm" color={notice.error ? "fg.error" : "green.600"} role={notice.error ? "alert" : "status"}>{notice.text}</Text>}
      </div>
      {auth.loggedIn && <>
        <p className="section-label">{isEn ? "MODELS" : "模型"}</p>
        <div className="settings-group" style={{ padding: "16px" }}>
          <HStack justify="space-between" mb="4"><Text fontSize="sm">{isEn ? "Available models" : "上游可用模型"}</Text>
            <IconButton size="sm" aria-label={isEn ? "Refresh models" : "刷新模型"} title={isEn ? "Refresh models" : "刷新模型"} variant="ghost" loading={busy === "models"} disabled={Boolean(busy)} onClick={() => void run("models", fetchModels)}><LuRefreshCw /></IconButton></HStack>
          {(["fast", "deep"] as const).map(mode => <Box key={mode} mb="4">
            <label htmlFor={`model-${mode}`}><Text fontSize="sm" mb="2">{mode === "fast" ? (isEn ? "Quick analysis" : "快速分析") : (isEn ? "Detailed analysis" : "深度分析")}</Text></label>
            <HStack gap="2"><NativeSelectRoot flex="1" minW="0" disabled={!auth.models.length || Boolean(busy) || jobActive}>
              <NativeSelectField id={`model-${mode}`} value={auth.choices[mode]} items={auth.models.length ? auth.models : [auth.choices[mode]]} onChange={event => selectModels({ ...auth.choices, [mode]: event.target.value })} />
            </NativeSelectRoot><IconButton size="sm" aria-label={isEn ? `Test ${mode} model` : `测试${mode === "fast" ? "快速" : "深度"}模型`} title={isEn ? "Test connection" : "测试连通性"} variant="outline" loading={busy === mode} disabled={Boolean(busy)} onClick={() => void run(mode, async () => {
              const result = await testModel(auth.choices[mode]);
              return `${isEn ? "Text connected" : "文本连通"} · ${(result.elapsed_ms / 1000).toFixed(1)}s`;
            })}><LuPlugZap /></IconButton></HStack>
          </Box>)}
        </div>
      </>}
      <p className="section-label">{isEn ? "LOCAL DATA" : "本机数据"}</p>
      <div className="settings-group"><div className="settings-row">
        <HStack gap="3"><LuTrash2 className="tone-coral" /><Text fontSize="sm">{isEn ? "Analysis cache" : "分析缓存"}</Text></HStack>
        <Button size="sm" variant="ghost" disabled={Boolean(busy) || jobActive} onClick={() => { clearAnalysisCache(); setNotice({ text: isEn ? "Cache cleared. History kept." : "缓存已清理，历史保留。", error: false }) }}>{isEn ? "Clear cache" : "清理缓存"}</Button>
      </div></div>
      <Box mt="7">
        <AccordionRoot collapsible>
          <AccordionItem value="references">
            <AccordionItemTrigger><HStack gap="3"><LuBookOpen /><Text fontSize="sm">{isEn ? "Official references" : "参考权威来源"}</Text></HStack></AccordionItemTrigger>
            <AccordionItemContent>
              <VStack gap="0" align="stretch">{AUTHORITIES.map((auth) => <Link display="block" key={auth.name} href={auth.url} target="_blank" rel="noopener noreferrer" py="3" borderBottomWidth="1px" borderColor="border">
                <HStack justify="space-between"><Text fontSize="sm" fontWeight="medium">{isEn ? auth.nameEn ?? auth.name : auth.name}</Text><Text color="fg.muted" fontSize="xs">{auth.region}</Text></HStack>
                <Text color="fg.muted" fontSize="xs" mt="1">{isEn ? auth.fullEn ?? auth.full : auth.full}</Text>
              </Link>)}</VStack>
            </AccordionItemContent>
          </AccordionItem>
          <AccordionItem value="about">
            <AccordionItemTrigger><HStack gap="3"><LuInfo /><Text fontSize="sm">{isEn ? "About FoodGuard" : "关于 FoodGuard"}</Text></HStack></AccordionItemTrigger>
            <AccordionItemContent><Text fontSize="sm" color="fg.muted">{isEn ? "Visible food ingredients and nutrition only. No brand or manufacturer ratings." : "只分析可见的食品配料和营养信息，不评价品牌、厂家或商家。"}</Text></AccordionItemContent>
          </AccordionItem>
        </AccordionRoot>
      </Box>
      <Box mt="7"><Text fontSize="xs" color="fg.muted" lineHeight="1.8">{isEn ? "AI can make mistakes. Verify the original label and official guidance. Reports are not medical advice." : "AI 可能识别错误，请以包装原文和官方标准为准。分析仅供参考，不构成医疗建议。"}</Text></Box>
    </Box>
  )
}
