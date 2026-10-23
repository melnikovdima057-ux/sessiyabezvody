import { NextResponse } from "next/server";
import crypto from "crypto";

export const maxDuration = 60; // Максимальное время работы функции на Vercel

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

// Получение токена GigaChat
async function getGigaChatToken(): Promise<string | null> {
  const authKey = process.env.GIGACHAT_CREDENTIALS;
  if (!authKey) return null;

  try {
    const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
        Authorization: `Basic ${authKey}`,
      },
      body: "scope=GIGACHAT_API_PERS",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { questionsText, token } = await req.json();

    if (!questionsText || !questionsText.trim()) {
      return NextResponse.json({ error: "Текст вопросов пуст" }, { status: 400 });
    }

    const lines = questionsText
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 3);

    const isPaid = isValidToken(token);

    // Защита: без оплаты разрешено максимум 2 билета
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

    const gigachatToken = await getGigaChatToken();
    if (!gigachatToken) {
      return NextResponse.json(
        { error: "Ошибка авторизации в GigaChat API" },
        { status: 500 }
      );
    }

    const systemPrompt = `Ты — экспертный академический ассистент ExamZero для студентов.
Твоя задача — разобрать переданный список экзаменационных билетов/вопросов и составить краткие, ёмкие микрошпаргалки без воды.

СТРОГО возвращай только валидный JSON-массив без markdown-обёртки (\`\`\`json) следующей структуры:
[
  {
    "id": "уникальная_строка",
    "questionNumber": 1,
    "question": "текст вопроса",
    "category": "предмет или раздел",
    "readTimeMinutes": 1,
    "essence": [
      "ключевой тезис 1",
      "ключевой тезис 2",
      "ключевой тезис 3"
    ],
    "keyTerms": [
      { "term": "термин или формула", "definition": "краткое определение" }
    ],
    "answerGrade5": {
      "thesis": "ударная академическая формулировка сути за 1 предложение",
      "structure": ["пункт 1", "пункт 2"],
      "fullAnswer": "структурированный, четкий ответ на оценку 5 без лишней воды",
      "examinerTips": "лайфхак или подвох, на который обращает внимание экзаменатор"
    }
  }
]`;

    const userPrompt = `Разбери следующие вопросы (всего: ${questionsToProcess.length}):\n${questionsToProcess.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}`;

    const gigaRes = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${gigachatToken}`,
      },
      body: JSON.stringify({
        model: "GigaChat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!gigaRes.ok) {
      return NextResponse.json(
        { error: "Ошибка генерации от GigaChat" },
        { status: 502 }
      );
    }

    const gigaData = await gigaRes.json();
    let rawContent = gigaData.choices?.[0]?.message?.content?.trim() || "[]";

    // Очищаем от возможных markdown-тегов ```json
    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsedTickets = JSON.parse(rawContent);
    return NextResponse.json(parsedTickets);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Ошибка сервера" },
      { status: 500 }
    );
  }
}
