import { NextResponse } from "next/server";

declare global {
  var examZeroSyncStore: Map<string, { tickets: any[]; createdAt: number }> | undefined;
}

if (!global.examZeroSyncStore) {
  global.examZeroSyncStore = new Map();
}

// Очистка кодов старше 1 часа
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of global.examZeroSyncStore!.entries()) {
    if (now - data.createdAt > 60 * 60 * 1000) {
      global.examZeroSyncStore!.delete(code);
    }
  }
}, 60000);

export async function POST(req: Request) {
  try {
    const { tickets } = await req.json();
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: "Список билетов пуст" }, { status: 400 });
    }

    // Генерация случайного 4-значного кода
    let code = "";
    let attempts = 0;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
    } while (global.examZeroSyncStore!.has(code) && attempts < 100);

    global.examZeroSyncStore!.set(code, {
      tickets,
      createdAt: Date.now(),
    });

    return NextResponse.json({ code });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка сервера при генерации кода" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Код не указан" }, { status: 400 });
  }

  const entry = global.examZeroSyncStore!.get(code.trim());
  if (!entry) {
    return NextResponse.json({ error: "Код не найден или истёк срок действия" }, { status: 404 });
  }

  return NextResponse.json({ tickets: entry.tickets });
}
