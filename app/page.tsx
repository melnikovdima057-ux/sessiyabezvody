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

interface Review {
  id: string;
  name: string;
  subject: string;
  rating: number;
  text: string;
  date: string;
  approved?: boolean;
}

const LOADING_STATUSES = [
  "Анализируем список вопросов...",
  "Убираем воду и выделяем суть...",
  "Формируем ответы на оценку 5...",
  "Выделяем формулы и определения...",
  "Почти готово, финализируем билеты...",
];

const FAQ_ITEMS = [
  {
    q: "Что делать, если в аудитории глушат связь или нет интернета?",
    a: "Нажми кнопку «💾 Офлайн HTML» над списком билетов. Сервис скачает один автономный HTML-файл, в котором уже есть все твои билеты, стили и мгновенный поиск. Он открывается в любом браузере даже в авиарежиме.",
  },
  {
    q: "Как работает экстренная очистка (Panic Wipe)?",
    a: "Нажми сочетание клавиш Shift + Esc или кликни по кнопке «🚨 Стереть всё» в шапке. Сайт моментально затрёт локальное хранилище, удалит все билеты и перенаправит вкладку на главную страницу Google.",
  },
  {
    q: "Подойдёт ли сервис для точных и технических предметов?",
    a: "Да, система специально натренирована на формулы, физические законы, технические определения и электротехнику. Формулы и термины выносятся в отдельные визуальные блоки.",
  },
  {
    q: "Как быстро проходит оплата 49 ₽?",
    a: "Оплата проходит мгновенно через Систему быстрых платежей (СБП) по QR-коду любого банка РФ. Доступ разблокируется сразу после подтверждения платежа.",
  },
];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
// Предложить идею
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaContact, setIdeaContact] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [submittingIdea, setSubmittingIdea] = useState(false);

  const handleSendIdea = async () => {
    if (!ideaText.trim()) return;
    setSubmittingIdea(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: ideaContact,
          text: ideaText,
        }),
      });
      if (res.ok) {
        setShowIdeaModal(false);
        setIdeaContact("");
        setIdeaText("");
        alert("Спасибо за идею! Мы обязательно её изучим :)");
      }
    } catch (e) {
      alert("Не удалось отправить идею");
    } finally {
      setSubmittingIdea(false);
    }
  };
  // Анимация счётчиков (ровно 5 секунд)
  const [statTickets, setStatTickets] = useState(0);
  const [statRating, setStatRating] = useState(1.0);
  const [statSeconds, setStatSeconds] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 секунд
    const startTime = performance.now();

    const updateCounters = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Плавное торможение к концу (easeOutQuad)
      const ease = 1 - (1 - progress) * (1 - progress);

      setStatTickets(Math.floor(ease * 1840));
      setStatRating(Number((1.0 + ease * 3.9).toFixed(1)));
      setStatSeconds(Math.floor(ease * 45));

      if (progress < 1) {
        requestAnimationFrame(updateCounters);
      }
    };

    const frameId = requestAnimationFrame(updateCounters);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // FAQ аккордеон
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Отзывы
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [revName, setRevName] = useState("");
  const [revSubject, setRevSubject] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Режим True Matte
  const [isTrueMatte, setIsTrueMatte] = useState(false);

  // Синхронизация ПК -> Телефон
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [inputSyncCode, setInputSyncCode] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncTab, setSyncTab] = useState<"send" | "receive">("send");

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

  // Свайп-навигация
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

 useEffect(() => {
    const savedToken = localStorage.getItem("examzero_token");
    if (savedToken) {
      setHasPaid(true);
    }

    const matteInStorage = localStorage.getItem("sessiya_matte") === "true";
    if (matteInStorage) setIsTrueMatte(true);

    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("payment_id");

    if (paymentId) {
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.token) {
            localStorage.setItem("examzero_token", data.token);
            setHasPaid(true);
            window.history.replaceState({}, document.title, window.location.pathname);
            alert("Оплата успешно подтверждена! Полный доступ открыт :)");
          }
        })
        .catch(() => {});
    }

    const codeParam = urlParams.get("sync");
    if (codeParam) {
      fetchTicketsByCode(codeParam);
    }

    fetchReviews();
  }, []);
  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {}
  };

  const handleSendReview = async () => {
    if (!revText.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: revName,
          subject: revSubject,
          rating: revRating,
          text: revText,
        }),
      });
      if (res.ok) {
        setShowReviewModal(false);
        setRevText("");
        setRevSubject("");
        setRevName("");
        alert("Спасибо! Отзыв отправлен на модерацию и скоро появится на сайте :)");
      }
    } catch (e) {
      alert("Не удалось отправить отзыв");
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleTrueMatte = () => {
    setIsTrueMatte((prev) => {
      const next = !prev;
      localStorage.setItem("sessiya_matte", String(next));
      return next;
    });
  };

  useEffect(() => {
    let interval: any = null;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [loading]);

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

  const handlePanicWipe = () => {
    setInputText("");
    setTickets([]);
    setSelectedTicket(null);
    setSearchQuery("");
    setFileStatus(null);
    try {
      localStorage.removeItem("sessiya_paid");
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = "https://www.google.com";
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        handlePanicWipe();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "ArrowLeft") {
        goToPrevTicket();
      } else if (e.key === "ArrowRight") {
        goToNextTicket();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTicket, tickets, searchQuery]);

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

  const currentIndex = useMemo(() => {
    if (!selectedTicket || filteredTickets.length === 0) return -1;
    return filteredTickets.findIndex((t) => t.id === selectedTicket.id);
  }, [selectedTicket, filteredTickets]);

  const goToPrevTicket = () => {
    if (currentIndex > 0) {
      setSelectedTicket(filteredTickets[currentIndex - 1]);
    }
  };

  const goToNextTicket = () => {
    if (currentIndex >= 0 && currentIndex < filteredTickets.length - 1) {
      setSelectedTicket(filteredTickets[currentIndex + 1]);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) goToNextTicket();
    else if (diff < -50) goToPrevTicket();
    touchStartX.current = null;
    touchEndX.current = null;
  };

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

  const handleGenerateSyncCode = async () => {
    if (tickets.length === 0) return;
    setSyncLoading(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets }),
      });
      const data = await res.json();
      if (data.code) {
        setSyncCode(data.code);
      } else {
        alert("Не удалось создать код синхронизации");
      }
    } catch (err) {
      alert("Ошибка при синхронизации");
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchTicketsByCode = async (codeToFetch: string) => {
    if (!codeToFetch.trim()) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(codeToFetch.trim())}`);
      const data = await res.json();
      if (data.tickets && data.tickets.length > 0) {
        setTickets(data.tickets);
        setSelectedTicket(data.tickets[0]);
        setShowSyncModal(false);
        setInputSyncCode("");
        alert(`Успешно загружено ${data.tickets.length} билетов!`);
      } else {
        alert(data.error || "Код не найден или устарел");
      }
    } catch (err) {
      alert("Ошибка подключения к серверу");
    } finally {
      setSyncLoading(false);
    }
  };

 const handleGenerate = async () => {
    if (!inputText.trim()) return;

    const lines = inputText.split("\n").filter((l) => l.trim().length > 3);
    const token = localStorage.getItem("examzero_token");

    if (lines.length > 2 && !hasPaid) {
      setShowPayModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionsText: inputText, token }),
      });

      if (res.status === 402) {
        setShowPayModal(true);
        throw new Error("Требуется оплата");
      }

      if (!res.ok) throw new Error("Ошибка генерации");

      const data = await res.json();
      setTickets(data);
      if (data.length > 0) setSelectedTicket(data[0]);
    } catch (err: any) {
      if (err.message !== "Требуется оплата") {
        alert("Не удалось разобрать билеты. Попробуй ещё раз :)");
      }
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

  // Offline Drop
  const downloadOfflineHtml = () => {
    if (tickets.length === 0) return;

    const ticketsJson = JSON.stringify(tickets).replace(/</g, "\\u003c");

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ExamZero Offline</title>
<style>
  body { background: #121212; color: #a0a6b1; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 14px; line-height: 1.4; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #262626; padding-bottom: 10px; margin-bottom: 12px; }
  h1 { font-size: 16px; margin: 0; color: #818cf8; }
  #search { width: 100%; box-sizing: border-box; background: #1a1a1a; border: 1px solid #333; color: #eee; padding: 8px 10px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
  .grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .btn-num { background: #1c1c1c; border: 1px solid #333; color: #bbb; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; }
  .btn-num.active { background: #4f46e5; border-color: #6366f1; color: #fff; }
  .card { background: #181818; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px; }
  .card h2 { font-size: 15px; margin: 4px 0 10px 0; color: #eee; }
  .box { background: #1f1f1f; border-left: 3px solid #6366f1; padding: 8px 10px; border-radius: 4px; margin-top: 10px; font-size: 13px; }
  .box.grade5 { border-left-color: #10b981; color: #ccc; }
  .box.tips { border-left-color: #f59e0b; color: #e5e7eb; font-size: 12px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; margin-bottom: 4px; color: #888; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 4px; }
</style>
</head>
<body>
<header>
  <h1>ExamZero Offline</h1>
  <span style="font-size: 11px; color: #666;">100% Автономно</span>
</header>
<input type="text" id="search" placeholder="Поиск по билетам и терминам..." oninput="onSearch(this.value)">
<div class="grid" id="nums"></div>
<div id="content"></div>
<script>
  const tickets = ${ticketsJson};
  let currentId = tickets[0]?.id || "";

  function renderNums(list) {
    const el = document.getElementById("nums");
    el.innerHTML = list.map(t => \`<button class="btn-num \${t.id === currentId ? 'active' : ''}" onclick="selectTicket('\${t.id}')">\${t.questionNumber}</button>\`).join("");
  }

  function renderTicket(t) {
    const el = document.getElementById("content");
    if (!t) { el.innerHTML = "<p>Ничего не найдено</p>"; return; }
    el.innerHTML = \`
      <div class="card">
        <div style="font-size: 11px; color: #818cf8; font-weight: bold;">Билет #\${t.questionNumber}</div>
        <h2>\${t.question}</h2>
        <div class="box">
          <div class="label" style="color: #818cf8;">⚡ Главная суть:</div>
          <ul>\${(t.essence || []).map(e => \`<li>\${e}</li>\`).join("")}</ul>
        </div>
        <div class="box grade5">
          <div class="label" style="color: #34d399;">🎓 Ответ на 5:</div>
          <p style="margin: 0 0 6px 0; font-style: italic; color: #888;">«\${t.answerGrade5?.thesis || ''}»</p>
          <p style="margin: 0;">\${t.answerGrade5?.fullAnswer || ''}</p>
        </div>
        \${t.answerGrade5?.examinerTips ? \`<div class="box tips">💡 <strong>Лайфхак:</strong> \${t.answerGrade5.examinerTips}</div>\` : ''}
      </div>
    \`;
  }

  function selectTicket(id) {
    currentId = id;
    const t = tickets.find(x => x.id === id);
    renderNums(tickets);
    renderTicket(t);
  }

  function onSearch(query) {
    const q = query.toLowerCase().trim();
    const filtered = tickets.filter(t => 
      t.question.toLowerCase().includes(q) ||
      String(t.questionNumber).includes(q) ||
      (t.essence && t.essence.some(e => e.toLowerCase().includes(q))) ||
      (t.answerGrade5 && t.answerGrade5.fullAnswer.toLowerCase().includes(q))
    );
    renderNums(filtered);
    renderTicket(filtered[0] || null);
  }

  selectTicket(currentId);
</script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ExamZero_Offline.html";
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareUrl =
    typeof window !== "undefined" && syncCode
      ? `${window.location.origin}/?sync=${syncCode}`
      : "";

  return (
    <main
      className={`min-h-screen p-4 md:p-8 font-sans pb-24 md:pb-12 transition-colors ${
        isTrueMatte
          ? "bg-[#161616] text-[#7a828e]"
          : "bg-[#0d0f12] text-gray-100"
      }`}
    >
      {/* Хедер ExamZero */}
      <header
        className={`max-w-5xl mx-auto flex justify-between items-center pb-6 border-b ${
          isTrueMatte ? "border-[#262626]" : "border-gray-800"
        }`}
      >
        <div>
          <button
            onClick={() => setShowAboutModal(true)}
            className="group text-left flex items-center gap-2 transition-transform active:scale-95"
            title="О сервисе ExamZero"
          >
            <h1
              className={`text-xl md:text-2xl font-black tracking-tight flex items-center gap-1.5 transition-colors ${
                isTrueMatte ? "text-[#949ba6]" : "text-white"
              }`}
            >
              <span className={isTrueMatte ? "text-[#7a828e]" : "text-indigo-500"}>
                Exam
              </span>
              Zero
            </h1>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase transition-colors ${
                isTrueMatte
                  ? "bg-[#222] text-[#888] border border-[#333]"
                  : "bg-indigo-950/80 text-indigo-300 border border-indigo-700/60"
              }`}
            >
              AI ℹ️
            </span>
          </button>
          <div className="flex items-center gap-2 mt-0.5">
            <p
              className={`text-xs md:text-sm ${
                isTrueMatte ? "text-[#555]" : "text-gray-400"
              }`}
            >
              Микрошпаргалки без воды
            </p>
            <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
              ⭐ {statRating.toFixed(1)}/5.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* True Matte */}
          <button
            onClick={toggleTrueMatte}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
              isTrueMatte
                ? "bg-[#222] border-[#444] text-[#aaa]"
                : "bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500"
            }`}
            title="Режим True Matte (матовый графит без бликов)"
          >
            <span>🕶️</span>
            <span className="hidden sm:inline">
              {isTrueMatte ? "Matte ON" : "True Matte"}
            </span>
          </button>

          {/* Panic Wipe */}
          <button
            onClick={handlePanicWipe}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
              isTrueMatte
                ? "bg-[#202020] border-[#333] text-[#777] hover:text-red-400"
                : "bg-gray-900 border-gray-800 hover:border-rose-500/60 text-gray-400 hover:text-rose-400"
            }`}
            title="Экстренная зачистка и переход в Google (Shift + Esc)"
          >
            <span>🚨</span>
            <span className="hidden sm:inline">Стереть всё</span>
          </button>

          {/* Синхронизация */}
          <button
            onClick={() => {
              if (tickets.length > 0 && !syncCode) {
                handleGenerateSyncCode();
                setSyncTab("send");
              } else if (tickets.length === 0) {
                setSyncTab("receive");
              }
              setShowSyncModal(true);
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
              isTrueMatte
                ? "bg-[#202020] border-[#333] text-[#888]"
                : "bg-gray-900 border-gray-700 hover:border-indigo-500 text-gray-200"
            }`}
            title="Синхронизация с телефоном"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Телефон</span>
          </button>

          {/* Таймер */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-mono ${
              isTrueMatte
                ? "bg-[#1c1c1c] border-[#2e2e2e] text-[#888]"
                : "bg-gray-900 border-gray-700 text-gray-200"
            }`}
          >
            ⏱ {Math.floor(timerSeconds / 60)}:
            {(timerSeconds % 60).toString().padStart(2, "0")}
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                isTrueMatte
                  ? "bg-[#333] text-[#bbb]"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              }`}
            >
              {isTimerRunning ? "Пауза" : "Старт"}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(120);
              }}
              className="text-gray-500 hover:text-white"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      {/* Основная рабочая зона */}
      <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <section className="md:col-span-5 flex flex-col gap-4">
          <div
            className={`border p-4 rounded-xl shadow-lg ${
              isTrueMatte
                ? "bg-[#1c1c1c] border-[#292929]"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <label
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isTrueMatte ? "text-[#666]" : "text-gray-400"
                }`}
              >
                Список билетов:
              </label>
              <div className="flex items-center gap-2.5">
                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setFileStatus(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
                    title="Очистить всё поле ввода"
                  >
                    ✕ Очистить
                  </button>
                )}
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
                  className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                    isTrueMatte
                      ? "text-[#888] hover:text-[#bbb]"
                      : "text-indigo-400 hover:text-indigo-300"
                  }`}
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
                className={`w-full border rounded-lg p-3 text-sm focus:outline-none resize-none ${
                  isTrueMatte
                    ? "bg-[#141414] border-[#2c2c2c] text-[#999] focus:border-[#555]"
                    : "bg-[#14181f] border-gray-700 text-gray-200 focus:border-indigo-500"
                }`}
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

            <div
              className={`flex justify-between items-center mt-3 text-xs ${
                isTrueMatte ? "text-[#555]" : "text-gray-400"
              }`}
            >
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
              className={`w-full mt-3 py-2.5 px-4 font-medium rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow ${
                isTrueMatte
                  ? "bg-[#2a2a2a] hover:bg-[#333] text-[#bbb] disabled:bg-[#1a1a1a] disabled:text-[#444]"
                  : "bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-400 text-white"
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2 transition-all">
                  <span className="animate-spin">⏳</span>
                  <span>{LOADING_STATUSES[loadingStep]}</span>
                </span>
              ) : (
                "✨ Разобрать билеты"
              )}
            </button>
          </div>

          {tickets.length > 0 && (
            <div
              className={`border p-4 rounded-xl shadow flex flex-col gap-3 ${
                isTrueMatte
                  ? "bg-[#1c1c1c] border-[#292929]"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по терминам, формулам..."
                  className={`w-full border rounded-lg pl-8 pr-12 py-2 text-xs focus:outline-none ${
                    isTrueMatte
                      ? "bg-[#141414] border-[#2c2c2c] text-[#aaa] focus:border-[#444]"
                      : "bg-[#14181f] border-gray-700 text-gray-200 focus:border-indigo-500"
                  }`}
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
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    isTrueMatte ? "text-[#666]" : "text-gray-400"
                  }`}
                >
                  Билеты ({filteredTickets.length} из {tickets.length}):
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={downloadOfflineHtml}
                    className="text-[11px] bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 px-2 py-1 rounded transition-colors"
                    title="Скачать автономный HTML-файл для работы без интернета"
                  >
                    💾 Офлайн HTML
                  </button>
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
                        ? isTrueMatte
                          ? "bg-[#333] border-[#555] text-white"
                          : "bg-indigo-600 border-indigo-400 text-white shadow"
                        : isTrueMatte
                        ? "bg-[#141414] border-[#292929] text-[#777] hover:border-[#444]"
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

        {/* Раздел билетов */}
        <section
          className="md:col-span-7"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {selectedTicket ? (
            <div
              className={`border p-6 rounded-xl shadow-lg flex flex-col gap-5 select-none md:select-text ${
                isTrueMatte
                  ? "bg-[#1c1c1c] border-[#292929]"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono border ${
                        isTrueMatte
                          ? "bg-[#252525] text-[#888] border-[#383838]"
                          : "bg-indigo-900/50 text-indigo-300 border-indigo-700/50"
                      }`}
                    >
                      Билет #{selectedTicket.questionNumber}
                    </span>
                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      (Свайп для листания)
                    </span>
                  </div>
                  <h2
                    className={`text-lg font-bold mt-1 ${
                      isTrueMatte ? "text-[#b0b7c3]" : "text-white"
                    }`}
                  >
                    {selectedTicket.question}
                  </h2>
                </div>
                <button
                  onClick={() =>
                    speakText(
                      `${selectedTicket.question}. Главная мысль: ${selectedTicket.answerGrade5.thesis}. ${selectedTicket.answerGrade5.fullAnswer}`
                    )
                  }
                  className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors shrink-0 ${
                    isTrueMatte
                      ? "bg-[#222] border-[#333] text-[#888]"
                      : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200"
                  }`}
                  title="Аудио-суфлёр в наушник"
                >
                  🎧 Озвучить
                </button>
              </div>

              <div
                className={`border p-3.5 rounded-lg ${
                  isTrueMatte
                    ? "bg-[#141414] border-[#262626]"
                    : "bg-[#14181f] border-gray-800"
                }`}
              >
                <span
                  className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                    isTrueMatte ? "text-[#7a828e]" : "text-indigo-400"
                  }`}
                >
                  ⚡ Суть за 1 минуту (тезисы):
                </span>
                <ul
                  className={`list-disc list-inside space-y-1 text-sm ${
                    isTrueMatte ? "text-[#8c94a0]" : "text-gray-300"
                  }`}
                >
                  {selectedTicket.essence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div
                className={`border p-3.5 rounded-lg ${
                  isTrueMatte
                    ? "bg-[#141414] border-[#262626]"
                    : "bg-[#14181f] border-gray-800"
                }`}
              >
                <span
                  className={`text-xs font-semibold uppercase tracking-wider block mb-1 ${
                    isTrueMatte ? "text-[#7a828e]" : "text-emerald-400"
                  }`}
                >
                  🎓 Ответ на оценку «Отлично»:
                </span>
                <p
                  className={`text-xs italic mb-2 ${
                    isTrueMatte ? "text-[#666]" : "text-gray-400"
                  }`}
                >
                  «{selectedTicket.answerGrade5.thesis}»
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    isTrueMatte ? "text-[#8c94a0]" : "text-gray-200"
                  }`}
                >
                  {selectedTicket.answerGrade5.fullAnswer}
                </p>
                {selectedTicket.answerGrade5.examinerTips && (
                  <div
                    className={`mt-3 pt-2 border-t text-xs flex gap-1.5 items-center ${
                      isTrueMatte
                        ? "border-[#242424] text-[#777]"
                        : "border-gray-800/80 text-amber-300/90"
                    }`}
                  >
                    <span>💡 Лайфхак преподавателя:</span>
                    <span>{selectedTicket.answerGrade5.examinerTips}</span>
                  </div>
                )}
              </div>

              {selectedTicket.keyTerms && selectedTicket.keyTerms.length > 0 && (
                <div
                  className={`border p-3.5 rounded-lg ${
                    isTrueMatte
                      ? "bg-[#141414] border-[#262626]"
                      : "bg-[#14181f] border-gray-800"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${
                      isTrueMatte ? "text-[#7a828e]" : "text-blue-400"
                    }`}
                  >
                    🔑 Термины и определения:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {selectedTicket.keyTerms.map((t, i) => (
                      <div
                        key={i}
                        className={isTrueMatte ? "text-[#777]" : "text-gray-300"}
                      >
                        <strong
                          className={isTrueMatte ? "text-[#aaa]" : "text-white"}
                        >
                          {t.term}
                        </strong>{" "}
                        — {t.definition}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`border p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[350px] ${
                isTrueMatte
                  ? "bg-[#1c1c1c] border-[#292929] text-[#555]"
                  : "bg-gray-900 border-gray-800 text-gray-500"
              }`}
            >
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

      {/* 1. ПОЛОСА ЖИВОЙ СТАТИСТИКИ (анимация ровно за 10 сек) */}
      <section className="max-w-5xl mx-auto mt-12">
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl border shadow-lg ${
            isTrueMatte
              ? "bg-[#1a1a1a] border-[#262626]"
              : "bg-gray-900/90 border-gray-800"
          }`}
        >
          <div className="text-center md:text-left">
            <span className="text-2xl md:text-3xl font-black font-mono text-indigo-400">
              {statTickets.toLocaleString("ru-RU")}+
            </span>
            <p className="text-xs text-gray-400 mt-0.5">разобранных билетов</p>
          </div>

          <div className="text-center md:text-left border-l border-gray-800/80 pl-0 md:pl-4">
            <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
              {statRating.toFixed(1)} / 5.0
            </span>
            <p className="text-xs text-gray-400 mt-0.5">средняя оценка на сдаче</p>
          </div>

          <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-gray-800/80 pt-3 md:pt-0 pl-0 md:pl-4">
            <span className="text-2xl md:text-3xl font-black font-mono text-amber-400">
              {statSeconds} сек
            </span>
            <p className="text-xs text-gray-400 mt-0.5">на чтение сути билета</p>
          </div>

          <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-gray-800/80 pt-3 md:pt-0 pl-0 md:pl-4">
            <span className="text-2xl md:text-3xl font-black font-mono text-blue-400">
              0 Мб
            </span>
            <p className="text-xs text-gray-400 mt-0.5">интернета в офлайн-режиме</p>
          </div>
        </div>
      </section>

      {/* 2. БЛОК «КАК ЭТО РАБОТАЕТ ЗА 3 ШАГА» */}
      <section className="max-w-5xl mx-auto mt-14">
        <div className="text-center max-w-lg mx-auto mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            Простой алгоритм
          </span>
          <h3 className="text-xl md:text-2xl font-black text-white mt-1">
            Как закрыть сессию за 3 шага
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#181818] border-[#262626]"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <div>
              <span className="text-3xl font-black font-mono text-indigo-500/40 block mb-2">
                01
              </span>
              <h4 className="font-bold text-white text-base mb-1.5">
                Загрузи вопросы
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Вставь список текстом, загрузи документ Word (.docx), файл .txt или нажми Ctrl + V со скриншотом вопросов с доски.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/60 text-[11px] text-indigo-400 font-mono">
              OCR распознавание в 1 клик
            </div>
          </div>

          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#181818] border-[#262626]"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <div>
              <span className="text-3xl font-black font-mono text-emerald-500/40 block mb-2">
                02
              </span>
              <h4 className="font-bold text-white text-base mb-1.5">
                Получи выжимку без воды
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Сервис удалит лишние рассуждения из учебников, оставив суть за 1 минуту, академический тезис на 5 и формулы.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/60 text-[11px] text-emerald-400 font-mono">
              Никакой академической воды
            </div>
          </div>

          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#181818] border-[#262626]"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <div>
              <span className="text-3xl font-black font-mono text-amber-500/40 block mb-2">
                03
              </span>
              <h4 className="font-bold text-white text-base mb-1.5">
                Сдавай без палева
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Передай билеты на смартфон по QR-коду, включи режим True Matte без бликов на очках или листай свайпами под партой.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800/60 text-[11px] text-amber-400 font-mono">
              Синхронизация ПК ➔ Телефон
            </div>
          </div>
        </div>
      </section>

      {/* 3. BENTO GRID «СТЕЛС-ФИЧИ ДЛЯ СДАЧИ» */}
      <section className="max-w-5xl mx-auto mt-14">
        <div className="text-center max-w-lg mx-auto mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            ExamZero Stealth
          </span>
          <h3 className="text-xl md:text-2xl font-black text-white mt-1">
            Создано под реальные экзамены
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Инструменты, которых нет в обычных конспектах и стандартных нейросетях
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Большая карточка: True Matte */}
          <div
            className={`md:col-span-2 p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#1a1a1a] border-[#2c2c2c]"
                : "bg-[#121620] border-indigo-950"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">🕶️</span>
              <span className="text-[10px] font-mono bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded uppercase">
                Анти-блик
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Режим True Matte (Матовый графит)
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Убирает все контрастные белые и синие пиксели. Экран телефона окрашивается в глубокий матовый графитовый тон, который не отражается на оправе очков, не освещает лицо и не привлекает внимание преподавателя в полутёмной аудитории.
              </p>
            </div>
          </div>

          {/* Карточка: Offline Drop */}
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#1a1a1a] border-[#2c2c2c]"
                : "bg-[#11141a] border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">💾</span>
              <span className="text-[10px] font-mono bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded uppercase">
                Без сети
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Офлайн HTML-файл
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Скачай автономный файл весом в пару килобайт. Работает при включенных глушилках и в подвальных кабинетах без подключения к сети.
              </p>
            </div>
          </div>

          {/* Карточка: Panic Wipe */}
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#1a1a1a] border-[#2c2c2c]"
                : "bg-[#11141a] border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">🚨</span>
              <span className="text-[10px] font-mono bg-rose-950 border border-rose-800 text-rose-300 px-2 py-0.5 rounded uppercase">
                Shift + Esc
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Panic Wipe
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Если препод подходит к парте и просит показать телефон — нажатие одной кнопки стирает кэш и перенаправляет на Google.
              </p>
            </div>
          </div>

          {/* Карточка: Управление под партой */}
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#1a1a1a] border-[#2c2c2c]"
                : "bg-[#11141a] border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">👆</span>
              <span className="text-[10px] font-mono bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded uppercase">
                One Hand
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Свайпы одной рукой
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Листай билеты простым смахиванием пальца или компактным плавающим пультом внизу экрана без лишних движений.
              </p>
            </div>
          </div>

          {/* Карточка: Аудиосуфлёр */}
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between ${
              isTrueMatte
                ? "bg-[#1a1a1a] border-[#2c2c2c]"
                : "bg-[#11141a] border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">🎧</span>
              <span className="text-[10px] font-mono bg-blue-950 border border-blue-800 text-blue-300 px-2 py-0.5 rounded uppercase">
                Суфлёр
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1.5">
                Озвучка в наушник
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Голосовой движок диктует главную мысль и тезис прямо в беспроводной наушник на скорости 1.05x.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. СЕКЦИЯ ОТЗЫВОВ */}
      <section className="max-w-5xl mx-auto mt-14 pt-8 border-t border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>💬 Отзывы студентов</span>
              <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                ⭐ {statRating.toFixed(1)} из 5.0
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Реальный опыт сдачи зачётов, коллоквиумов и экзаменов
            </p>
          </div>

          <button
            onClick={() => setShowReviewModal(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors shadow flex items-center gap-1.5"
          >
            <span>✍️</span> Написать отзыв
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`border p-4 rounded-xl flex flex-col justify-between ${
                isTrueMatte
                  ? "bg-[#1a1a1a] border-[#2c2c2c]"
                  : "bg-[#11141a] border-gray-800"
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-xs text-white">
                    {rev.name}
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">
                    {"★".repeat(rev.rating)}
                  </span>
                </div>
                <div className="text-[11px] text-indigo-400 font-medium mb-2 truncate">
                  {rev.subject}
                </div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                  «{rev.text}»
                </p>
              </div>
              <div className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-gray-800/60">
                {rev.date}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. АККОРДЕОН FAQ */}
      <section className="max-w-3xl mx-auto mt-14 pt-8 border-t border-gray-800">
        <div className="text-center mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">
            Вопросы и ответы
          </span>
          <h3 className="text-xl font-black text-white mt-1">
            Частые вопросы перед экзаменом
          </h3>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className={`border rounded-xl transition-all overflow-hidden ${
                isTrueMatte
                  ? "bg-[#181818] border-[#292929]"
                  : "bg-[#11141a] border-gray-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex justify-between items-center gap-3 text-xs md:text-sm font-semibold text-gray-200 hover:text-white"
              >
                <span>{item.q}</span>
                <span className="text-gray-500 font-mono text-base shrink-0">
                  {openFaq === idx ? "−" : "+"}
                </span>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed border-t border-gray-800/60">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Футер сервиса */}
      <footer className="max-w-5xl mx-auto mt-16 pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
        <div>
          © 2026 <span className="text-gray-300 font-bold">ExamZero</span>. Ноль воды на экзаменах.
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAboutModal(true)}
            className="hover:text-gray-300 transition-colors"
          >
            О сервисе
          </button>
          <button
            onClick={() => setShowIdeaModal(true)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>💡</span> Предложить идею
          </button>
          <a
            href="mailto:support@examzero.ru"
            className="hover:text-gray-300 transition-colors"
          >
            Поддержка
          </a>
        </div>
      </footer>

      {/* Панель для управления одной рукой под партой */}
      {selectedTicket && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 backdrop-blur-md border px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 ${
            isTrueMatte
              ? "bg-[#1c1c1c]/95 border-[#333]"
              : "bg-gray-900/90 border-gray-700"
          }`}
        >
          <button
            onClick={goToPrevTicket}
            disabled={currentIndex <= 0}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 flex items-center justify-center text-xs text-white transition-colors"
            title="Предыдущий билет"
          >
            ←
          </button>

          <span className="text-xs font-mono text-gray-300 min-w-[70px] text-center">
            {currentIndex + 1} / {filteredTickets.length}
          </span>

          <button
            onClick={goToNextTicket}
            disabled={currentIndex >= filteredTickets.length - 1}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 flex items-center justify-center text-xs text-white transition-colors"
            title="Следующий билет"
          >
            →
          </button>
        </div>
      )}

      {/* Модальное окно написания отзыва */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141a] border border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                ✍️ Написать отзыв
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Имя или ник:</label>
                <input
                  type="text"
                  value={revName}
                  onChange={(e) => setRevName(e.target.value)}
                  placeholder="Например: Никита или Аноним"
                  className="w-full bg-[#171b23] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Сдаваемый предмет:</label>
                <input
                  type="text"
                  value={revSubject}
                  onChange={(e) => setRevSubject(e.target.value)}
                  placeholder="Физика, ТОЭ, История, Вышмат..."
                  className="w-full bg-[#171b23] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Оценка:</label>
                <div className="flex gap-2">
                  {[5, 4, 3].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRevRating(star)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        revRating === star
                          ? "bg-amber-500/20 border-amber-500 text-amber-400"
                          : "bg-[#171b23] border-gray-700 text-gray-400"
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Твой отзыв:</label>
                <textarea
                  rows={4}
                  value={revText}
                  onChange={(e) => setRevText(e.target.value)}
                  placeholder="Как помогли шпоры, что сдавал, как отреагировал препод..."
                  className="w-full bg-[#171b23] border border-gray-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={handleSendReview}
                disabled={submittingReview || !revText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-xs font-semibold rounded-xl text-white transition-colors mt-1"
              >
                {submittingReview ? "Отправляем..." : "Опубликовать отзыв"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно синхронизации ПК -> Телефон */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141a] border border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                📱 Синхронизация билетов
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-gray-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-[#171b23] p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setSyncTab("send")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  syncTab === "send"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Отправить с ПК
              </button>
              <button
                onClick={() => setSyncTab("receive")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  syncTab === "receive"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Ввести код
              </button>
            </div>

            {syncTab === "send" ? (
              <div className="flex flex-col items-center gap-3 py-2">
                {tickets.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Сначала разбери билеты на ПК, чтобы передать их на телефон :)
                  </p>
                ) : syncLoading ? (
                  <p className="text-xs text-indigo-400 animate-pulse">
                    Генерация защитного кода...
                  </p>
                ) : syncCode ? (
                  <>
                    <p className="text-xs text-gray-400">
                      Отсканируй камерой смартфона или введи код на сайте в телефоне:
                    </p>
                    <div className="bg-white p-2 rounded-xl shadow">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          shareUrl
                        )}`}
                        alt="QR код для синхронизации"
                        className="w-36 h-36"
                      />
                    </div>
                    <div className="bg-[#171b23] border border-indigo-700/60 px-4 py-2 rounded-xl">
                      <span className="text-xs text-gray-400 block">Пин-код:</span>
                      <span className="text-2xl font-black font-mono tracking-widest text-indigo-400">
                        {syncCode}
                      </span>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={handleGenerateSyncCode}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white transition-colors"
                  >
                    Сгенерировать код и QR
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-xs text-gray-400">
                  Введи 4-значный пин-код с экрана монитора:
                </p>
                <input
                  type="text"
                  maxLength={4}
                  value={inputSyncCode}
                  onChange={(e) => setInputSyncCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Например: 4819"
                  className="bg-[#171b23] border border-gray-700 rounded-xl p-3 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => fetchTicketsByCode(inputSyncCode)}
                  disabled={syncLoading || inputSyncCode.length !== 4}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-xs font-semibold rounded-xl text-white transition-colors"
                >
                  {syncLoading ? "Загружаем билеты..." : "Загрузить на телефон"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                  Твой личный ассистент для быстрой сдачи зачётов и сессии
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
                ExamZero убирает до 90% «воды» из учебников и лекций. Наш сайт превращает огромные темы в ёмкие карточки: главная мысль за 1 минуту, академический ответ на 5, формулы и частые подвохи преподавателей.
              </div>

              <div className="bg-[#171b23] p-3 rounded-xl border border-gray-800/80">
                <span className="font-bold text-white text-sm block mb-1">
                  🚀 Встроенные возможности:
                </span>
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                  <li><strong>Офлайн HTML-файл:</strong> скачай билеты одним файлом и открывай без интернета.</li>
                  <li><strong>Режим True Matte:</strong> матовый анти-бликовый экран без цветных отблесков на очках.</li>
                  <li><strong>Быстрая очистка:</strong> кнопка «✕ Очистить» в поле ввода или мгновенный Panic Wipe (Shift + Esc) со стиранием всех данных.</li>
                  <li><strong>Синхронизация с телефоном:</strong> отправь билеты на смартфон за секунду по QR или 4 цифрам.</li>
                  <li><strong>Свайп-навигация:</strong> листай билеты пальцем одной рукой под партой или стрелками на клавиатуре.</li>
                  <li><strong>Загрузка в 1 клик:</strong> вставка текста, файлов Word (.docx), текстовых файлов (.txt) или фото с доски.</li>
                  <li><strong>OCR и скриншоты:</strong> нажми Ctrl + V со скриншотом в буфере обмена — текст распознается автоматически.</li>
                  <li><strong>Аудио-суфлёр:</strong> озвучка ответа прямо в беспроводной наушник.</li>
                  <li><strong>Моментальный поиск (Ctrl + K):</strong> мгновенно находит нужный билет прямо на экзамене.</li>
                  <li><strong>Экзаменационный таймер:</strong> тренировка ответа за 2 минуты.</li>
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
              <span className="text-[10px] text-emerald-400 mt-1 block">
                ⭐ 4.9/5 — проверено на реальных зачётах
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
      {/* Модальное окно «Предложить идею» */}
      {showIdeaModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141a] border border-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                💡 Предложить улучшение
              </h3>
              <button
                onClick={() => setShowIdeaModal(false)}
                className="text-gray-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Напиши, какой фичи тебе не хватает для комфортной сдачи, или поделись идеей:
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Твой контакт (ТГ, VK или ник):
                </label>
                <input
                  type="text"
                  value={ideaContact}
                  onChange={(e) => setIdeaContact(e.target.value)}
                  placeholder="@username или имя (необязательно)"
                  className="w-full bg-[#171b23] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Что добавить или улучшить:
                </label>
                <textarea
                  rows={4}
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="Например: добавьте генерацию формул в формате картинок или экспорт сразу в заметки..."
                  className="w-full bg-[#171b23] border border-gray-700 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={handleSendIdea}
                disabled={submittingIdea || !ideaText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-xs font-semibold rounded-xl text-white transition-colors"
              >
                {submittingIdea ? "Отправляем..." : "Отправить идею"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
