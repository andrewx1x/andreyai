import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import type { Problem } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

interface ProblemCardProps {
  problem: Problem;
  index: number;
}

const priorityConfig = {
  critical: {
    icon: AlertCircle,
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    border: "border-l-red-500",
    label: "Критично",
  },
  high: {
    icon: AlertTriangle,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    border: "border-l-amber-500",
    label: "Важно",
  },
  medium: {
    icon: AlertTriangle,
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    border: "border-l-blue-500",
    label: "Внимание",
  },
  low: {
    icon: AlertTriangle,
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    border: "border-l-gray-400",
    label: "Инфо",
  },
};

const channelLabels = {
  site: "Сайт",
  ads: "Реклама",
  cross: "Сайт + Реклама",
};

export function ProblemCard({ problem, index }: ProblemCardProps) {
  const config = priorityConfig[problem.priority];
  const Icon = config.icon;

  return (
    <Card className={cn("border-l-4", config.border)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="font-medium leading-tight">{problem.title}</h3>
              <Badge variant="outline" className={cn("shrink-0 text-xs", config.badge)}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="shrink-0 text-xs">
                {channelLabels[problem.channel]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{problem.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Причина:</span> {problem.cause}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
