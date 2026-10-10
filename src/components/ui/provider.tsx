"use client"

import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

const system = createSystem(defaultConfig, defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: { value: '"FoodGuard Kai", "Kaiti SC", KaiTi, STKaiti, serif' },
        heading: { value: '{fonts.body}' },
      },
      fontSizes: { "2xs": { value: "12px" }, xs: { value: "13px" }, sm: { value: "15px" } },
      radii: { md: { value: "8px" }, lg: { value: "8px" }, xl: { value: "8px" }, "2xl": { value: "8px" } },
      colors: { green: { 500: { value: "#0c7763" }, 600: { value: "#086452" } }, blue: { 500: { value: "#20639c" }, 600: { value: "#194f7d" } } },
    },
    semanticTokens: {
      colors: {
        bg: { DEFAULT: { value: "var(--fg-page)" }, panel: { value: "var(--fg-surface)" }, subtle: { value: "var(--fg-page)" } },
        fg: { DEFAULT: { value: "var(--fg-ink)" }, muted: { value: "var(--fg-muted)" }, subtle: { value: "var(--fg-muted)" } },
        border: { DEFAULT: { value: "var(--fg-line)" }, subtle: { value: "var(--fg-line)" } },
      },
    },
  },
}))

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
