import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Box, Flex, HStack, VStack, Text, Icon } from "@chakra-ui/react"
import { ColorModeButton } from "@/components/ui/color-mode"
import { LuScanLine, LuHouse, LuHistory, LuSettings } from "react-icons/lu"
import HomePage from "@/pages/HomePage"
import ScanPage from "@/pages/ScanPage"
import ResultPage from "@/pages/ResultPage"
import HistoryPage from "@/pages/HistoryPage"
import SettingsPage from "@/pages/SettingsPage"

const NAV_ITEMS = [
  { label: "首页", icon: LuHouse, path: "/" },
  { label: "扫描", icon: LuScanLine, path: "/scan" },
  { label: "历史", icon: LuHistory, path: "/history" },
  { label: "设置", icon: LuSettings, path: "/settings" },
]

function BottomNav() {
  return (
    <Box
      as="nav"
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex="sticky"
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      py="1"
      px="2"
    >
      <HStack justify="space-around" gap="1">
        {NAV_ITEMS.map((item) => (
          <Box
            key={item.path}
            as="a"
            href={item.path}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              window.history.pushState(null, "", item.path)
              window.dispatchEvent(new PopStateEvent("popstate"))
            }}
            px="3"
            py="2"
            borderRadius="md"
            _hover={{ bg: "bg.muted" }}
            transition="background 0.2s"
          >
            <VStack gap="0.5">
              <Icon fontSize="lg" color="fg.muted">
                <item.icon />
              </Icon>
              <Text fontSize="2xs" color="fg.muted" fontWeight="medium">
                {item.label}
              </Text>
            </VStack>
          </Box>
        ))}
      </HStack>
    </Box>
  )
}

function TopBar() {
  return (
    <Flex
      as="header"
      position="sticky"
      top="0"
      zIndex="sticky"
      bg="bg.panel"
      borderBottomWidth="1px"
      borderColor="border"
      px="4"
      py="2"
      align="center"
      justify="space-between"
    >
      <HStack gap="2">
        <Icon fontSize="xl" color="green.500">
          <LuScanLine />
        </Icon>
        <Text fontWeight="bold" fontSize="lg" color="fg">
          FoodGuard
        </Text>
        <Text fontSize="xs" color="fg.muted" display={{ base: "none", md: "inline" }}>
          食品安全助手
        </Text>
      </HStack>
      <ColorModeButton />
    </Flex>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Flex direction="column" minH="100vh" bg="bg">
        <TopBar />
        <Box flex="1" overflow="auto" pb="16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/result/:id" element={<ResultPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Box>
        <BottomNav />
      </Flex>
    </BrowserRouter>
  )
}

export default App
