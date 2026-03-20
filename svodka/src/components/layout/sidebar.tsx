"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Megaphone, ScrollText, Settings, Lock, Zap, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  access: {
    overview: boolean;
    site: boolean;
    ads: boolean;
  };
  userName?: string | null;
}

const navItems = [
  { href: "/overview", label: "Обзор", icon: LayoutDashboard, screen: "overview" as const },
  { href: "/site", label: "Сайт", icon: Globe, screen: "site" as const },
  { href: "/ads", label: "Реклама", icon: Megaphone, screen: "ads" as const },
  { href: "/events", label: "Журнал", icon: ScrollText, screen: null },
  { href: "/settings", label: "Настройки", icon: Settings, screen: null },
];

export function Sidebar({ access, userName }: SidebarProps) {
  const pathname = usePathname();

  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border/60 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Zap className="h-4 w-4" />
        </div>
        <Link href="/overview" className="text-lg font-bold tracking-tight">
          Сводка
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Разделы
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isLocked = item.screen && !access[item.screen];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                isLocked && "opacity-50"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-indigo-600")} />
              {item.label}
              {isLocked && <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Support */}
      <div className="px-3">
        <a
          href="https://t.me/svodka_support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Поддержка
        </a>
      </div>

      {/* Footer */}
      {userName && (
        <div className="shrink-0 border-t border-border/60 px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
              {initials}
            </div>
            <p className="truncate text-[13px] font-medium">{userName}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
