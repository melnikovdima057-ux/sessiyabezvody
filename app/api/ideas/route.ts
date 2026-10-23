import { NextResponse } from "next/server";

export interface IdeaItem {
  id: string;
  contact: string;
  text: string;
  date: string;
}

let ideasData: IdeaItem[] = [];

export async function GET() {
  return NextResponse.json(ideasData);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contact, text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Текст идеи обязателен" },
        { status: 400 }
      );
    }

    const newIdea: IdeaItem = {
      id: Date.now().toString(),
      contact: contact?.trim() || "Аноним",
      text: text.trim(),
      date: new Date().toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    ideasData = [newIdea, ...ideasData];

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Не удалось сохранить идею" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    ideasData = ideasData.filter((i) => i.id !== id);
    return NextResponse.json({ success: true, ideas: ideasData });
  } catch (error) {
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
