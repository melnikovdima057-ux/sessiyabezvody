import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "СессияБезВоды — Сдай предмет за 1 вечер",
  description: "Минималистичный сервис для студентов: убираем академическую воду, оставляем только суть, термины и готовый ответ на высший балл.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${jakarta.className} bg-[#090a0f] text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        {children}
      </body>
    </html>
  );
}