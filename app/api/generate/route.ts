import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Функция восстановления незавершенного JSON при обрыве токенов
function repairJsonArray(jsonString: string): any[] {
  let cleaned = jsonString.trim();

  // Срезаем Markdown-обертки
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/```\$/, "");
  }
  cleaned = cleaned.trim();

  // Попытка прямого парсинга
  try {
    const directParsed = JSON.parse(cleaned);
    if (Array.isArray(directParsed)) return directParsed;
  } catch (e) {
    // Если упало — ищем последний полностью закрытый объект билета
    const lastObjectEnd = cleaned.lastIndexOf("}");
    if (lastObjectEnd !== -1) {
      const truncated = cleaned.slice(0, lastObjectEnd + 1).trim();
      const fixed = truncated.endsWith("]") ? truncated : truncated + "]";
      try {
        const repaired = JSON.parse(fixed);
        if (Array.isArray(repaired)) return repaired;
      } catch (err) {
        console.error("Failed to repair JSON automatically:", err);
      }
    }
  }

  throw new Error("Не удалось распарсить ответ нейросети в формат JSON");
}

async function getGigaChatToken(): Promise<string> {
  const credentials = process.env.GIGACHAT_CREDENTIALS;
  if (!credentials) {
    throw new Error("GIGACHAT_CREDENTIALS не задан в переменных окружения");
  }

  const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: `rquid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      Authorization: `Basic ${credentials}`,
    },
    body: "scope=GIGACHAT_API_PERS",
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("GigaChat OAuth error:", errText);
    throw new Error("Ошибка авторизации в GigaChat");
  }

  const data = await res.json();
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
Пиши лаконично (до 3-4 предложений на ответ), чтобы уложиться в лимит токенов.

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
      "fullAnswer": "Краткий, структурированный ответ без воды (3-4 предложения).",
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
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("GigaChat Completion error:", errorData);
      return NextResponse.json(
        { error: "Ошибка запроса к нейросети" },
        { status: 502 }
      );
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || "[]";

    // Безопасный парсинг с восстановлением незакрытых скобок
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
