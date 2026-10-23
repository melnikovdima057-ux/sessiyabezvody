import { NextResponse } from "next/server";

export interface Review {
  id: string;
  name: string;
  subject: string;
  rating: number;
  text: string;
  date: string;
}

// Начальная база отзывов для социального доказательства
let reviewsData: Review[] = [
  {
    id: "1",
    name: "Данил",
    subject: "ТОЭ и электротехника",
    rating: 5,
    text: "Спас зачёт за 15 минут до входа в аудиторию. Выписал только формулы и суть, препод даже не докопался. 49 рублей окупились мгновенно.",
    date: "Вчера",
  },
  {
    id: "2",
    name: "Артём К.",
    subject: "Инженерная графика и термех",
    rating: 5,
    text: "Главная фича — это свайпы одной рукой и режим без бликов. Сидел на третьей парте, вообще ноль палева.",
    date: "2 дня назад",
  },
  {
    id: "3",
    name: "Соня",
    subject: "История и философия",
    rating: 5,
    text: "Идеально выжимает гигантские билеты на 6 страниц в 3 понятных абзаца. Ответила на 5 автоматом.",
    date: "3 дня назад",
  },
  {
    id: "4",
    name: "Макс",
    subject: "Операционные системы и сети",
    rating: 5,
    text: "Офлайн HTML-файл — пушка. У нас в подвальной аудитории связь глушат наглухо, а файл в браузере открылся без интернета.",
    date: "5 дней назад",
  },
];

export async function GET() {
  return NextResponse.json(reviewsData);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, subject, rating, text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Текст отзыва обязателен" },
        { status: 400 }
      );
    }

    const newReview: Review = {
      id: Date.now().toString(),
      name: name?.trim() || "Студент",
      subject: subject?.trim() || "Общий зачёт",
      rating: Number(rating) || 5,
      text: text.trim(),
      date: "Только что",
    };

    reviewsData = [newReview, ...reviewsData];

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    return NextResponse.json(
      { error: "Не удалось сохранить отзыв" },
      { status: 500 }
    );
  }
}
