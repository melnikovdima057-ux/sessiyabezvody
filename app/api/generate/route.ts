import { NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

if (typeof process !== "undefined") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function extractTicketsFromJson(text: string): any[] {
  let cleaned = text.trim();

  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  // Экранируем слэши формул, чтобы не ломать JSON.parse
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === "object") return [direct];
  } catch (e) {
    // Резервный поштучный парсинг объектов
  }

  const tickets: any[] = [];
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const candidate = cleaned.slice(startIdx, i + 1);
        try {
          const obj = JSON.parse(candidate);
          if (obj.question || obj.answerGrade5 || obj.essence) {
            tickets.push(obj);
          }
        } catch (err) {}
        startIdx = -1;
      }
    }
  }

  if (tickets.length > 0) return tickets;
  throw new Error("Не удалось извлечь билеты из ответа нейросети");
}

async function getGigaChatToken(): Promise<string> {
  const rawKey = (
    process.env.GIGACHAT_CREDENTIALS ||
    process.env.GIGACHAT_AUTH_KEY ||
    process.env.GIGACHAT_CLIENT_SECRET ||
    ""
  ).trim();

  if (!rawKey) {
    throw new Error("GIGACHAT_CREDENTIALS не задан в Environment Variables Vercel");
  }

  let basicAuthValue = rawKey
    .replace(/^Basic\s+/i, "")
    .replace(/["']/g, "")
    .trim();

  if (basicAuthValue.includes(":") && !/^[A-Za-z0-9+/=]+$/.test(basicAuthValue)) {
    basicAuthValue = Buffer.from(basicAuthValue).toString("base64");
  }

  const rquid = crypto.randomUUID();
  const oauthUrl = "[https://ngw.devices.sberbank.ru:9443/api/v2/oauth](https://ngw.devices.sberbank.ru:9443/api/v2/oauth)";

  const res = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: rquid,
      Authorization: `Basic ${basicAuthValue}`,
    },
    body: "scope=GIGACHAT_API_PERS",
    cache: "no-store",
  });

  const resText = await res.text();

  if (!res.ok) {
    console.error("OAuth error response:", resText);
    throw new Error(`Сбер вернул статус ${res.status}: ${resText}`);
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

    const systemPrompt = `Ты — эксперт-преподаватель. Составь предельно краткие шпоры по билетам.
ПРАВИЛА:
1. Вывод: строго чистый массив JSON. Никаких вводных слов и пояснений.
2. Все формулы пиши ТОЛЬКО простым текстом без LaTeX и без обратных слэшей (например: p = n*k*T, (p1*V1)/T1 = const).
3. Избегай двойных кавычек внутри текста (используй «ёлочки»).
4. На каждый вопрос: 2 тезиса в essence и 2-3 коротких предложения в fullAnswer.

Шаблон структуры:
[
  {
    "id": "q1",
    "questionNumber": 1,
    "question": "Текст вопроса",
    "category": "Физика",
    "readTimeMinutes": 1,
    "essence": ["Тезис 1", "Тезис 2"],
    "keyTerms": [
      {"term": "Термин", "definition": "Определение или числовое значение"}
    ],
    "answerGrade5": {
      "thesis": "Главная суть вопроса",
      "structure": ["Пункт 1", "Пункт 2"],
      "fullAnswer": "Четкий ответ на 5 без воды (формулы обычным текстом).",
      "examinerTips": "Главное числовое значение или формула"
    }
  }
]`;

    const completionsUrl = "[https://gigachat.devices.sberbank.ru/api/v1/chat/completions](https://gigachat.devices.sberbank.ru/api/v1/chat/completions)";

    const response = await fetch(completionsUrl, {
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
          { role: "user", content: `Разбери билеты:\n${questionsText}` },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    const resText = await response.text();

    if (!response.ok) {
      console.error("Completion error:", resText);
      throw new Error(`Ошибка генерации ${response.status}: ${resText}`);
    }

    const result = JSON.parse(resText);
    const rawContent = result.choices?.[0]?.message?.content || "[]";
    const tickets = extractTicketsFromJson(rawContent);

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка генерации билетов" },
      { status: 500 }
    );
  }
}
