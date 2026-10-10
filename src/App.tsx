import { HashRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { Box, Flex, HStack, Text, Icon } from "@chakra-ui/react"
import { ColorModeButton } from "@/components/ui/color-mode"
import { LuScanLine, LuHistory, LuSettings, LuNewspaper } from "react-icons/lu"
import ScanPage from "@/pages/ScanPage"
import ResultPage from "@/pages/ResultPage"
import HistoryPage from "@/pages/HistoryPage"
import SettingsPage from "@/pages/SettingsPage"
import DiscoverPage from "@/pages/DiscoverPage"
import { PetAssistant } from "@/components/PetAssistant"
import { PageMotion } from "@/components/PageMotion"
import { useT } from "@/lib/i18n"
import { useEffect } from "react"
import { initializeCredentials } from "@/lib/credentials"
import { monitorAnalysisJobs } from "@/lib/api"

const NAV_ITEMS = [
  { labelKey: "scan" as const, icon: LuScanLine, path: "/", section: "scan" },
  { labelKey: "history" as const, icon: LuHistory, path: "/history", section: "history" },
  { labelKey: "discover" as const, icon: LuNewspaper, path: "/discover", section: "discover" },
  { labelKey: "settings" as const, icon: LuSettings, path: "/settings", section: "settings" },
]

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useT()

  return (
    <nav className="app-dock" aria-label="FoodGuard">
      {NAV_ITEMS.map((item) => <button key={item.path} className="nav-item" data-section={item.section} type="button"
        aria-current={location.pathname === item.path || (item.path === "/" && location.pathname === "/scan") ? "page" : undefined}
        onClick={() => navigate(item.path)}>
        <item.icon /><span>{t(item.labelKey)}</span>
      </button>)}
    </nav>
  )
}

function TopBar() {
  return (
    <Box as="header" className="app-header" position="sticky" top="0" zIndex="sticky">
      <div className="app-header-inner">
      <HStack gap="2">
        <Icon fontSize="xl" color="green.500">
          <LuScanLine />
        </Icon>
        <Text fontWeight="bold" fontSize="lg" color="fg">
          FoodGuard
        </Text>
      </HStack>
      <ColorModeButton />
      </div>
    </Box>
  )
}

function App() {
  useEffect(() => {
    void initializeCredentials()
    return monitorAnalysisJobs()
  }, [])
  return (
    <HashRouter>
      <Flex direction="column" minH="100dvh" className="app-shell">
        <TopBar />
        <Box as="main" className="app-main" flex="1">
          <Routes>
            <Route path="/" element={<ScanPage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/result/:id" element={<ResultPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Box>
        <PageMotion />
        <PetAssistant />
        <BottomNav />
      </Flex>
    </HashRouter>
  )
}

export default App
