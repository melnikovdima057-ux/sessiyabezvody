import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ticketsCount, extraTicketsCount, amount } = await req.json();

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      return NextResponse.json(
        { error: "Ключи ЮKassa пока не настроены в Vercel" },
        { status: 500 }
      );
    }

    const authHeader = "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");
    const idempotenceKey = `order-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: {
          value: `${amount}.00`,
          currency: "RUB",
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: "https://sessiyabezvody.vercel.app?payment=success",
        },
        description: `Разбор экзаменационных билетов (${ticketsCount} шт.) — СессияБезВоды`,
        metadata: {
          extraTicketsCount,
        },
      }),
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error("YooKassa API Error:", paymentData);
      return NextResponse.json(
        { error: paymentData.description || "Ошибка создания платежа" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      paymentId: paymentData.id,
      confirmationUrl: paymentData.confirmation.confirmation_url,
    });
  } catch (error) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
