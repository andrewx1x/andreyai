"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Globe, Megaphone, ScrollText, Settings, Lock } from "lucide-react";
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

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/overview" className="text-xl font-bold">
          Сводка
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isLocked = item.screen && !access[item.screen];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isLocked && "opacity-60"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {isLocked && <Lock className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      {userName && (
        <div className="border-t p-3">
          <div className="truncate px-3 py-2 text-sm text-muted-foreground">
            {userName}
          </div>
        </div>
      )}
    </aside>
  );
}
