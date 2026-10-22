import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { amount, description, returnUrl } = await req.json();

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      return NextResponse.json(
        { error: "Ключи ЮKassa не настроены на сервере" },
        { status: 500 }
      );
    }

    const authHeader =
      "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");
    const idempotenceKey = `pay-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: {
          value: Number(amount || 49).toFixed(2),
          currency: "RUB",
        },
        confirmation: {
          type: "redirect",
          return_url:
            returnUrl ||
            process.env.NEXT_PUBLIC_APP_URL ||
            "https://sessiyabezvody.vercel.app",
        },
        capture: true,
        description:
          description || "Разбор экзаменационных билетов СессияБезВоды",
        payment_method_data: {
          type: "sbp",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("YooKassa API error:", data);
      return NextResponse.json(
        { error: data.description || "Ошибка создания платежа" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      paymentId: data.id,
      confirmationUrl: data.confirmation?.confirmation_url,
    });
  } catch (error: any) {
    console.error("Payment create error:", error);
    return NextResponse.json(
      { error: error.message || "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
