import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExamZero — Умный генератор микрошпаргалок без воды",
  description:
    "Разбор экзаменационных билетов за 1 минуту: ключевые тезисы, формулы и готовые ответы на оценку «Отлично».",
  manifest: "/manifest.json",
  openGraph: {
    title: "ExamZero — Закрой сессию без лишней воды",
    description:
      "Мгновенные микрошпаргалки по билетам. Ноль воды, максимум сути.",
    url: "https://sessiyabezvody.vercel.app",
    siteName: "ExamZero",
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
      <body
        className={`${manrope.className} bg-[#0d0f12] text-gray-100 antialiased selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
