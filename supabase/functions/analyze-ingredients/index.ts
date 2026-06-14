import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a food safety analysis AI. You analyze ingredient lists from food product photos and provide detailed safety assessments.

Your analysis MUST be based on authoritative regulatory sources including:
- China GB 2760 (食品添加剂使用标准) and GB 7718 (预包装食品标签通则)
- China NMPA (国家食品药品监督管理总局)
- US FDA (Food and Drug Administration) and GRAS list
- EU EFSA (European Food Safety Authority) and E-number regulations
- WHO/FAO JECFA (Joint Expert Committee on Food Additives)
- USDA FoodData Central
- Japan MHLW (厚生劳动省)
- Australia FSANZ (Food Standards Australia New Zealand)
- Top journals: The Lancet, Science, Nature Food, Food and Chemical Toxicology

You MUST respond with valid JSON in this exact format:
{
  "product_name": "detected product name or null",
  "ingredients": [
    {
      "name": "ingredient name",
      "name_en": "English name if different",
      "category": "主料|辅料|添加剂|防腐剂|色素|甜味剂|增味剂|抗氧化剂|乳化剂|增稠剂|其他",
      "risk_level": "safe|moderate|caution",
      "risk_reason": "brief explanation of risk if not safe",
      "additive_code": "E-number or INS code if applicable, or null",
      "daily_intake_limit": "ADI value from JECFA or null",
      "description": "brief nutritional or safety note"
    }
  ],
  "nutrition": {
    "calories": { "value": 0, "unit": "kcal/100g", "daily_pct": 0 },
    "protein": { "value": 0, "unit": "g/100g", "daily_pct": 0 },
    "fat": { "value": 0, "unit": "g/100g", "daily_pct": 0 },
    "carbs": { "value": 0, "unit": "g/100g", "daily_pct": 0 },
    "sodium": { "value": 0, "unit": "mg/100g", "daily_pct": 0 },
    "sugar": { "value": 0, "unit": "g/100g", "daily_pct": 0 },
    "fiber": { "value": 0, "unit": "g/100g", "daily_pct": 0 }
  },
  "safety_score": 0-100,
  "risk_level": "safe|moderate|caution",
  "risk_alerts": [
    {
      "level": "info|warning|danger",
      "title": "alert title",
      "description": "detailed alert",
      "ingredients": ["related ingredient names"]
    }
  ],
  "references": [
    {
      "source": "source short name (e.g., GB 2760, FDA, EFSA, WHO/JECFA)",
      "source_full": "full source name",
      "region": "CN|US|EU|GLOBAL|JP|AU",
      "url": "source URL if available",
      "citation": "specific reference or standard number"
    }
  ],
  "overall_assessment": "2-3 sentence summary in Chinese and English"
}

Rules:
1. Every claim must reference an authoritative source
2. Additive codes (E-numbers, INS codes) must be accurate per official databases
3. ADI values should come from JECFA or regional authorities
4. Risk levels: safe=无风险, moderate=需注意摄入量, caution=建议避免或限制
5. Safety score: 80-100=safe, 50-79=moderate, 0-49=caution
6. All nutritional daily_pct values are percentage of recommended daily intake
7. Provide at least 3 references from different authoritative sources
8. Always include both Chinese and English in overall_assessment`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image_base64, image_url } = await req.json();

    const messages: Array<{
      role: string;
      content: string | Array<Record<string, unknown>>;
    }> = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "请分析这张食品配料表图片，识别所有成分并给出食品安全评估。请严格按照JSON格式返回结果。",
          },
          ...(image_base64
            ? [
                {
                  type: "image_url",
                  image_url: {
                    url: image_base64.startsWith("data:")
                      ? image_base64
                      : `data:image/jpeg;base64,${image_base64}`,
                  },
                },
              ]
            : image_url
              ? [
                  {
                    type: "image_url",
                    image_url: { url: image_url },
                  },
                ]
              : []),
        ],
      },
    ];

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      // Return demo data when no API key is configured
      const demoResult = {
        product_name: "示例产品（演示模式）",
        ingredients: [
          {
            name: "小麦粉",
            name_en: "Wheat Flour",
            category: "主料",
            risk_level: "safe",
            risk_reason: null,
            additive_code: null,
            daily_intake_limit: null,
            description: "主要碳水化合物来源，含麸质",
          },
          {
            name: "白砂糖",
            name_en: "Sugar",
            category: "辅料",
            risk_level: "moderate",
            risk_reason: "高糖摄入增加肥胖和糖尿病风险",
            additive_code: null,
            daily_intake_limit: "WHO建议<25g/天",
            description: "添加糖，WHO建议限制摄入",
          },
          {
            name: "山梨酸钾",
            name_en: "Potassium Sorbate",
            category: "防腐剂",
            risk_level: "safe",
            risk_reason: null,
            additive_code: "E202",
            daily_intake_limit: "ADI: 25mg/kg bw (JECFA)",
            description: "常用防腐剂，在限量内安全",
          },
          {
            name: "柠檬黄",
            name_en: "Tartrazine",
            category: "色素",
            risk_level: "moderate",
            risk_reason: "可能引起过敏反应，儿童多动症关联研究",
            additive_code: "E102",
            daily_intake_limit: "ADI: 7.5mg/kg bw (JECFA)",
            description: "人工合成色素，欧盟要求含此色素的食品标注可能对儿童活动和注意力有不良影响",
          },
          {
            name: "味精",
            name_en: "Monosodium Glutamate (MSG)",
            category: "增味剂",
            risk_level: "safe",
            risk_reason: null,
            additive_code: "E621",
            daily_intake_limit: "ADI: 不限定 (JECFA)",
            description: "增味剂，JECFA评估为安全，不需限定ADI",
          },
          {
            name: "脱氢醋酸钠",
            name_en: "Sodium Dehydroacetate",
            category: "防腐剂",
            risk_level: "caution",
            risk_reason: "GB2760严格限制使用范围和最大用量",
            additive_code: "E266",
            daily_intake_limit: "GB2760: 最大0.5g/kg",
            description: "中国GB2760限制使用的防腐剂，部分食品类别不允许添加",
          },
        ],
        nutrition: {
          calories: { value: 350, unit: "kcal/100g", daily_pct: 17 },
          protein: { value: 8, unit: "g/100g", daily_pct: 16 },
          fat: { value: 12, unit: "g/100g", daily_pct: 18 },
          carbs: { value: 55, unit: "g/100g", daily_pct: 20 },
          sodium: { value: 480, unit: "mg/100g", daily_pct: 24 },
          sugar: { value: 18, unit: "g/100g", daily_pct: 36 },
          fiber: { value: 2, unit: "g/100g", daily_pct: 8 },
        },
        safety_score: 62,
        risk_level: "moderate",
        risk_alerts: [
          {
            level: "warning",
            title: "高含糖量",
            description:
              "每100g含糖18g，占WHO建议每日摄入量的36%。长期高糖摄入增加肥胖、2型糖尿病和心血管疾病风险。",
            ingredients: ["白砂糖"],
          },
          {
            level: "warning",
            title: "人工色素警示",
            description:
              "含柠檬黄(E102)，欧盟法规要求标注可能对儿童活动和注意力产生不良影响。南安普顿研究(Southampton Study)表明部分人工色素与儿童多动症相关。",
            ingredients: ["柠檬黄"],
          },
          {
            level: "danger",
            title: "限制性防腐剂",
            description:
              "脱氢醋酸钠(E266)在中国GB2760中属于严格限制使用的防腐剂，仅允许在特定食品类别中使用，且最大使用量为0.5g/kg。",
            ingredients: ["脱氢醋酸钠"],
          },
          {
            level: "info",
            title: "高钠含量",
            description:
              "每100g含钠480mg，占WHO建议每日摄入量(2000mg)的24%。",
            ingredients: [],
          },
        ],
        references: [
          {
            source: "GB 2760",
            source_full: "中国食品安全国家标准 食品添加剂使用标准",
            region: "CN",
            url: "https://std.samr.gov.cn/",
            citation: "GB 2760-2014",
          },
          {
            source: "FDA",
            source_full: "U.S. Food and Drug Administration",
            region: "US",
            url: "https://www.fda.gov/",
            citation: "21 CFR 172.185 (Tartrazine)",
          },
          {
            source: "JECFA",
            source_full:
              "WHO/FAO Joint Expert Committee on Food Additives",
            region: "GLOBAL",
            url: "https://www.fao.org/food-safety/",
            citation: "JECFA Monographs on Food Additives",
          },
          {
            source: "EFSA",
            source_full: "European Food Safety Authority",
            region: "EU",
            url: "https://www.efsa.europa.eu/",
            citation:
              "EU Regulation 1333/2008, Southampton Study (McCann et al., 2007)",
          },
          {
            source: "WHO",
            source_full: "World Health Organization",
            region: "GLOBAL",
            url: "https://www.who.int/",
            citation: "WHO Guideline: Sugars intake for adults and children (2015)",
          },
          {
            source: "Lancet",
            source_full: "The Lancet",
            region: "GLOBAL",
            url: "https://www.thelancet.com/",
            citation:
              "Lancet 2019; 393: 447-92 (Global burden of diet-related disease)",
          },
        ],
        overall_assessment:
          "该产品含有人工色素和限制性防腐剂，需注意适量食用。柠檬黄(E102)在欧盟有儿童健康警示，脱氢醋酸钠(E266)在中国GB2760中严格限制使用范围。建议儿童及敏感人群谨慎选择。This product contains artificial colors and restricted preservatives. Tartrazine (E102) carries EU health warnings for children. Sodium Dehydroacetate (E266) has strict usage limits under China GB 2760.",
      };

      return new Response(JSON.stringify({ result: demoResult }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
