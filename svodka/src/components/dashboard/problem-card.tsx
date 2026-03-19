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
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    border: "border-l-rose-500",
    label: "Критично",
    dot: "bg-rose-500",
  },
  high: {
    icon: AlertTriangle,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    border: "border-l-amber-500",
    label: "Важно",
    dot: "bg-amber-500",
  },
  medium: {
    icon: AlertTriangle,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    border: "border-l-blue-500",
    label: "Внимание",
    dot: "bg-blue-500",
  },
  low: {
    icon: AlertTriangle,
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    border: "border-l-gray-400",
    label: "Инфо",
    dot: "bg-gray-400",
  },
};

const channelLabels = {
  site: "Сайт",
  ads: "Реклама",
  cross: "Сайт + Реклама",
};

export function ProblemCard({ problem, index }: ProblemCardProps) {
  const config = priorityConfig[problem.priority];

  return (
    <Card className={cn("border-l-4 transition-shadow hover:shadow-md", config.border)}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
              config.dot
            )}
          >
            {index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-snug">{problem.title}</h3>
              <Badge variant="outline" className={cn("text-[11px]", config.badge)}>
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {channelLabels[problem.channel]}
              </Badge>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {problem.description}
            </p>
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-medium">Причина:</span> {problem.cause}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
