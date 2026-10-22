"use client";

import React, { useState, useEffect } from "react";

interface TicketItem {
  id: string;
  questionNumber: number;
  question: string;
  category: string;
  readTimeMinutes: number;
  essence: string[];
  keyTerms: { term: string; definition: string }[];
  answerGrade5: {
    thesis: string;
    structure: string[];
    fullAnswer: string;
    examinerTips: string;
  };
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  // Экзаменационный таймер
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    // Проверка статуса оплаты в браузере или в URL
    const paidInStorage = localStorage.getItem("sessiya_paid") === "true";
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success" || paidInStorage) {
      setHasPaid(true);
      localStorage.setItem("sessiya_paid", "true");
    }
  }, []);

  // Работа таймера
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    // Считаем примерное количество вопросов по строкам
    const lines = inputText.split("\n").filter((l) => l.trim().length > 3);
    if (lines.length > 2 && !hasPaid) {
      setShowPayModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsText: inputText }),
      });

      if (!res.ok) {
        throw new Error("Ошибка генерации");
      }

      const data = await res.json();
      setTickets(data);
      if (data.length > 0) {
        setSelectedTicket(data[0]);
      }
    } catch (err: any) {
      alert("Не удалось разобрать билеты. Попробуй ещё раз :)");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    setPayLoading(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 49,
          description: "Полный доступ к генератору билетов СессияБезВоды",
          returnUrl: `${window.location.origin}/?payment=success`,
        }),
      });

      const data = await res.json();
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        alert(data.error || "Ошибка инициализации платежа");
      }
    } catch (err) {
      alert("Не удалось подключиться к шлюзу оплаты");
    } finally {
      setPayLoading(false);
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

  return (
    <main className="min-h-screen bg-[#0d0f12] text-gray-100 p-4 md:p-8 font-sans">
      {/* Хедер */}
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            ✨ СессияБезВоды
          </h1>
          <p className="text-xs md:text-sm text-gray-400">
            Умный генератор микрошпаргалок без воды
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-mono">
            ⏱ {Math.floor(timerSeconds / 60)}:
            {(timerSeconds % 60).toString().padStart(2, "0")}
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-xs bg-indigo-600 px-2 py-0.5 rounded text-white hover:bg-indigo-500"
            >
              {isTimerRunning ? "Пауза" : "Старт"}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(120);
              }}
              className="text-xs text-gray-400 hover:text-white"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Поле ввода и настройки */}
        <section className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Список билетов или вопросов:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Вставь вопросы (каждый с новой строки):&#10;1. Закон Ома&#10;2. Законы термодинамики&#10;3. Сила Архимеда..."
              rows={8}
              className="w-full bg-[#14181f] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
              <span>Символов: {inputText.length}</span>
              {hasPaid ? (
                <span className="text-emerald-400 font-medium">✓ Доступ разблокирован</span>
              ) : (
                <span>До 2 билетов бесплатно</span>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !inputText.trim()}
              className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow"
            >
              {loading ? "Разбираем через GigaChat..." : "✨ Разобрать билеты"}
            </button>
          </div>

          {/* Нумпад билетов */}
          {tickets.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Быстрый переход по билетам:
              </span>
              <div className="flex flex-wrap gap-2">
                {tickets.map((t, idx) => (
                  <button
                    key={t.id || idx}
                    onClick={() => setSelectedTicket(t)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg transition-colors border ${
                      selectedTicket?.id === t.id
                        ? "bg-indigo-600 border-indigo-400 text-white"
                        : "bg-[#14181f] border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {t.questionNumber || idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Экран просмотра шпоры */}
        <section className="md:col-span-7">
          {selectedTicket ? (
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg flex flex-col gap-5">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded font-mono">
                    Билет #{selectedTicket.questionNumber}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">
                    {selectedTicket.question}
                  </h2>
                </div>
                <button
                  onClick={() =>
                    speakText(
                      `${selectedTicket.question}. Главная мысль: ${selectedTicket.answerGrade5.thesis}. ${selectedTicket.answerGrade5.fullAnswer}`
                    )
                  }
                  className="bg-gray-800 hover:bg-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors"
                  title="Аудио-суфлёр в наушник"
                >
                  🎧 Озвучить
                </button>
              </div>

              {/* Суть за 1 минуту */}
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

              {/* Главный ответ на 5 */}
              <div className="bg-[#14181f] border border-gray-800 p-3.5 rounded-lg">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                  🎓 Ответ на оценку «Отлично»:
                </span>
                <p className="text-xs text-gray-400 italic mb-2">
                  «{selectedTicket.answerGrade5.thesis}»
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {selectedTicket.answerGrade5.fullAnswer}
                </p>
                {selectedTicket.answerGrade5.examinerTips && (
                  <div className="mt-3 pt-2 border-t border-gray-800/80 text-xs text-amber-300/90 flex gap-1.5 items-center">
                    <span>💡 Лайфхак преподавателя:</span>
                    <span>{selectedTicket.answerGrade5.examinerTips}</span>
                  </div>
                )}
              </div>

              {/* Термины и формулы */}
              {selectedTicket.keyTerms && selectedTicket.keyTerms.length > 0 && (
                <div className="bg-[#14181f] border border-gray-800 p-3.5 rounded-lg">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-2">
                    🔑 Термины и определения:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {selectedTicket.keyTerms.map((t, i) => (
                      <div key={i} className="text-gray-300">
                        <strong className="text-white">{t.term}</strong> —{" "}
                        {t.definition}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 p-12 rounded-xl text-center flex flex-col items-center justify-center text-gray-500 min-h-[350px]">
              <div className="text-3xl mb-2">📖</div>
              <p className="text-sm">
                Вставь список вопросов слева и нажми «Разобрать билеты»
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Шпаргалка мгновенно покажет суть, термины и готовую формулировку для ответа
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Модальное окно оплаты ЮKassa / СБП */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-3xl">🚀</div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Полный разбор билетов
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Генерация без ограничений по количеству вопросов, шпаргалки без воды, таймер и аудиосуфлёр.
              </p>
            </div>

            <div className="bg-[#14181f] p-3 rounded-xl border border-gray-800">
              <span className="text-2xl font-black text-indigo-400">49 ₽</span>
              <span className="text-xs text-gray-400 block mt-0.5">
                Разовый доступ • СБП в один клик
              </span>
            </div>

            <button
              onClick={handleCreatePayment}
              disabled={payLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              {payLoading ? "Подготовка платежа..." : "Оплатить 49 ₽ через СБП"}
            </button>

            <button
              onClick={() => setShowPayModal(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
