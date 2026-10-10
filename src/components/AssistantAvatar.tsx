import { useId } from "react"
import type { CSSProperties } from "react"
import type { AnalysisResult } from "@/types/analysis"

type Expression = "smile" | "happy" | "attentive" | "alert"
type SpriteStyle = CSSProperties & { "--expression-rest": string }

function gazePosition(gaze: { x: number; y: number }) {
  if (Math.max(Math.abs(gaze.x), Math.abs(gaze.y)) < 0.1) return "0% 0%"
  if (Math.abs(gaze.x) >= Math.abs(gaze.y)) return gaze.x < 0 ? "50% 0%" : "100% 0%"
  return gaze.y < 0 ? "0% 100%" : "50% 100%"
}

export function AssistantAvatar({ size = 68, gaze, sleeping = false, mood = "safe", expression, animated = true }: {
  size?: number
  gaze?: { x: number; y: number }
  sleeping?: boolean
  mood?: AnalysisResult["risk_level"]
  expression?: Expression
  animated?: boolean
}) {
  const id = useId()
  const delay = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 53 / 10
  const useGaze = !!gaze && !sleeping
  const asset = sleeping ? "sleep" : useGaze ? "gaze" : expression ?? (mood === "caution" ? "alert" : mood === "moderate" ? "attentive" : "smile")
  const rest = useGaze ? gazePosition(gaze!) : "0% 0%"
  const style: SpriteStyle = {
    width: size, height: size, minWidth: size,
    backgroundImage: `url("${import.meta.env.BASE_URL}expressions/v2/${asset}.png")`,
    backgroundSize: useGaze ? "300% 200%" : "200% 100%",
    "--expression-rest": rest,
    animationDelay: `-${delay}s`,
  }

  return <span aria-hidden="true" data-expression={asset} className={`assistant-expression${animated ? sleeping ? " expression-sleep" : useGaze ? " expression-gaze" : " expression-blink" : ""}`} style={style} />
}
