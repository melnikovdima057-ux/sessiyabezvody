import { NextResponse } from "next/server";

export interface Review {
  id: string;
  name: string;
  subject: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}

// Начальная база проверенных отзывов
let reviewsData: Review[] = [
  {
    id: "1",
    name: "Данил",
    subject: "ТОЭ и электротехника",
    rating: 5,
    text: "Спас зачёт за 15 минут до входа в аудиторию. Выписал только формулы и суть, препод даже не докопался. 49 рублей окупились мгновенно.",
    date: "Вчера",
    approved: true,
  },
  {
    id: "2",
    name: "Артём К.",
    subject: "Инженерная графика и термех",
    rating: 5,
    text: "Главная фича — это свайпы одной рукой и режим без бликов. Сидел на третьей парте, вообще ноль палева.",
    date: "2 дня назад",
    approved: true,
  },
  {
    id: "3",
    name: "Соня",
    subject: "История и философия",
    rating: 5,
    text: "Идеально выжимает гигантские билеты на 6 страниц в 3 понятных абзаца. Ответила на 5 автоматом.",
    date: "3 дня назад",
    approved: true,
  },
  {
    id: "4",
    name: "Макс",
    subject: "Операционные системы и сети",
    rating: 5,
    text: "Офлайн HTML-файл — пушка. У нас в подвальной аудитории связь глушат наглухо, а файл в браузере открылся без интернета.",
    date: "5 дней назад",
    approved: true,
  },
];

// GET: для главной отдаем только approved, для админки — все (?all=true)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const getAll = searchParams.get("all") === "true";

  if (getAll) {
    return NextResponse.json(reviewsData);
  }

  const approvedOnly = reviewsData.filter((r) => r.approved);
  return NextResponse.json(approvedOnly);
}

// POST: отправка нового отзыва (по умолчанию approved: false)
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
      approved: false, // Отправляется на модерацию
    };

    reviewsData = [newReview, ...reviewsData];

    return NextResponse.json({
      success: true,
      message: "Отзыв отправлен на модерацию",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Не удалось сохранить отзыв" },
      { status: 500 }
    );
  }
}

// PATCH: одобрение или удаление отзыва через админку
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action } = body; // action: 'approve' | 'delete'

    if (action === "approve") {
      reviewsData = reviewsData.map((r) =>
        r.id === id ? { ...r, approved: true } : r
      );
    } else if (action === "delete") {
      reviewsData = reviewsData.filter((r) => r.id !== id);
    }

    return NextResponse.json({ success: true, reviews: reviewsData });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка обновления отзыва" },
      { status: 500 }
    );
  }
}
