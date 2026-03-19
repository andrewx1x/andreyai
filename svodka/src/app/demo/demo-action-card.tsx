import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Globe, Megaphone, Settings } from "lucide-react";
import type { Action } from "@/lib/engine/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DemoActionCardProps {
  action: Action;
  index: number;
}

const urgencyConfig = {
  urgent: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    label: "Срочно",
    dot: "bg-rose-500",
  },
  high: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Важно",
    dot: "bg-amber-500",
  },
  medium: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Средне",
    dot: "bg-blue-500",
  },
  low: {
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    label: "Низкий",
    dot: "bg-gray-400",
  },
};

const screenConfig = {
  site: { icon: Globe, href: "/demo/site", label: "Сайт" },
  ads: { icon: Megaphone, href: "/demo/ads", label: "Реклама" },
  settings: { icon: Settings, href: "/demo", label: "Настройки" },
};

export function DemoActionCard({ action, index }: DemoActionCardProps) {
  const urgency = urgencyConfig[action.urgency];
  const screen = action.screen ? screenConfig[action.screen] : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
              urgency.dot
            )}
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-snug">{action.title}</h3>
              <Badge variant="outline" className={cn("text-[11px]", urgency.badge)}>
                {urgency.label}
              </Badge>
            </div>
            <p className="text-[14px] text-muted-foreground">{action.description}</p>
          </div>
          {screen && (
            <Link
              href={screen.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <screen.icon className="h-3.5 w-3.5" />
              {screen.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
