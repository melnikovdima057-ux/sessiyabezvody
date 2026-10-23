import { NextResponse } from "next/server";
import crypto from "crypto";

function isValidToken(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [paymentId, timestamp, clientSig] = parts;
  const paymentSecret = process.env.PAYMENT_SECRET || "default_examzero_secret";

  const expectedSig = crypto
    .createHmac("sha256", paymentSecret)
    .update(`${paymentId}:${timestamp}`)
    .digest("hex");

  return clientSig === expectedSig;
}

export async function POST(req: Request) {
  try {
    const { questionsText, token } = await req.json();

    if (!questionsText || !questionsText.trim()) {
      return NextResponse.json({ error: "Текст пуст" }, { status: 400 });
    }

    const lines = questionsText
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 3);

    const isPaid = isValidToken(token);

    // Если не оплачено, бэкенд жестко обрезает до первых 2 билетов
    let questionsToProcess = lines;
    if (!isPaid) {
      if (lines.length > 2) {
        return NextResponse.json(
          { error: "Необходима оплата для генерации более 2 билетов" },
          { status: 402 }
        );
      }
      questionsToProcess = lines.slice(0, 2);
    }
import { NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

if (typeof process !== "undefined") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Защита от случайных Markdown-ссылок [url](url) при копировании
function sanitizeUrl(rawUrl: string): string {
  const match = rawUrl.match(/https:\/\/[a-zA-Z0-9\.\:\/_-]+/);
  return match ? match[0] : rawUrl.trim();
}

// Извлечение билетов с защитой от вылетов
function extractTickets(text: string, originalQuestions: string): any[] {
  let cleaned = text.trim();

  // Срезаем Markdown кодовые блоки
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  // Экранируем слэши формул physics / LaTeX (\Delta, \nu, \frac)
  cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  // 1. Пробуем прямой JSON.parse
  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct) && direct.length > 0) return direct;
    if (direct && typeof direct === "object" && direct.question) return [direct];
  } catch (e) {}

  // 2. Поштучный сборщик объектов { ... }
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

  if (tickets.length > 0) {
    return tickets;
  }

  // 3. Безаварийный фолбэк: если нейросеть ответила простым текстом
  const rawLines = originalQuestions
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  return rawLines.map((q, idx) => ({
    id: `q${idx + 1}`,
    questionNumber: idx + 1,
    question: q.replace(/^\d+[\.\)]\s*/, ""),
    category: "Физика / Экзамен",
    readTimeMinutes: 1,
    essence: ["Краткий тезис по вопросу", "Основная физическая суть"],
    keyTerms: [{ term: "Параметр", definition: "Определение и расчетная формула" }],
    answerGrade5: {
      thesis: "Главный закон и его применимость.",
      structure: ["Определение", "Формула", "Единицы измерения"],
      fullAnswer: cleaned.slice(0, 300) || "Материал обработан.",
      examinerTips: "Обрати внимание на размерности величин в СИ.",
    },
  }));
}

async function getGigaChatToken(): Promise<string> {
  const rawKey = (
    process.env.GIGACHAT_CREDENTIALS ||
    process.env.GIGACHAT_AUTH_KEY ||
    process.env.GIGACHAT_CLIENT_SECRET ||
    ""
  ).trim();

  if (!rawKey) {
    throw new Error("GIGACHAT_CREDENTIALS не настроен в Vercel Environment Variables");
  }

  let basicAuthValue = rawKey
    .replace(/^Basic\s+/i, "")
    .replace(/["']/g, "")
    .trim();

  if (basicAuthValue.includes(":") && !/^[A-Za-z0-9+/=]+$/.test(basicAuthValue)) {
    basicAuthValue = Buffer.from(basicAuthValue).toString("base64");
  }

  const rquid = crypto.randomUUID();
  const oauthEndpoint = sanitizeUrl(
    "[https://ngw.devices.sberbank.ru:9443/api/v2/oauth](https://ngw.devices.sberbank.ru:9443/api/v2/oauth)"
  );

  const res = await fetch(oauthEndpoint, {
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
    throw new Error(`Сбер OAuth ${res.status}: ${resText}`);
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

    const systemPrompt = `Ты — преподаватель-экзаменатор. Твоя задача — составить предельно краткие микрошпаргалки по вопросам билетов.
ТРЕБОВАНИЯ:
1. Формат ответа: СТРОГО массив JSON без лишнего текста и без обёрток.
2. Формулы и численные значения пиши ТОЛЬКО простым текстом (без LaTeX и без обратных слэшей, например: 1.66 * 10^-27 кг, p = n*k*T).
3. Используй кавычки «елочки» внутри текстов, чтобы не ломать JSON.

Пример схемы:
[
  {
    "id": "q1",
    "questionNumber": 1,
    "question": "1 а.е.м",
    "category": "Физика",
    "readTimeMinutes": 1,
    "essence": ["1.66 * 10^-27 кг", "1/12 массы атома углерода C-12"],
    "keyTerms": [{"term": "а.е.м.", "definition": "Атомная единица массы = 1.66057 * 10^-27 кг"}],
    "answerGrade5": {
      "thesis": "1 а.е.м. равна 1.66 * 10^-27 кг (или 931.5 МэВ).",
      "structure": ["Определение", "Значение в кг"],
      "fullAnswer": "Атомная единица массы — внесистемная единица массы, равная 1/12 массы покоя нейтрального атома углерода 12C. Численно равна 1.6605 * 10^-27 кг.",
      "examinerTips": "Запомни: ровно 1.66 на десять в минус двадцать седьмой степени кг"
    }
  }
]`;

    const completionsEndpoint = sanitizeUrl(
      "[https://gigachat.devices.sberbank.ru/api/v1/chat/completions](https://gigachat.devices.sberbank.ru/api/v1/chat/completions)"
    );

    const response = await fetch(completionsEndpoint, {
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
          {
            role: "user",
            content: `Составь краткие шпаргалки по списку вопросов:\n${questionsText}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    const resText = await response.text();

    if (!response.ok) {
      console.error("GigaChat Completion error:", resText);
      throw new Error(`Сбер API ${response.status}: ${resText}`);
    }

    const result = JSON.parse(resText);
    const rawContent = result.choices?.[0]?.message?.content || "";
    const tickets = extractTickets(rawContent, questionsText);

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error("API /api/generate error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка генерации билетов" },
      { status: 500 }
    );
  }
}
