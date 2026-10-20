import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event === "payment.succeeded") {
      const payment = body.object;
      const paymentId = payment.id;
      const amount = payment.amount.value;

      console.log(`[ЮKASSA УСПЕХ] Платеж ${paymentId} на сумму ${amount} ₽ успешно зачислен.`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
