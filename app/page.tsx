"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  RotateCcw,
  Copy,
  Check,
  ChevronsUpDown,
  Search,
  Layers,
  List,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Timer,
  Play,
  Pause,
  QrCode,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

interface KeyTerm {
  term: string;
  definition: string;
}

interface AnswerGrade5 {
  thesis: string;
  structure: string[];
  fullAnswer: string;
  examinerTips: string;
}

interface ExamAnswer {
  id: string;
  questionNumber: number;
  question: string;
  category: string;
  readTimeMinutes: number;
  essence: string[];
  keyTerms: KeyTerm[];
  answerGrade5: AnswerGrade5;
}

interface SavedSession {
  id: string;
  title: string;
  date: string;
  inputText: string;
  answers: ExamAnswer[];
  learnedIds: Record<string, boolean>;
}

const STORAGE_KEYS = {
  CURRENT_INPUT: "sbv_current_input",
  CURRENT_ANSWERS: "sbv_current_answers",
  CURRENT_LEARNED: "sbv_current_learned",
  HISTORY: "sbv_sessions_history",
  PAID_SESSIONS: "sbv_paid_sessions",
};

// НАСТРОЙКИ СБП И ТАРИФА
const SBP_SETTINGS = {
  FREE_LIMIT: 2,
  PRICE_PER_EXTRA: 10,
  PHONE: "+7 983 306-89-68", // Замени на свой реальный номер телефона
  BANK: "Т-Банк / Озон / Сбер",      // Твой банк для переводов по СБП
  RECIPIENT: "Дмитрий М.",    // Имя и инициал получателя
};

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [learnedIds, setLearnedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "flashcards">("list");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Состояния таймера
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(120);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerWidget, setShowTimerWidget] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Состояния оплаты СБП
  const [showPayModal, setShowPayModal] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const sampleQuestions = `1. Реляционные базы данных и нормализация (1NF, 2NF, 3NF).
2. Транзакции и принципы ACID: уровни изоляции.
3. Индексы в СУБД: B-Tree vs Hash-индексы.`;

  // Звуковой сигнал таймера
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {}
  };

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const setTimerDuration = (seconds: number) => {
    setIsTimerRunning(false);
    setTimerInitialSeconds(seconds);
    setTimeLeft(seconds);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerInitialSeconds);
  };

  // Загрузка из localStorage
  useEffect(() => {
    try {
      const savedInput = localStorage.getItem(STORAGE_KEYS.CURRENT_INPUT);
      const savedAnswers = localStorage.getItem(STORAGE_KEYS.CURRENT_ANSWERS);
      const savedLearned = localStorage.getItem(STORAGE_KEYS.CURRENT_LEARNED);
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);

      if (savedInput) setInputText(savedInput);
      if (savedAnswers) {
        const parsedAnswers: ExamAnswer[] = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
        if (parsedAnswers.length > 0) {
          setOpenCards({ [parsedAnswers[0].id]: true });
        }
      }
      if (savedLearned) setLearnedIds(JSON.parse(savedLearned));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (err) {
      console.error("Ошибка чтения localStorage:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Автосохранение
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_INPUT, inputText);
      localStorage.setItem(STORAGE_KEYS.CURRENT_ANSWERS, JSON.stringify(answers));
      localStorage.setItem(STORAGE_KEYS.CURRENT_LEARNED, JSON.stringify(learnedIds));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (err) {
      console.error("Ошибка записи в localStorage:", err);
    }
  }, [inputText, answers, learnedIds, history, isHydrated]);

  // Подсчёт количества билетов в тексте
  const countTickets = (text: string): { count: number; items: string[] } => {
    const rawLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    const numbered = rawLines.filter((l) =>
      /^(билет\s*\d+|\d+[\.\)\-\s])/i.test(l)
    );

    const finalItems = numbered.length > 0 ? numbered : rawLines;
    return {
      count: Math.max(1, finalItems.length),
      items: finalItems,
    };
  };

  // Проверка перед разбором: запуск или запрос оплаты
  const handleInitiateAnalyze = () => {
    const textToProcess = inputText.trim();
    if (textToProcess.length < 4) return;

    const { count } = countTickets(textToProcess);
    setDetectedCount(count);

    if (count > SBP_SETTINGS.FREE_LIMIT) {
      setShowPayModal(true);
    } else {
      executeAnalyze(textToProcess);
    }
  };

  // Разбор только первых 2 билетов бесплатно
  const handleFreePartialAnalyze = () => {
    const { items } = countTickets(inputText);
    const limitedText = items.slice(0, SBP_SETTINGS.FREE_LIMIT).join("\n");
    setInputText(limitedText);
    setShowPayModal(false);
    executeAnalyze(limitedText);
  };

  // Непосредственный вызов API генерации
  const executeAnalyze = async (textToProcess: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsText: textToProcess }),
      });

      if (!res.ok) throw new Error("Ошибка генерации");

      const data: ExamAnswer[] = await res.json();
      setAnswers(data);
      setLearnedIds({});
      setCurrentCardIndex(0);
      setIsFlipped(false);

      const initialOpenState: Record<string, boolean> = {};
      data.forEach((item, idx) => {
        initialOpenState[item.id] = idx === 0;
      });
      setOpenCards(initialOpenState);

      if (data.length > 0) {
        const firstQuestion = data[0].question;
        const sessionTitle =
          firstQuestion.length > 40
            ? firstQuestion.slice(0, 40) + "..."
            : firstQuestion;

        const newSession: SavedSession = {
          id: `session-${Date.now()}`,
          title: `${sessionTitle} (${data.length} бил.)`,
          date: new Date().toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          inputText: textToProcess,
          answers: data,
          learnedIds: {},
        };

        setHistory((prev) => [newSession, ...prev.slice(0, 9)]);
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось разобрать билеты. Попробуй ещё раз :)");
    } finally {
      setIsLoading(false);
    }
  };

  // Подтверждение оплаты СБП
  const handleConfirmPayment = () => {
    setShowPayModal(false);
    executeAnalyze(inputText.trim());
  };

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(SBP_SETTINGS.PHONE.replace(/\s+/g, ""));
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    } catch {}
  };

  const loadFromHistory = (session: SavedSession) => {
    setInputText(session.inputText);
    setAnswers(session.answers);
    setLearnedIds(session.learnedIds || {});
    setCurrentCardIndex(0);
    setIsFlipped(false);
    if (session.answers.length > 0) {
      setOpenCards({ [session.answers[0].id]: true });
    }
    setShowHistory(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCurrentWorkspace = () => {
    setInputText("");
    setAnswers([]);
    setLearnedIds({});
    setSearchQuery("");
  };

  const toggleCard = (id: string) => {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (open: boolean) => {
    const nextState: Record<string, boolean> = {};
    answers.forEach((item) => {
      nextState[item.id] = open;
    });
    setOpenCards(nextState);
  };

  const toggleLearned = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLearnedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyAnswer = async (
    id: string,
    textToCopy: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Ошибка копирования:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredAnswers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return answers;

    return answers.filter((item) => {
      const inQuestion = item.question.toLowerCase().includes(q);
      const inEssence = item.essence.some((e) => e.toLowerCase().includes(q));
      const inTerms = item.keyTerms?.some(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q)
      );
      const inFull = item.answerGrade5.fullAnswer.toLowerCase().includes(q);
      return inQuestion || inEssence || inTerms || inFull;
    });
  }, [answers, searchQuery]);

  const learnedCount = useMemo(() => {
    return answers.filter((a) => learnedIds[a.id]).length;
  }, [answers, learnedIds]);

  const progressPercent =
    answers.length > 0 ? Math.round((learnedCount / answers.length) * 100) : 0;

  const isAllOpen =
    filteredAnswers.length > 0 &&
    filteredAnswers.every((item) => openCards[item.id]);

  const activeFlashcard = filteredAnswers[currentCardIndex] || null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Расчёт стоимости пакета
  const extraTicketsCount = Math.max(0, detectedCount - SBP_SETTINGS.FREE_LIMIT);
  const totalPrice = extraTicketsCount * SBP_SETTINGS.PRICE_PER_EXTRA;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-medium selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* МОДАЛЬНОЕ ОКНО ОПЛАТЫ ПО СБП */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Оплата разбора по СБП</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Детализация расчёта */}
            <div className="mt-4 space-y-2 rounded-xl bg-zinc-950/70 p-3.5 border border-zinc-800 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Обнаружено билетов:</span>
                <span className="font-bold text-white">{detectedCount} шт.</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Бесплатно (пробный тариф):</span>
                <span className="font-bold">2 шт.</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Платные билеты:</span>
                <span>{extraTicketsCount} шт. × {SBP_SETTINGS.PRICE_PER_EXTRA} ₽</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
                <span className="font-bold text-white">Итого к оплате:</span>
                <span className="font-extrabold text-indigo-400 text-base">{totalPrice} ₽</span>
              </div>
            </div>

            {/* Реквизиты СБП */}
            <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Номер телефона СБП:</span>
                <button
                  type="button"
                  onClick={copyPhoneNumber}
                  className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200 font-bold"
                >
                  {phoneCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> {SBP_SETTINGS.PHONE}
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between text-xs text-zinc-400">
                <span>Банк:</span>
                <span className="text-zinc-200 font-semibold">{SBP_SETTINGS.BANK}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Получатель:</span>
                <span className="text-zinc-200 font-semibold">{SBP_SETTINGS.RECIPIENT}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Я оплатил {totalPrice} ₽ — разобрать все</span>
              </button>

              <button
                type="button"
                onClick={handleFreePartialAnalyze}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Разобрать только первые 2 билета бесплатно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Шапка */}
      <header className="no-print border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block leading-tight">
                СессияБезВоды
              </span>
              <span className="text-[11px] text-zinc-400 block leading-tight">
                Умный генератор микрошпаргалок
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTimerWidget(!showTimerWidget)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                showTimerWidget || isTimerRunning
                  ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-300"
                  : "bg-zinc-800/90 hover:bg-zinc-700/80 border-zinc-700/60 text-zinc-200"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>
                {isTimerRunning ? formatTime(timeLeft) : "Таймер ответа"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>История ({history.length})</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* Панель таймера */}
        {showTimerWidget && (
          <div className="no-print mb-6 rounded-2xl border border-indigo-500/40 bg-zinc-900/95 p-4 md:p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Таймер устного ответа
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTimerWidget(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-4xl font-extrabold font-mono tracking-tight ${
                    timeLeft === 0
                      ? "text-rose-500 animate-pulse"
                      : timeLeft <= 15
                      ? "text-amber-400"
                      : "text-white"
                  }`}
                >
                  {formatTime(timeLeft)}
                </span>
                <span className="text-xs text-zinc-500">
                  {timeLeft === 0
                    ? "Время вышло!"
                    : isTimerRunning
                    ? "Идет ответ..."
                    : "Пауза"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {[60, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTimerDuration(sec)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                      timerInitialSeconds === sec && timeLeft !== 0
                        ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sec / 60} мин
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isTimerRunning
                      ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Пауза
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Старт
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetTimer}
                  title="Сбросить время"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Панель истории разборов */}
        {showHistory && (
          <div className="no-print mb-6 rounded-2xl border border-indigo-500/30 bg-zinc-900/90 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Сохраненные разборы
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">
                История пуста. Разобранные билеты появятся здесь :)
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {history.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadFromHistory(session)}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800 transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-indigo-300">
                        {session.title}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {session.date}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteHistoryItem(session.id, e)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-900 transition-colors"
                      title="Удалить из истории"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ввод вопросов */}
        <section className="no-print mb-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Тариф:</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  2 билета бесплатно
                </span>
                <span className="text-xs text-zinc-500">далее 10 ₽ / билет</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputText(sampleQuestions)}
                  className="text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer"
                >
                  Пример (SQL)
                </button>
                {answers.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCurrentWorkspace}
                    className="text-xs text-rose-300/90 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/40 px-2.5 py-1 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
                  >
                    Сбросить всё
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Вставь список билетов или экзаменационных вопросов..."
                rows={4}
                className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 p-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 transition-all resize-y"
              />
              {inputText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  title="Очистить поле"
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                {inputText.trim().length === 0
                  ? "СБП оплата • Автосохранение • Секундомер ответа"
                  : `Билетов обнаружено: ~${countTickets(inputText).count}`}
              </span>

              <button
                type="button"
                onClick={handleInitiateAnalyze}
                disabled={isLoading || inputText.trim().length < 4}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? "Разбираем через GigaChat..." : "Разобрать билеты →"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Прогресс и фильтры */}
        {answers.length > 0 && (
          <section className="no-print mb-6 space-y-4">
            <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-300 font-semibold">
                  Готовность к экзамену: выучено {learnedCount} из {answers.length}
                </span>
                <span className="text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentCardIndex(0);
                  }}
                  placeholder="Быстрый поиск по вопросам, терминам и шпорам..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs md:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <div className="inline-flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Список</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("flashcards");
                      setIsFlipped(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "flashcards"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Тренажёр</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Разобранные билеты */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold tracking-tight text-white">
                Разобранные вопросы ({filteredAnswers.length})
              </h2>
            </div>

            {answers.length > 0 && viewMode === "list" && (
              <div className="no-print flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAll(!isAllOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isAllOpen ? "Свернуть все" : "Развернуть все"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Скачать шпору (PDF)</span>
                </button>
              </div>
            )}
          </div>

          {answers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800/80 p-12 text-center text-zinc-500 text-sm">
              Список билетов пуст. Вставь вопросы в поле выше и нажми «Разобрать билеты».
            </div>
          )}

          {answers.length > 0 && filteredAnswers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800/80 p-10 text-center text-zinc-400 text-sm">
              По запросу «{searchQuery}» ничего не найдено.
            </div>
          )}

          {/* FLASHCARDS */}
          {viewMode === "flashcards" && activeFlashcard && (
            <div className="no-print my-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-2xl border border-indigo-500/40 bg-zinc-900/70 p-6 md:p-8 min-h-[320px] flex flex-col justify-between cursor-pointer select-none shadow-xl hover:border-indigo-400/60 transition-all"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-indigo-300 font-bold">
                    Билет #{activeFlashcard.questionNumber} из {filteredAnswers.length}
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Eye className="w-3.5 h-3.5" />
                    {isFlipped ? "Скрыть ответ" : "Показать ответ"}
                  </span>
                </div>

                {!isFlipped ? (
                  <div className="my-auto py-8 text-center">
                    <p className="text-xs uppercase tracking-wider text-indigo-400 font-bold mb-2">
                      Вопрос билета:
                    </p>
                    <h3 className="text-lg md:text-2xl font-bold text-white max-w-2xl mx-auto leading-snug">
                      {activeFlashcard.question}
                    </h3>
                  </div>
                ) : (
                  <div className="my-6 space-y-4 text-sm">
                    <div>
                      <div className="text-xs font-bold uppercase text-indigo-400 mb-1">
                        Суть без воды:
                      </div>
                      <ul className="list-disc list-inside text-zinc-200 space-y-1">
                        {activeFlashcard.essence.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800">
                      <div className="text-xs font-bold uppercase text-emerald-400 mb-1">
                        Главный ответ:
                      </div>
                      <p className="text-zinc-200 leading-relaxed">
                        {activeFlashcard.answerGrade5.fullAnswer}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
                  <span className="text-xs text-zinc-500">
                    Статус: {learnedIds[activeFlashcard.id] ? "Выучено :)" : "В процессе"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleLearned(activeFlashcard.id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      learnedIds[activeFlashcard.id]
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {learnedIds[activeFlashcard.id] ? "Уже знаю!" : "Отметить как выученное"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  disabled={currentCardIndex === 0}
                  onClick={() => {
                    setCurrentCardIndex((i) => Math.max(0, i - 1));
                    setIsFlipped(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 disabled:opacity-40 hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Предыдущий</span>
                </button>

                <span className="text-xs text-zinc-400">
                  {currentCardIndex + 1} / {filteredAnswers.length}
                </span>

                <button
                  type="button"
                  disabled={currentCardIndex >= filteredAnswers.length - 1}
                  onClick={() => {
                    setCurrentCardIndex((i) =>
                      Math.min(filteredAnswers.length - 1, i + 1)
                    );
                    setIsFlipped(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 disabled:opacity-40 hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Следующий</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* СПИСОК */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {filteredAnswers.map((item) => {
                const isOpen = !!openCards[item.id];
                const isLearned = !!learnedIds[item.id];

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all duration-300 ${
                      isLearned
                        ? "border-emerald-900/40 bg-zinc-950/40 opacity-80"
                        : "border-zinc-800/90 bg-zinc-900/40 shadow-sm hover:border-zinc-700/80"
                    }`}
                  >
                    <div
                      onClick={() => toggleCard(item.id)}
                      className="p-4 md:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs flex items-center justify-center font-bold">
                          {item.questionNumber}
                        </span>
                        <h3
                          className={`text-sm md:text-base font-semibold leading-snug line-clamp-2 transition-colors duration-200 ${
                            isLearned ? "line-through text-zinc-400" : "text-white"
                          }`}
                        >
                          {item.question}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleLearned(item.id, e)}
                          className={`no-print p-1 rounded-md transition-colors ${
                            isLearned
                              ? "text-emerald-400 hover:text-emerald-300"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>

                        <div
                          className={`text-zinc-400 hover:text-zinc-200 transition-transform duration-300 ease-in-out ${
                            isOpen ? "rotate-180" : "rotate-0"
                          }`}
                        >
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-4 pb-5 md:px-5 md:pb-6 pt-1 border-t border-zinc-800/60 text-sm space-y-5">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                              <span>1. Суть без воды:</span>
                              <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-normal lowercase">
                                <Clock className="w-3 h-3" /> ~{item.readTimeMinutes} мин
                              </span>
                            </div>
                            <ul className="space-y-1.5 list-disc list-inside text-zinc-300 text-sm">
                              {item.essence.map((point, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {item.keyTerms && item.keyTerms.length > 0 && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                                2. Термины:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {item.keyTerms.map((termItem, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-3"
                                  >
                                    <span className="font-bold text-white block mb-0.5">
                                      {termItem.term}:
                                    </span>
                                    <span className="text-xs text-zinc-400 leading-relaxed block">
                                      {termItem.definition}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                                3. Ответ на 5:
                              </span>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleCopyAnswer(
                                    item.id,
                                    `${item.answerGrade5.thesis}\n\n${item.answerGrade5.fullAnswer}`,
                                    e
                                  )
                                }
                                className="no-print flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">
                                      Скопировано!
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Копировать</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="italic text-zinc-300 text-sm mb-3">
                              {item.answerGrade5.thesis}
                            </p>

                            <p className="text-zinc-300 text-sm leading-relaxed mb-3">
                              {item.answerGrade5.fullAnswer}
                            </p>

                            {item.answerGrade5.examinerTips && (
                              <div className="pt-2 border-t border-zinc-800/60 text-xs text-amber-300/90">
                                <span className="font-bold">Лайфхак: </span>
                                {item.answerGrade5.examinerTips}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      {/* Юридический подвал для ЮKassa */}
      <footer className="no-print mt-16 border-t border-zinc-800/80 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 СессияБезВоды. Самозанятый Мельников Д. Д., ИНН 540212274813
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <a
              href="/terms"
              className="hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              Оферта и реквизиты
            </a>
            <a
              href="mailto:themoon902448@gmail.com"
              className="hover:text-indigo-300 transition-colors"
            >
              Поддержка: themoon902448@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
