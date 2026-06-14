import { supabase } from "@/lib/supabase"
import type { AnalysisResult, ScanRecord } from "@/types/analysis"

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-ingredients`

export async function analyzeIngredients(imageBase64: string): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-ingredients", {
    body: { image_base64: imageBase64 },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.result as AnalysisResult
}

export async function saveScan(result: AnalysisResult, imageUrl?: string): Promise<ScanRecord> {
  const sessionId = getSessionId()
  const { data, error } = await supabase
    .from("scan_history")
    .insert({
      session_id: sessionId,
      image_url: imageUrl ?? null,
      product_name: result.product_name,
      analysis_result: result,
      safety_score: result.safety_score,
      risk_level: result.risk_level,
    })
    .select()
    .single()

  if (error) throw error
  return data as ScanRecord
}

export async function getScanHistory(limit = 20, offset = 0): Promise<ScanRecord[]> {
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data ?? []) as ScanRecord[]
}

export async function getScanById(id: string): Promise<ScanRecord | null> {
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data as ScanRecord | null
}

export async function deleteScan(id: string): Promise<void> {
  const { error } = await supabase.from("scan_history").delete().eq("id", id)
  if (error) throw error
}

function getSessionId(): string {
  let id = localStorage.getItem("foodguard_session_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("foodguard_session_id", id)
  }
  return id
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
