import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Отсутствует paymentId" }, { status: 400 });
    }

    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    const paymentSecret = process.env.PAYMENT_SECRET || "default_examzero_secret";

    const authHeader = "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64");

    const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: authHeader },
    });

    const paymentData = await res.json();

    if (paymentData.status === "succeeded") {
      // Создаем криптографический токен: paymentId + timestamp + hmac
      const timestamp = Date.now().toString();
      const payload = `${paymentId}:${timestamp}`;
      const signature = crypto
        .createHmac("sha256", paymentSecret)
        .update(payload)
        .digest("hex");

      const token = `${payload}:${signature}`;

      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json(
      { error: "Платеж еще не подтвержден или отменен" },
      { status: 402 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Ошибка верификации" }, { status: 500 });
  }
}
