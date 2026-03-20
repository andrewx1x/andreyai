import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface TokenExpiryBannerProps {
  status: "expiring" | "expired" | "missing";
}

const config = {
  expiring: {
    bg: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    title: "Доступ к Яндексу скоро истечёт",
    description: "Переподключитесь, чтобы данные продолжали обновляться.",
    action: "Переподключить",
  },
  expired: {
    bg: "bg-rose-50 border-rose-200",
    icon: "text-rose-600",
    title: "Доступ к Яндексу истёк",
    description: "Данные не обновляются. Войдите заново через Яндекс для восстановления.",
    action: "Войти заново",
  },
  missing: {
    bg: "bg-rose-50 border-rose-200",
    icon: "text-rose-600",
    title: "Нет подключения к Яндексу",
    description: "Токен доступа не найден. Войдите через Яндекс для получения данных.",
    action: "Подключить",
  },
};

export function TokenExpiryBanner({ status }: TokenExpiryBannerProps) {
  const c = config[status];
  return (
    <div className={`border-b px-8 py-3 ${c.bg}`}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-3">
        <AlertTriangle className={`h-4 w-4 shrink-0 ${c.icon}`} />
        <div className="flex-1">
          <span className="text-[14px] font-semibold">{c.title}</span>
          <span className="ml-2 text-[13px] text-muted-foreground">{c.description}</span>
        </div>
        <Link
          href="/api/auth/signin/yandex"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium shadow-sm border transition-colors hover:bg-muted/50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {c.action}
        </Link>
      </div>
    </div>
  );
}
