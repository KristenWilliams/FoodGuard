import { AssistantAvatar } from "@/components/AssistantAvatar"
import { useLanguage } from "@/lib/i18n"

export function RiskBadge({ risk, size = "sm" }: { risk: "safe" | "moderate" | "caution"; size?: "sm" | "md" | "lg" }) {
  const en = useLanguage() === "en"
  return (
    <span role="img" aria-label={en ? "Ingredient attention level" : "成分关注程度"} title={risk === "caution" ? en ? "Review the specific warning" : "重点留意" : risk === "moderate" ? en ? "Consider the amount" : "适量摄入" : en ? "Review with intake in mind" : "结合摄入量判断"}>
      <AssistantAvatar size={size === "lg" ? 36 : size === "md" ? 30 : 26} mood={risk} />
    </span>
  )
}

export function RiskLevelIcon({ risk }: { risk: "safe" | "moderate" | "caution" }) {
  return <RiskBadge risk={risk} size="lg" />
}
