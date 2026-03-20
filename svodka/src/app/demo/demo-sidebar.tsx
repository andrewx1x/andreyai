"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Megaphone, ScrollText, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/demo", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/demo/site", label: "Сайт", icon: Globe, exact: false },
  { href: "/demo/ads", label: "Реклама", icon: Megaphone, exact: false },
  { href: "/demo/events", label: "Журнал", icon: ScrollText, exact: false },
  { href: "/demo/settings", label: "Настройки", icon: Settings, exact: false },
];

export function DemoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border/60 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Zap className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold tracking-tight">Сводка</span>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
          демо
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Разделы
        </p>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-indigo-600")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/60 px-4 py-3">
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-600">
            Д
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">Демо-пользователь</p>
            <p className="truncate text-[11px] text-muted-foreground">demo@svodka.ru</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
