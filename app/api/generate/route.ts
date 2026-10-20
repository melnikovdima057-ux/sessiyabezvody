Причина ошибки: self-signed certificate in certificate chain (SELF_SIGNED_CERT_IN_CHAIN).   Серверы Сбера (GigaChat) используют сертификаты Минцифры (Russian Trusted Sub CA), которые Node.js на серверах Vercel по умолчанию считает недоверенными, из-за чего системный fetch блокирует защищённое соединение.   Чтобы отключить проверку этих сертификатов на стороне Node.js внутри функции, нужно использовать встроенный агент https с флагом rejectUnauthorized: false вместо стандартного глобального fetch.Исправление файла app/api/generate/route.tsОткрой файл app/api/generate/route.ts на GitHub и замени его содержимое на следующий код:TypeScriptimport { NextResponse } from "next/server";
import https from "https";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Агент, пропускающий самоподписанные сертификаты Минцифры
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Хелпер для запросов через https.request с поддержкой агента
function sberRequest(url: string, options: any, bodyData?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
      agent: httpsAgent,
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (e) => reject(e));

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

// Восстановление обрезанного JSON при превышении лимита токенов
function repairJsonArray(jsonString: string): any[] {
  let cleaned = jsonString.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/```\$/, "");
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

  throw new Error("Не удалось распарсить ответ нейросети в JSON");
}

async function getGigaChatToken(): Promise<string> {
  const credentials = process.env.GIGACHAT_CREDENTIALS || process.env.GIGACHAT_AUTH_KEY;
  if (!credentials) {
    throw new Error("GIGACHAT_CREDENTIALS / GIGACHAT_AUTH_KEY не задан в переменных окружения");
  }

  const response = await sberRequest(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: `rquid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        Authorization: `Basic ${credentials}`,
      },
    },
    "scope=GIGACHAT_API_PERS"
  );

  return response.access_token;
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

    const requestBody = JSON.stringify({
      model: "GigaChat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Разбери следующие вопросы:\n${questionsText}` },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const result = await sberRequest(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      },
      requestBody
    );

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
