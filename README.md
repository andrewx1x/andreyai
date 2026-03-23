# Сводка — панель решений для владельцев бизнеса

Сводка анализирует ваш сайт (Яндекс.Метрика) и рекламу (Яндекс.Директ), находит проблемы и говорит что делать. Каждый день — понятный список действий вместо 50 вкладок аналитики.

## Стек

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Next.js App Router (server components + API routes)
- **Database:** Turso (LibSQL) + Drizzle ORM
- **Auth:** NextAuth v5 + Yandex OAuth
- **Email:** Resend
- **Hosting:** Timeweb Cloud (VPS) + GitHub Pages (лендинг)

## Структура

```
svodka/          — Next.js приложение (Timeweb)
docs/            — Статические лендинги (GitHub Pages → andreyai.ru)
```

## Запуск локально

```bash
cd svodka
cp .env.example .env.local  # заполнить переменные
npm install
npm run dev
```

## Деплой на Timeweb

См. `svodka/ARCHITECTURE.md` и `svodka/STATUS.md`.
