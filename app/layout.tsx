import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "СессияБезВоды — Генератор микрошпаргалок без воды",
  description:
    "Разбор экзаменационных билетов за 1 минуту: ключевые тезисы, формулы и готовые ответы на оценку «Отлично».",
  openGraph: {
    title: "СессияБезВоды — Закрой сессию налегке",
    description:
      "Мгновенные микрошпаргалки по билетам через нейросеть. Без лишней воды.",
    url: "https://sessiyabezvody.vercel.app",
    siteName: "СессияБезВоды",
    locale: "ru_RU",
    type: "website",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-[#0d0f12] text-gray-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
