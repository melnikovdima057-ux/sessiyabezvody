"use client";

import React, { useState, useEffect } from "react";

interface Review {
  id: string;
  name: string;
  subject: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}

interface IdeaItem {
  id: string;
  contact: string;
  text: string;
  date: string;
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "7788") {
      setAuthorized(true);
      fetchAdminData();
    } else {
      alert("Неверный PIN-код");
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resRev, resIdeas] = await Promise.all([
        fetch("/api/reviews?all=true"),
        fetch("/api/ideas"),
      ]);
      if (resRev.ok) setReviews(await resRev.json());
      if (resIdeas.ok) setIdeas(await resIdeas.json());
    } catch (e) {
      alert("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (id: string, action: "approve" | "delete") => {
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
      }
    } catch (e) {
      alert("Ошибка действия с отзывом");
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      const res = await fetch("/api/ideas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas);
      }
    } catch (e) {
      alert("Ошибка удаления идеи");
    }
  };

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#0d0f12] text-gray-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-xs flex flex-col gap-4 text-center shadow-2xl"
        >
          <div className="text-2xl font-black text-indigo-400">ExamZero Admin</div>
          <p className="text-xs text-gray-400">Введи PIN-код для входа</p>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="****"
            className="bg-[#14181f] border border-gray-700 rounded-lg p-2.5 text-center text-xl tracking-widest text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            type="submit"
            className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-lg text-white transition-colors"
          >
            Войти
          </button>
        </form>
      </main>
    );
  }

  const pendingReviews = reviews.filter((r) => !r.approved);
  const approvedReviews = reviews.filter((r) => r.approved);

  return (
    <main className="min-h-screen bg-[#0d0f12] text-gray-100 p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-black text-white">Панель управления ExamZero</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Модерация отзывов и предложенные идеи
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
        >
          ↻ Обновить
        </button>
      </header>

      {/* Раздел: Идеи от пользователей */}
      <section>
        <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>💡 Предложенные идеи ({ideas.length})</span>
        </h2>

        {ideas.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl text-xs text-gray-500 text-center">
            Пока нет новых предложений
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 border border-indigo-900/40 p-4 rounded-xl flex justify-between items-start gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs text-white">{item.contact}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{item.date}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {item.text}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteIdea(item.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/40 border border-rose-900/50 shrink-0"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ожидают модерации отзывы */}
      <section>
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>⏳ Отзывы на проверке ({pendingReviews.length})</span>
        </h2>

        {pendingReviews.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl text-xs text-gray-500 text-center">
            Новых отзывов на модерации нет
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((r) => (
              <div
                key={r.id}
                className="bg-gray-900 border border-amber-500/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{r.name}</span>
                    <span className="text-xs text-amber-400 font-mono">
                      {"★".repeat(r.rating)}
                    </span>
                    <span className="text-[11px] text-gray-400">({r.subject})</span>
                  </div>
                  <p className="text-xs text-gray-300">«{r.text}»</p>
                  <span className="text-[10px] text-gray-500">{r.date}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReviewAction(r.id, "approve")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✓ Одобрить
                  </button>
                  <button
                    onClick={() => handleReviewAction(r.id, "delete")}
                    className="text-xs bg-rose-600/80 hover:bg-rose-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ✕ Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Опубликованные отзывы */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>✓ Опубликованные отзывы ({approvedReviews.length})</span>
        </h2>

        <div className="space-y-2">
          {approvedReviews.map((r) => (
            <div
              key={r.id}
              className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center text-xs"
            >
              <div>
                <span className="font-bold text-white mr-2">{r.name}</span>
                <span className="text-amber-400 font-mono mr-2">
                  {"★".repeat(r.rating)}
                </span>
                <span className="text-gray-400 mr-2">[{r.subject}]</span>
                <span className="text-gray-300">«{r.text}»</span>
              </div>
              <button
                onClick={() => handleReviewAction(r.id, "delete")}
                className="text-[11px] text-rose-400 hover:text-rose-300 ml-3 shrink-0"
              >
                Снять с сайта
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
