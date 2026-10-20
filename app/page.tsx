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
  Volume2,
  VolumeX,
  FastForward,
  BookmarkCheck,
  WifiOff,
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
};

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [learnedIds, setLearnedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "flashcards" | "digest">("list");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Экзаменационный таймер
  const [timerInitialSeconds, setTimerInitialSeconds] = useState(120);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerWidget, setShowTimerWidget] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Аудио-суфлер (Web Speech API)
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.2);

  const sampleQuestions = `1. Реляционные базы данных и нормализация (1NF, 2NF, 3NF).
2. Транзакции и принципы ACID: уровни изоляции.
3. Индексы в СУБД: B-Tree vs Hash-индексы.`;

  // Регистрация PWA Service Worker + детект оффлайна
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("SW registration error:", err);
        });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

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

  // Чтение localStorage
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

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  };

  const speakTicket = (item: ExamAnswer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Синтез речи не поддерживается браузером.");
      return;
    }

    if (speakingId === item.id) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();

    const textToRead = `Билет номер ${item.questionNumber}. ${item.question}. Суть: ${item.essence.join(". ")}. Главный тезис: ${item.answerGrade5.thesis}. Ответ: ${item.answerGrade5.fullAnswer}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "ru-RU";
    utterance.rate = speechRate;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(item.id);
    window.speechSynthesis.speak(utterance);
  };

  const jumpToTicket = (item: ExamAnswer) => {
    setOpenCards((prev) => ({ ...prev, [item.id]: true }));
    setHighlightedTicketId(item.id);

    if (viewMode === "flashcards") {
      const idx = filteredAnswers.findIndex((a) => a.id === item.id);
      if (idx !== -1) {
        setCurrentCardIndex(idx);
        setIsFlipped(true);
      }
    } else if (viewMode === "digest") {
      setTimeout(() => {
        const el = document.getElementById(`digest-${item.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } else {
      setTimeout(() => {
        const el = document.getElementById(`ticket-${item.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }

    setTimeout(() => {
      setHighlightedTicketId(null);
    }, 2500);
  };

  const handleAnalyze = async () => {
    const textToProcess = inputText.trim();
    if (textToProcess.length < 4) return;

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
    stopSpeech();
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-medium selection:bg-indigo-500/30 selection:text-indigo-200 pb-16">
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
            {isOffline && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <WifiOff className="w-3 h-3" /> Офлайн
              </span>
            )}

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
                {isTimerRunning ? formatTime(timeLeft) : "Таймер"}
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
        {/* Баннер офлайн-режима при отключении сети */}
        {isOffline && (
          <div className="no-print mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-200">
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Связь пропала, но всё работает! PWA-кэш сохраняет открытые билеты и функционал офлайн.
            </span>
          </div>
        )}

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
              <span className="text-xs text-zinc-400">Быстрые примеры:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputText(sampleQuestions)}
                  className="text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer"
                >
                  Базы данных (SQL)
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
                placeholder="Вставь экзаменационные вопросы или билеты — сервис сделает структурированные микрошпаргалки."
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
                  ? "Офлайн-PWA включен • Секундомер • Аудио-суфлёр • Сводка формул"
                  : `Символов: ${inputText.trim().length} • Сохранено в браузере`}
              </span>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading || inputText.trim().length < 4}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? "Разбираем через GigaChat..." : "Разобрать билеты →"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Прогресс, нумпад и переключатель режимов */}
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

            {/* НУМПАД БЫСТРОГО ПЕРЕХОДА */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <FastForward className="w-3.5 h-3.5" />
                  Прыжок к билету:
                </span>
                <span className="text-[11px] text-zinc-500">
                  Мгновенный скролл и подсветка
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {answers.map((item) => {
                  const isLearned = !!learnedIds[item.id];
                  const isCurrent = highlightedTicketId === item.id;
                  return (
                    <button
                      key={`jump-${item.id}`}
                      type="button"
                      onClick={() => jumpToTicket(item)}
                      className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/50"
                          : isLearned
                          ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/80"
                          : "bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 hover:bg-indigo-600 hover:text-white"
                      }`}
                    >
                      {item.questionNumber}
                    </button>
                  );
                })}
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
                  placeholder="Поиск по билетам, формулам, терминам..."
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

              {/* ПЕРЕКЛЮЧАТЕЛЬ 3 РЕЖИМОВ: СПИСОК / ТРЕНАЖЕР / СВОДКА (ФИЧА 1) */}
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
                  <button
                    type="button"
                    onClick={() => setViewMode("digest")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === "digest"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Шпаргалка (Сводка)</span>
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
                {viewMode === "digest"
                  ? `Сводка формул и определений (${filteredAnswers.length} билетов)`
                  : `Разобранные вопросы (${filteredAnswers.length})`}
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

          {/* ФИЧА 1: РЕЖИМ СВОДКИ (ДАЙДЖЕСТ ФОРМУЛ И ТЕРМИНОВ) */}
          {viewMode === "digest" && (
            <div className="space-y-4">
              {filteredAnswers.map((item) => (
                <div
                  key={`digest-${item.id}`}
                  id={`digest-${item.id}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-5 scroll-mt-24"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs flex items-center justify-center font-bold">
                      {item.questionNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white truncate">
                      {item.question}
                    </h3>
                  </div>

                  {/* Сетка терминов и определений */}
                  {item.keyTerms && item.keyTerms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {item.keyTerms.map((term, idx) => (
                        <div
                          key={idx}
                          className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 text-xs"
                        >
                          <span className="font-bold text-cyan-400 block mb-0.5">
                            {term.term}
                          </span>
                          <span className="text-zinc-300 leading-relaxed">
                            {term.definition}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 mb-2 italic">
                      Ключевые термины отсутствуют
                    </p>
                  )}

                  {/* Главный тезис-формула */}
                  <div className="rounded-xl bg-zinc-950/40 border border-zinc-800/60 p-3 text-xs">
                    <span className="font-bold text-emerald-400 block mb-1 uppercase tracking-wider text-[10px]">
                      Суть ответа в 1 тезис:
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {item.answerGrade5.thesis}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Режим Flashcards */}
          {viewMode === "flashcards" && activeFlashcard && (
            <div className="no-print my-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="rounded-2xl border border-indigo-500/40 bg-zinc-900/70 p-6 md:p-8 min-h-[320px] flex flex-col justify-between cursor-pointer select-none shadow-xl hover:border-indigo-400/60 transition-all"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-indigo-300 font-bold">
                      Билет #{activeFlashcard.questionNumber} из {filteredAnswers.length}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => speakTicket(activeFlashcard, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        speakingId === activeFlashcard.id
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      }`}
                      title="Озвучить билет в наушник"
                    >
                      {speakingId === activeFlashcard.id ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

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

          {/* Режим списка */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {filteredAnswers.map((item) => {
                const isOpen = !!openCards[item.id];
                const isLearned = !!learnedIds[item.id];
                const isHighlighted = highlightedTicketId === item.id;
                const isSpeakingThis = speakingId === item.id;

                return (
                  <div
                    key={item.id}
                    id={`ticket-${item.id}`}
                    className={`rounded-2xl border transition-all duration-300 scroll-mt-24 ${
                      isHighlighted
                        ? "border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-950/20 shadow-2xl"
                        : isLearned
                        ? "border-emerald-900/40 bg-zinc-950/40 opacity-80"
                        : "border-zinc-800/90 bg-zinc-900/40 shadow-sm hover:border-zinc-700/80"
                    }`}
                  >
                    <div
                      onClick={() => toggleCard(item.id)}
                      className="p-4 md:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded-md text-xs flex items-center justify-center font-bold border ${
                            isHighlighted
                              ? "bg-indigo-600 border-indigo-400 text-white"
                              : "bg-zinc-800 border-zinc-700/60 text-zinc-300"
                          }`}
                        >
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

                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => speakTicket(item, e)}
                          title="Озвучить для микронаушника"
                          className={`no-print p-1.5 rounded-lg border transition-colors ${
                            isSpeakingThis
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-md animate-pulse"
                              : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white hover:bg-zinc-700"
                          }`}
                        >
                          {isSpeakingThis ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => toggleLearned(item.id, e)}
                          title="Отметить как выученное"
                          className={`no-print p-1.5 rounded-lg transition-colors ${
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

      {/* Плеер суфлера */}
      {speakingId && (
        <aside aria-label="Плеер аудио-суфлёра" className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/60 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white">Суфлёр в наушнике</span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {[1.0, 1.2, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeechRate(rate)}
                className={`px-2 py-0.5 text-[11px] rounded-lg font-bold transition-colors cursor-pointer ${
                  speechRate === rate
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={stopSpeech}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Стоп</span>
          </button>
        </aside>
      )}

      {/* Футер с реквизитами для ЮKassa */}
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
