"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

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
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  // Поиск
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Загрузка файлов
  const [fileParsing, setFileParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Экзаменационный таймер
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    const paidInStorage = localStorage.getItem("sessiya_paid") === "true";
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success" || paidInStorage) {
      setHasPaid(true);
      localStorage.setItem("sessiya_paid", "true");
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          processFile(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const loadMammoth = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).mammoth) return resolve((window as any).mammoth);
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
      script.onload = () => resolve((window as any).mammoth);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const loadTesseract = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Tesseract) return resolve((window as any).Tesseract);
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = () => resolve((window as any).Tesseract);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const processFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isImage =
      file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/.test(fileName);
    setFileParsing(true);
    setFileStatus(null);
    setOcrProgress(null);

    try {
      if (fileName.endsWith(".txt")) {
        const text = await file.text();
        setInputText(text.trim());
        setFileStatus(`Файл "${file.name}" загружен!`);
      } else if (fileName.endsWith(".docx")) {
        const mammoth = await loadMammoth();
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const cleanLines = result.value
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean)
          .join("\n");
        setInputText(cleanLines);
        setFileStatus(`Файл "${file.name}" загружен!`);
      } else if (isImage) {
        setFileStatus("Загрузка OCR и распознавание фото...");
        const Tesseract = await loadTesseract();
        const res = await Tesseract.recognize(file, "rus+eng", {
          logger: (m: any) => {
            if (m.status === "recognizing text" && m.progress) {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        const recognized = res.data.text
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 2)
          .join("\n");

        setInputText(recognized);
        setFileStatus("Фото успешно распознано!");
      } else {
        alert("Поддерживаются форматы: .docx, .txt или фото (.png, .jpg, .webp)");
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось обработать файл или фото.");
    } finally {
      setFileParsing(false);
      setOcrProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

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

      if (!res.ok) throw new Error("Ошибка генерации");

      const data = await res.json();
      setTickets(data);
      if (data.length > 0) setSelectedTicket(data[0]);
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
          description: "Полный доступ к генератору билетов ExamZero",
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

  const copyAllForTelegram = () => {
    if (tickets.length === 0) return;
    const formatted = tickets
      .map(
        (t) =>
          `📌 *Билет #${t.questionNumber}: ${t.question}*\n\n` +
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
        (t) =>
          `=== БИЛЕТ #${t.questionNumber}: ${t.question} ===\n` +
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
    link.download = "Шпоры_ExamZero.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const query = searchQuery.toLowerCase().trim();

    return tickets.filter((t) => {
      const matchQuestion = t.question.toLowerCase().includes(query);
      const matchNum = String(t.questionNumber).includes(query);
      const matchEssence = t.essence?.some((e) => e.toLowerCase().includes(query));
      const matchTerms = t.keyTerms?.some(
        (k) =>
          k.term.toLowerCase().includes(query) ||
          k.definition.toLowerCase().includes(query)
      );
      const matchAnswer = t.answerGrade5?.fullAnswer.toLowerCase().includes(query);

      return matchQuestion || matchNum || matchEssence || matchTerms || matchAnswer;
    });
  }, [tickets, searchQuery]);

  return (
    <main className="min-h-screen bg-[#0d0f12] text-gray-100 p-4 md:p-8 font-sans">
      {/* Хедер с кликабельным логотипом ExamZero */}
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-6 border-b border-gray-800">
        <div>
          <button
            onClick={() => setShowAboutModal(true)}
            className="group text-left flex items-center gap-2 transition-transform active:scale-95"
            title="Нажми, чтобы узнать всё о сервисе"
          >
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 group-hover:text-indigo-400 transition-colors">
              <span className="text-indigo-500 group-hover:text-indigo-300">Exam</span>Zero
            </h1>
            <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.5 rounded font-mono uppercase group-hover:border-indigo-400 group-hover:bg-indigo-900 transition-colors">
              AI ℹ️
            </span>
          </button>
          <p className="text-xs md:text-sm text-gray-400 mt-0.5">
            Микрошпаргалки без воды • Ноль лишней теории
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
        <section className="md:col-span-5 flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Список билетов:
              </label>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".docx,.txt,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                >
                  📷 Фото / Word / .txt
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative rounded-lg transition-all ${
                isDragging
                  ? "border-2 border-dashed border-indigo-500 bg-indigo-950/20"
                  : ""
              }`}
            >
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (fileStatus) setFileStatus(null);
                }}
                placeholder="Вставь вопросы, перетащи файл Word / фото или нажми Ctrl+V со скриншотом..."
                rows={8}
                className="w-full bg-[#14181f] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {fileParsing && (
              <div className="mt-2 text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
                <span className="animate-spin">⏳</span>
                <span>
                  {ocrProgress !== null
                    ? `Распознавание фото: ${ocrProgress}%...`
                    : "Обработка документа..."}
                </span>
              </div>
            )}

            {fileStatus && !fileParsing && (
              <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                <span>✓</span> {fileStatus}
              </div>
            )}

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
              disabled={loading || !inputText.trim() || fileParsing}
              className="w-full mt-3 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow"
            >
              {loading ? "Разбираем через GigaChat..." : "✨ Разобрать билеты"}
            </button>
          </div>

          {tickets.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl shadow flex flex-col gap-3">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по терминам, формулам..."
                  className="w-full bg-[#14181f] border border-gray-700 rounded-lg pl-8 pr-12 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-gray-500">
                  🔍
                </span>
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-2 top-2 text-[10px] text-gray-500 border border-gray-700 px-1 rounded">
                    Ctrl+K
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Билеты ({filteredTickets.length} из {tickets.length}):
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

              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredTickets.map((t, idx) => (
                  <button
                    key={t.id || idx}
                    onClick={() => setSelectedTicket(t)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg transition-colors border ${
                      selectedTicket?.id === t.id
                        ? "bg-indigo-600 border-indigo-400 text-white shadow"
                        : "bg-[#14181f] border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {t.questionNumber || idx + 1}
                  </button>
                ))}
                {filteredTickets.length === 0 && (
                  <span className="text-xs text-gray-500 italic py-2">
                    Ничего не найдено по запросу «{searchQuery}»
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

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
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">
                Вставь вопросы, перетащи файл Word или фото с доски
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Используй строку поиска или клавиши Ctrl+K для мгновенного нахождения билета
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Окно «О сервисе ExamZero» */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141a] border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                  ⚡ О сервисе <span className="text-indigo-400">ExamZero</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Твой личный ИИ-ассистент для быстрой сдачи зачётов и сессии
                </p>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-gray-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-300 leading-relaxed">
              <div className="bg-[#171b23] p-3 rounded-xl border border-gray-800/80">
                <span className="font-bold text-white text-sm block mb-1">
                  🎯 Что делает сервис?
                </span>
                ExamZero убирает до 90% «воды» из учебников и лекций. Нейросеть GigaChat превращает огромные темы в ёмкие карточки: главная мысль за 1 минуту, академический ответ на 5, формулы и частые подвохи преподавателей.
              </div>

              <div className="bg-[#171b23] p-3 rounded-xl border border-gray-800/80">
                <span className="font-bold text-white text-sm block mb-1">
                  🚀 Встроенные возможности:
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li><strong>Загрузка в 1 клик:</strong> вставка текста, файлов Word (.docx), текстовых файлов (.txt) или перетаскивание фото с доски.</li>
                  <li><strong>OCR и скриншоты:</strong> нажми Ctrl + V со скриншотом в буфере обмена — текст распознается автоматически.</li>
                  <li><strong>Аудио-суфлёр:</strong> озвучка ответа прямо в беспроводной наушник.</li>
                  <li><strong>Моментальный поиск (Ctrl + K):</strong> мгновенно находит нужный билет по формулам и терминам прямо на экзамене.</li>
                  <li><strong>Экзаменационный таймер:</strong> тренировка ответа за 2 минуты.</li>
                  <li><strong>Экспорт:</strong> готовая разметка для пересылки в Telegram и скачивание в .txt.</li>
                </ul>
              </div>

              <div className="bg-[#171b23] p-3 rounded-xl border border-indigo-950/60">
                <span className="font-bold text-indigo-300 text-sm block mb-1">
                  💳 Тарифы и оплата:
                </span>
                <p className="mb-2">
                  • <strong>Бесплатно:</strong> разбор первых 2 билетов для проверки качества.<br />
                  • <strong>ExamZero PRO:</strong> <span className="text-emerald-400 font-bold">49 ₽</span> за весь список билетов без ограничений (разовый доступ).
                </p>
                <div className="text-gray-400 pt-2 border-t border-gray-800/80">
                  <strong>Способы оплаты:</strong> через Систему быстрых платежей (<strong>СБП</strong> в один клик по QR-коду) или любой банковской картой РФ через платёжный шлюз ЮKassa.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-medium rounded-xl text-xs text-white transition-colors"
            >
              Понятно, к билетам!
            </button>
          </div>
        </div>
      )}

      {/* Окно оплаты ЮKassa / СБП */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-3xl">🚀</div>
            <div>
              <h3 className="text-lg font-bold text-white">
                ExamZero PRO
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
