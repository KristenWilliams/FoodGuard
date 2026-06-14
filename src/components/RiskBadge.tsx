import { Badge } from "@chakra-ui/react"

const riskConfig = {
  safe: { colorPalette: "green" as const, label: "安全" },
  moderate: { colorPalette: "orange" as const, label: "注意" },
  caution: { colorPalette: "red" as const, label: "谨慎" },
}

export function RiskBadge({ risk, size = "sm" }: { risk: "safe" | "moderate" | "caution"; size?: "sm" | "md" | "lg" }) {
  const config = riskConfig[risk]
  return (
    <Badge colorPalette={config.colorPalette} variant="subtle" size={size}>
      {config.label}
    </Badge>
  )
}

export function RiskLevelIcon({ risk }: { risk: "safe" | "moderate" | "caution" }) {
  const config = riskConfig[risk]
  return (
    <Badge colorPalette={config.colorPalette} variant="solid" size="lg" borderRadius="full" px="3">
      {config.label}
    </Badge>
  )
}
