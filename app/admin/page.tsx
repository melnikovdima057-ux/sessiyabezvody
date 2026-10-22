"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface TicketItem {
  id?: string;
  questionNumber?: number;
  question: string;
  category?: string;
  readTimeMinutes?: number;
  essence?: string[];
  keyTerms?: { term: string; definition: string }[];
  answerGrade5?: {
    thesis?: string;
    structure?: string[];
    fullAnswer?: string;
    examinerTips?: string;
  };
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [testInput, setTestInput] = useState(
    "1. Первый закон термодинамики\n2. Уравнение Менделеева-Клапейрона\n3. Закон Бойля-Мариотта"
  );
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [isPaidMode, setIsPaidMode] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "json">("cards");

  const correctPassword =
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin2026";

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    const currentPaid = localStorage.getItem("sessiya_paid") === "true";
    setIsPaidMode(currentPaid);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === correctPassword) {
      sessionStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
    } else {
      alert("Неверный пароль администратора");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
  };

  const togglePaidStatus = () => {
    const nextStatus = !isPaidMode;
    setIsPaidMode(nextStatus);
    if (nextStatus) {
      localStorage.setItem("sessiya_paid", "true");
    } else {
      localStorage.removeItem("sessiya_paid");
    }
  };

  const clearAppData = () => {
    localStorage.clear();
    setIsPaidMode(false);
    alert("Кэш браузера и сохраненные билеты успешно очищены!");
  };

  const runAdminTest = async () => {
    setLoading(true);
    setRawResponse(null);
    setTickets([]);
    setSelectedTicket(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsText: testInput }),
      });

      const data = await res.json();
      setRawResponse({
        status: res.status,
        ok: res.ok,
        data,
      });

      if (res.ok && Array.isArray(data) && data.length > 0) {
        setTickets(data);
        setSelectedTicket(data[0]);
        setViewMode("cards");
      }
    } catch (err: any) {
      setRawResponse({
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ru-RU";
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const copyAllForTelegram = () => {
    if (tickets.length === 0) return;
    const formatted = tickets
      .map(
        (t, idx) =>
          `📌 *Билет #${t.questionNumber || idx + 1}: ${t.question}*\n\n` +
          `⚡ *Суть:* ${t.essence?.join("; ") || ""}\n` +
          `🎓 *Ответ:* ${t.answerGrade5?.fullAnswer || ""}\n` +
          (t.answerGrade5?.examinerTips
            ? `💡 *Лайфхак:* ${t.answerGrade5.examinerTips}\n`
            : "")
      )
      .join("\n───────────────\n\n");

    navigator.clipboard.writeText(formatted);
    alert("Все билеты скопированы с разметкой для Telegram!");
  };

  const downloadAsTxt = () => {
    if (tickets.length === 0) return;
    const textContent = tickets
      .map(
        (t, idx) =>
          `=== БИЛЕТ #${t.questionNumber || idx + 1}: ${t.question} ===\n` +
          `СУТЬ: ${t.essence?.join("; ") || ""}\n` +
          `ОТВЕТ НА 5: ${t.answerGrade5?.fullAnswer || ""}\n` +
          (t.answerGrade5?.examinerTips
            ? `ЛАЙФХАК: ${t.answerGrade5.examinerTips}\n`
            : "")
      )
      .join("\n\n" + "=".repeat(40) + "\n\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Шпоры_СессияБезВоды_Admin.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#0d0f12] text-gray-200 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-sm flex flex-col gap-4 shadow-2xl"
        >
          <div className="text-center mb-2">
            <span className="text-3xl">🔒</span>
            <h1 className="text-xl font-bold text-white mt-2">Панель управления</h1>
            <p className="text-xs text-gray-400 mt-1">
              Введите мастер-пароль разработчика
            </p>
          </div>

          <input
            type="password"
            placeholder="Пароль"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full bg-[#14181f] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg text-sm transition-colors text-white"
          >
            Войти в систему
          </button>

          <Link
            href="/"
            className="text-center text-xs text-gray-500 hover:text-gray-300 mt-2"
          >
            ← Вернуться на главную
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0f12] text-gray-200 p-4 md:p-8 max-w-7xl mx-auto font-sans">
      <header className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-gray-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">⚙️ Debug & VIP Generator</h1>
            <span className="text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded">
              Superuser (Бесплатно)
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            СессияБезВоды • Безлимитный разбор и просмотр билетов для себя
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            На сайт
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Быстрые переключатели окружения */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Статус на основном сайте</div>
            <div className="text-xs text-gray-400">
              {isPaidMode ? "Разблокирован (PRO)" : "Обычный (Лимит 2 билета)"}
            </div>
          </div>
          <button
            onClick={togglePaidStatus}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              isPaidMode
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300"
            }`}
          >
            {isPaidMode ? "Выключить PRO" : "Включить PRO"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Очистка кэша</div>
            <div className="text-xs text-gray-400">Сбросить LocalStorage</div>
          </div>
          <button
            onClick={clearAppData}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors text-amber-300"
          >
            Сбросить всё
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">ЮKassa СБП</div>
            <div className="text-xs text-gray-400">ShopID: 1502253</div>
          </div>
          <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 px-2 py-1 rounded">
            Подключено
          </span>
        </div>
      </div>

      {/* Рабочая зона */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Поле ввода билетов */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ввод вопросов (без ограничений):
              </label>
              <span className="text-xs text-indigo-400 font-mono">
                Строк: {testInput.split("\n").filter((l) => l.trim().length > 2).length}
              </span>
            </div>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={11}
              className="w-full bg-[#14181f] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Вставляй любое количество вопросов..."
            />
            <button
              onClick={runAdminTest}
              disabled={loading || !testInput.trim()}
              className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 font-semibold rounded-lg text-sm transition-colors text-white shadow"
            >
              {loading ? "GigaChat генерирует шпоры..." : "✨ Разобрать билеты бесплатно"}
            </button>
          </div>

          {/* Нумпад билетов и быстрые кнопки экспорта */}
          {tickets.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Билеты ({tickets.length} готово):
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={copyAllForTelegram}
                    className="text-[11px] bg-gray-800 hover:bg-gray-700 text-indigo-300 border border-indigo-900/50 px-2 py-1 rounded transition-colors"
                    title="Скопировать все для Telegram"
                  >
                    📋 В ТГ
                  </button>
                  <button
                    onClick={downloadAsTxt}
                    className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-2 py-1 rounded transition-colors"
                    title="Скачать .txt файл"
                  >
                    💾 .txt
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {tickets.map((t, idx) => {
                  const num = t.questionNumber || idx + 1;
                  const isSelected = selectedTicket === t;
                  return (
                    <button
                      key={t.id || idx}
                      onClick={() => {
                        setSelectedTicket(t);
                        setViewMode("cards");
                      }}
                      className={`h-9 w-9 text-xs font-bold rounded-lg transition-colors border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                          : "bg-[#14181f] border-gray-700 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Экран просмотра билетов и переключатель JSON */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Переключатель вкладок */}
          <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-2 rounded-xl">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("cards")}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                📋 Карточка шпоры
              </button>
              <button
                onClick={() => setViewMode("json")}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  viewMode === "json"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                ⚙️ Сырой JSON
              </button>
            </div>
            {selectedTicket && (
              <span className="text-xs text-gray-400 font-mono pr-2">
                Билет #{selectedTicket.questionNumber || 1}
              </span>
            )}
          </div>

          {/* Режим просмотра карточек */}
          {viewMode === "cards" ? (
            selectedTicket ? (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded font-mono">
                      Билет #{selectedTicket.questionNumber || 1} • {selectedTicket.category || "Экзамен"}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1.5">
                      {selectedTicket.question}
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      speakText(
                        `${selectedTicket.question}. Главная мысль: ${
                          selectedTicket.answerGrade5?.thesis || ""
                        }. ${selectedTicket.answerGrade5?.fullAnswer || ""}`
                      )
                    }
                    className="bg-gray-800 hover:bg-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors whitespace-nowrap text-gray-200"
                    title="Аудио в наушник"
                  >
                    🎧 Озвучить
                  </button>
                </div>

                {/* Суть за 1 минуту */}
                {selectedTicket.essence && selectedTicket.essence.length > 0 && (
                  <div className="bg-[#14181f] border border-gray-800 p-3.5 rounded-lg">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-2">
                      ⚡ Суть за 1 минуту (тезисы):
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                      {selectedTicket.essence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ответ на оценку «Отлично» */}
                {selectedTicket.answerGrade5 && (
                  <div className="bg-[#14181f] border border-gray-800 p-3.5 rounded-lg">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                      🎓 Ответ на оценку «Отлично»:
                    </span>
                    {selectedTicket.answerGrade5.thesis && (
                      <p className="text-xs text-gray-400 italic mb-2">
                        «{selectedTicket.answerGrade5.thesis}»
                      </p>
                    )}
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {selectedTicket.answerGrade5.fullAnswer}
                    </p>
                    {selectedTicket.answerGrade5.examinerTips && (
                      <div className="mt-3 pt-2 border-t border-gray-800 text-xs text-amber-300 flex items-start gap-1.5">
                        <span>💡</span>
                        <span>
                          <strong>Лайфхак:</strong> {selectedTicket.answerGrade5.examinerTips}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Термины и константы */}
                {selectedTicket.keyTerms && selectedTicket.keyTerms.length > 0 && (
                  <div className="bg-[#14181f] border border-gray-800 p-3.5 rounded-lg">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-2">
                      🔑 Термины и величины:
                    </span>
                    <div className="space-y-1 text-xs">
                      {selectedTicket.keyTerms.map((t, i) => (
                        <div key={i} className="text-gray-300">
                          <strong className="text-white">{t.term}</strong> — {t.definition}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 p-12 rounded-xl text-center flex flex-col items-center justify-center text-gray-500 min-h-[360px]">
                <div className="text-3xl mb-2">📚</div>
                <p className="text-sm">
                  Здесь появятся готовые шпоры после запуска генерации
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Админка полностью бесплатна и не требует оплаты
                </p>
              </div>
            )
          ) : (
            /* Режим сырого JSON */
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex-1 flex flex-col min-h-[360px]">
              <div className="flex-1 bg-[#14181f] border border-gray-800 rounded-lg p-3 font-mono text-xs overflow-auto max-h-[500px] text-gray-300">
                {rawResponse ? (
                  <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
                ) : (
                  <span className="text-gray-600 italic">
                    JSON ответ сервера появится здесь...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
