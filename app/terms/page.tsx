import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 py-12 px-4 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться на главную</span>
        </Link>

        <div className="space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs uppercase font-bold tracking-wider">Юридическая информация</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Пользовательское соглашение и публичная оферта
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Редакция от 20 октября 2026 года</p>
          </div>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="text-base font-semibold text-white">1. Общие положения</h2>
            <p>
              Настоящий документ является официальным предложением (публичной офертой) плательщика налога на
              профессиональный доход (самозанятого) Мельникова Дмитрия Дмитриевича (далее — Исполнитель) и определяет
              условия предоставления цифрового доступа к веб-сервису «СессияБезВоды».
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="text-base font-semibold text-white">2. Предмет оферты</h2>
            <p>
              Исполнитель предоставляет Заказчику информационные услуги по автоматизированной структуризации и
              конспектированию учебных материалов (экзаменационных вопросов и билетов) с помощью нейросетевых моделей.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="text-base font-semibold text-white">3. Тарифы и порядок расчетов</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-300">
              <li>Базовый ознакомительный доступ (до 2 билетов включительно) предоставляется без взимания платы.</li>
              <li>Стоимость обработки каждого дополнительного билета составляет 10 (десять) рублей.</li>
              <li>
                Оплата производится в рублях РФ безналичным расчетом через платежный шлюз ЮKassa (СБП, банковские карты,
                электронные средства платежа).
              </li>
            </ul>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="text-base font-semibold text-white">4. Порядок оказания услуг и доставка</h2>
            <p>
              Услуга является полностью цифровой. Доступ к сгенерированным ответам предоставляется мгновенно в окне
              браузера пользователя сразу после подтверждения успешной транзакции платежной системой. Физическая доставка
              не предусмотрена.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <h2 className="text-base font-semibold text-white">5. Условия возврата</h2>
            <p>
              В случае технического сбоя, при котором оплаченная услуга не была фактически предоставлена, возврат
              денежных средств осуществляется по письменному обращению Заказчика на электронную почту службы поддержки в
              течение 3 рабочих дней.
            </p>
          </section>

          <section className="pt-4 border-t border-zinc-800 text-sm space-y-2">
            <h2 className="text-base font-semibold text-white">6. Реквизиты и контакты исполнителя</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Исполнитель:</span>
                <span className="text-white font-medium">Мельников Дмитрий Дмитриевич</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Статус:</span>
                <span className="text-emerald-400 font-medium">Самозанятый (НПД)</span>
              </div>
              <div>
                <span className="text-zinc-500 block">ИНН:</span>
                <span className="text-white font-medium">540212274813</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Email для поддержки:</span>
                <span className="text-indigo-400 font-medium">themoon902448@gmail.com</span>
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* Футер для модерации и юридических реквизитов */}
      <footer className="no-print mt-16 border-t border-zinc-800/80 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 СессияБезВоды. Самозанятый Мельников Д. Д., ИНН 540212274813
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <a href="/terms" className="hover:text-indigo-300 underline underline-offset-2 transition-colors">
              Оферта и реквизиты
            </a>
            <a href="mailto:themoon902448@gmail.com" className="hover:text-indigo-300 transition-colors">
              Поддержка: themoon902448@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
    </div>
  );
}
