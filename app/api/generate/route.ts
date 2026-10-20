import { NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function getGigaChatToken(authKey: string): Promise<string> {
  const cleanKey = authKey.replace(/^Basic\s+/i, "").trim();
  const rqUID = crypto.randomUUID();

  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: rqUID,
      Authorization: `Basic ${cleanKey}`,
    },
    body: "scope=GIGACHAT_API_PERS",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ошибка OAuth Сбера (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { questionsText } = await req.json();

    if (!questionsText || typeof questionsText !== "string") {
      return NextResponse.json(
        { error: "Список вопросов пуст" },
        { status: 400 }
      );
    }

    const authKey = process.env.GIGACHAT_AUTH_KEY;
    if (!authKey) {
      return NextResponse.json(
        { error: "Не задан GIGACHAT_AUTH_KEY" },
        { status: 500 }
      );
    }

    const accessToken = await getGigaChatToken(authKey);

    const systemPrompt = `Ты — профессор университета. Твоя задача — написать реальные, подробные и точные академические ответы на экзаменационные вопросы студента.
ЗАПРЕЩЕНО писать заглушки вроде "Термин 1", "Определение термина" или "Развернутый ответ". Заполняй все поля настоящими фактами, определениями и теорией по теме каждого вопроса!

Верни ответ СТРОГО в формате JSON-массива объектов.
Схема каждого объекта в массиве:
{
  "id": "уникальная строка, например q-1",
  "questionNumber": число (порядковый номер вопроса),
  "question": "точный текст вопроса пользователя",
  "category": "название предмета по смыслу вопроса",
  "readTimeMinutes": число от 2 до 5,
  "essence": [
    "первый главный факт или формула по теме вопроса",
    "второй ключевой принцип работы или классификация",
    "третий важный тезис без воды"
  ],
  "keyTerms": [
    {
      "term": "настоящий научный термин из этого вопроса",
      "definition": "четкое словарное определение этого термина"
    },
    {
      "term": "второй важный термин по теме",
      "definition": "четкое словарное определение второго термина"
    }
  ],
  "answerGrade5": {
    "thesis": "сильная вступительная фраза, с которой нужно начать ответ перед преподавателем",
    "structure": ["1. Пункт плана", "2. Пункт плана", "3. Пункт плана"],
    "fullAnswer": "подробный, связный теоретический ответ на 5-7 предложений с объяснением сути, механизмов работы и примерами",
    "examinerTips": "хитрый вопрос, который может задать преподаватель по этой теме, и краткий ответ на него"
  }
}`;

    const userPrompt = `Разбери следующие экзаменационные вопросы и напиши полные ответы по каждому из них в формате JSON-массива:\n\n${questionsText}`;

    const chatResponse = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
        }),
      }
    );

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`Ошибка GigaChat (${chatResponse.status}): ${errorText}`);
    }

    const chatData = await chatResponse.json();
    const rawContent = chatData.choices?.[0]?.message?.content || "[]";

    // Извлекаем чистый JSON-массив или объект из ответа
    const jsonMatch = rawContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    const jsonString = jsonMatch ? jsonMatch[0] : rawContent;

    const parsed = JSON.parse(jsonString);
    const result = Array.isArray(parsed)
      ? parsed
      : parsed.answers || parsed.questions || Object.values(parsed)[0];

    return NextResponse.json(Array.isArray(result) ? result : [result]);
  } catch (error) {
    console.error("GigaChat API error:", error);
    return NextResponse.json(
      { error: "Не удалось разобрать билеты" },
      { status: 500 }
    );
  }
}