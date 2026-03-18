import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Globe, Megaphone, Settings } from "lucide-react";
import type { Action } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ActionCardProps {
  action: Action;
  index: number;
}

const urgencyConfig = {
  urgent: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    label: "Срочно",
  },
  high: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Важно",
  },
  medium: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    label: "Средне",
  },
  low: {
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    label: "Низкий",
  },
};

const screenConfig = {
  site: { icon: Globe, href: "/site", label: "Сайт" },
  ads: { icon: Megaphone, href: "/ads", label: "Реклама" },
  settings: { icon: Settings, href: "/settings", label: "Настройки" },
};

export function ActionCard({ action, index }: ActionCardProps) {
  const urgency = urgencyConfig[action.urgency];
  const screen = action.screen ? screenConfig[action.screen] : null;

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-tight">{action.title}</h3>
              <Badge variant="outline" className={cn("shrink-0 text-xs", urgency.badge)}>
                {urgency.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </div>
          {screen && (
            <Link
              href={screen.href}
              className="flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <screen.icon className="h-3 w-3" />
              {screen.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
