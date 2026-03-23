import { signIn } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
      {/* Левая часть — информация о продукте */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-emerald-600 p-12 text-white relative overflow-hidden">
        {/* Декоративные элементы */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-700 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />

        <div className="relative z-10">
          <Link href="https://andreyai.ru" className="inline-flex items-center gap-2 text-2xl font-bold">
            Сводка
          </Link>
          <p className="mt-2 text-emerald-100 text-sm">Панель решений для бизнеса</p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-bold leading-tight">
            Контролируйте сайт и рекламу<br />без входа в Яндекс
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                🔍
              </div>
              <div>
                <h3 className="font-semibold text-lg">Находит проблемы</h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Падение трафика, рост CPA, неработающие цели — вы узнаете первым
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                💡
              </div>
              <div>
                <h3 className="font-semibold text-lg">Говорит что делать</h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Не просто графики — конкретные действия для исправления ситуации
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div>
                <h3 className="font-semibold text-lg">Экономит 2 часа в день</h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Всё важное на одном экране вместо 5 вкладок Яндекса
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-6 text-sm text-emerald-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Только чтение
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Пароль не передаётся
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Отключить в 1 клик
            </span>
          </div>
        </div>
      </div>

      {/* Правая часть — форма входа */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Мобильный логотип */}
          <div className="lg:hidden text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">Сводка</h1>
            <p className="text-slate-500">Панель решений для бизнеса</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 lg:text-3xl">Войти в Сводку</h2>
            <p className="text-slate-500">
              Подключите Яндекс Метрику и Директ одним действием
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("yandex", { redirectTo: "/onboarding" });
            }}
            className="space-y-4"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FC3F1D] px-6 py-4 text-base font-semibold text-white transition-all hover:bg-[#E53510] hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98]"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13.32 7.67h-.67c-1.37 0-2.09.6-2.09 1.64 0 1.17.55 1.8 1.67 2.58l.93.64-2.72 4.47H8.5l2.43-3.97c-1.45-1.04-2.25-2.07-2.25-3.72 0-2.07 1.47-3.45 4.02-3.45h2.3v11.14h-1.68V7.67z"
                  fill="currentColor"
                />
              </svg>
              Войти через Яндекс
            </button>
          </form>

          {/* Что произойдёт */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700">После входа:</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
                Выберете проекты из Метрики и Директа
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">2</span>
                Сводка соберёт данные за последние 7 дней
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">3</span>
                Увидите проблемы, тренды и рекомендации
              </div>
            </div>
          </div>

          {/* Тарифы */}
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span>7 дней бесплатно</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>от 990 ₽/мес</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>без привязки карты</span>
          </div>

          {/* Безопасность (мобильная) */}
          <div className="lg:hidden rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              OAuth — доступ только на чтение
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Пароль не передаётся
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Можно отключить в любой момент
            </div>
          </div>

          {/* Ссылки */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link href="https://andreyai.ru" className="text-slate-400 hover:text-slate-600 transition">
              О продукте
            </Link>
            <span className="text-slate-200">|</span>
            <Link href="https://app.andreyai.ru/demo" className="text-slate-400 hover:text-slate-600 transition">
              Демо
            </Link>
            <span className="text-slate-200">|</span>
            <Link href="https://andreyai.ru/portfolio/" className="text-slate-400 hover:text-slate-600 transition">
              Контакты
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
