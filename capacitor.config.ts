import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.foodguard.app",
  appName: "FoodGuard",
  webDir: "dist",
  loggingBehavior: "none",
  android: {
    allowMixedContent: process.env.VITE_FOODGUARD_API_URL?.startsWith("http://") ?? false,
  },
}

export default config
