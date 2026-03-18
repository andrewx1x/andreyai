import { NextResponse } from "next/server";

// Заглушка для Робокассы — будет реализована после подключения ПНД
export async function POST(request: Request) {
  const body = await request.text();
  console.log("[Webhook/Payment] Received:", body);

  // TODO: Верифицировать подпись Робокассы
  // TODO: Обновить подписку в БД
  // TODO: Отправить подтверждение пользователю

  return NextResponse.json({ ok: true, message: "Payment webhook stub" });
}
