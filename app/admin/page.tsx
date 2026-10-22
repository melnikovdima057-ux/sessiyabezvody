"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [testInput, setTestInput] = useState(
    "1. Первый закон термодинамики\n2. Уравнение Менделеева-Клапейрона\n3. Энтропия и второй закон"
  );
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [isPaidMode, setIsPaidMode] = useState(false);

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
    } catch (err: any) {
      setRawResponse({
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
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
    <main className="min-h-screen bg-[#0d0f12] text-gray-200 p-6 max-w-6xl mx-auto font-sans">
      <header className="flex justify-between items-center pb-6 border-b border-gray-800 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">⚙️ Debug & Admin Panel</h1>
            <span className="text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded">
              Superuser
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            СессияБезВоды • Прямой доступ к API без лимитов и оплат
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
            <div className="text-sm font-semibold text-white">Статус оплаты</div>
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
            <div className="text-sm font-semibold text-white">Сброс данных</div>
            <div className="text-xs text-gray-400">Очистить локальный кэш</div>
          </div>
          <button
            onClick={clearAppData}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors text-amber-300"
          >
            Очистить LocalStorage
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Шлюз ЮKassa</div>
            <div className="text-xs text-gray-400">ID: 1502253 (СБП 0.4%)</div>
          </div>
          <span className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 px-2 py-1 rounded">
            Активен
          </span>
        </div>
      </div>

      {/* Тестовый стенд генератора */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col gap-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Прямой тест генерации через GigaChat API:
          </label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={10}
            className="w-full bg-[#14181f] border border-gray-700 rounded-lg p-3 text-sm text-gray-200 font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button
            onClick={runAdminTest}
            disabled={loading || !testInput.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 font-semibold rounded-lg text-sm transition-colors text-white"
          >
            {loading ? "Запрос к нейросети..." : "Запустить тест без лимитов"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Сырой ответ сервера / JSON Output:
          </label>
          <div className="flex-1 bg-[#14181f] border border-gray-800 rounded-lg p-3 font-mono text-xs overflow-auto max-h-[380px] text-gray-300">
            {rawResponse ? (
              <pre>{JSON.stringify(rawResponse, null, 2)}</pre>
            ) : (
              <span className="text-gray-600 italic">
                Результат ответа появится здесь после нажатия кнопки запуска...
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
