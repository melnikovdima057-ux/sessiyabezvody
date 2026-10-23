import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { returnUrl } = await req.json();

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      return NextResponse.json(
        { error: "Платежные данные не настроены" },
        { status: 500 }
      );
    }

    const idempotenceKey = Date.now().toString() + Math.random().toString();
    const authHeader = "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: {
          value: "49.00",
          currency: "RUB",
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: returnUrl,
        },
        description: "ExamZero PRO — Доступ к генератору шпаргалок",
      }),
    });

    const data = await response.json();

    if (data.confirmation?.confirmation_url) {
      return NextResponse.json({
        confirmationUrl: data.confirmation.confirmation_url,
        paymentId: data.id,
      });
    }

    return NextResponse.json(
      { error: data.description || "Ошибка создания платежа" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
