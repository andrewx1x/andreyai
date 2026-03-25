"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept(type: "all" | "necessary") {
    localStorage.setItem("cookie-consent", type);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-slate-600 mb-3 sm:mb-0">
          Мы используем cookies для работы сервиса и аналитики.{" "}
          <Link
            href="https://andreyai.ru/legal/privacy.html"
            className="text-emerald-600 hover:underline"
          >
            Подробнее
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => accept("necessary")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Только необходимые
          </button>
          <button
            onClick={() => accept("all")}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
          >
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}
