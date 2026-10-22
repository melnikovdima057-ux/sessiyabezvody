import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

if (typeof process !== "undefined") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function repairJsonArray(jsonString: string): any[] {
  let cleaned = jsonString.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/```$/, "");
  }
  cleaned = cleaned.trim();

  try {
    const directParsed = JSON.parse(cleaned);
    if (Array.isArray(directParsed)) return directParsed;
  } catch (e) {
    const lastObjectEnd = cleaned.lastIndexOf("}");
    if (lastObjectEnd !== -1) {
      const truncated = cleaned.slice(0, lastObjectEnd + 1).trim();
      const fixed = truncated.endsWith("]") ? truncated : truncated + "]";
      try {
        const repaired = JSON.parse(fixed);
        if (Array.isArray(repaired)) return repaired;
      } catch (err) {
        console.error("Failed to repair JSON:", err);
      }
    }
  }

  throw new Error("Не удалось распарсить ответ нейросети в формат JSON");
}

async function getGigaChatToken(): Promise<string> {
  const clientId = process.env.GIGACHAT_CLIENT_ID?.trim();
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET?.trim();
  const rawKey = (
    process.env.GIGACHAT_CREDENTIALS ||
    process.env.GIGACHAT_AUTH_KEY ||
    ""
  ).trim();

  let basicAuthValue = "";

  if (clientId && clientSecret) {
    basicAuthValue = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  } else if (rawKey) {
    let clean = rawKey.replace(/^Basic\s+/i, "").replace(/["']/g, "");
    if (clean.includes(":")) {
      basicAuthValue = Buffer.from(clean).toString("base64");
    } else {
      basicAuthValue = clean;
    }
  } else {
    throw new Error("Ключи GigaChat не заданы в Environment Variables Vercel");
  }

  const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: `rquid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Authorization: `Basic ${basicAuthValue}`,
    },
    body: "scope=GIGACHAT_API_PERS",
    cache: "no-store",
  });

  const resText = await res.text();

  if (!res.ok) {
    console.error("OAuth error response:", resText);
    throw new Error(`Сбер вернул статус ${res.status}: ${resText} | длина ключа: ${basicAuthValue.length}`);
  }

  const data = JSON.parse(resText);
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { questionsText } = await req.json();

    if (!questionsText || questionsText.trim().length === 0) {
      return NextResponse.json(
        { error: "Пустой список вопросов" },
        { status: 400 }
      );
    }

    const token = await getGigaChatToken();

    const systemPrompt = `Ты — эксперт по подготовке студентов. Сформируй предельно краткие, емкие микрошпаргалки без вводных фраз.
ФОРМАТ: Строго чистый массив JSON. Никакого Markdown, никаких комментариев вне JSON.
Пиши лаконично (до 3 предложений на ответ).

Шаблон структуры:
[
  {
    "id": "q1",
    "questionNumber": 1,
    "question": "Точный текст вопроса",
    "category": "Предмет",
    "readTimeMinutes": 1,
    "essence": ["Тезис 1", "Тезис 2"],
    "keyTerms": [
      {"term": "Термин", "definition": "Краткое определение"}
    ],
    "answerGrade5": {
      "thesis": "Главная мысль в одно предложение",
      "structure": ["Пункт 1", "Пункт 2"],
      "fullAnswer": "Краткий, структурированный ответ без воды (до 3 предложений).",
      "examinerTips": "Главная формула или лайфхак"
    }
  }
]`;

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Разбери следующие вопросы:\n${questionsText}` },
          ],
          temperature: 0.2,
          max_tokens: 3000,
        }),
      }
    );

    const resText = await response.text();

    if (!response.ok) {
      console.error("Completion error:", resText);
      throw new Error(`Сбер вернул ошибку генерации ${response.status}: ${resText}`);
    }

    const result = JSON.parse(resText);
    const rawContent = result.choices?.[0]?.message?.content || "[]";
    const parsedData = repairJsonArray(rawContent);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка генерации билетов" },
      { status: 500 }
    );
  }
}
