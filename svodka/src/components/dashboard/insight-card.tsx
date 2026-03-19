import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, Info } from "lucide-react";
import type { InsightData } from "@/lib/engine/types";

interface InsightCardProps {
  insight: InsightData;
}

export function InsightCard({ insight }: InsightCardProps) {
  const icons = {
    positive: <Lightbulb className="h-5 w-5 text-emerald-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    neutral: <Info className="h-5 w-5 text-blue-600" />,
  };

  const styles = {
    positive: {
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/50",
      label: "text-emerald-700",
    },
    warning: {
      border: "border-l-amber-500",
      bg: "bg-amber-50/50",
      label: "text-amber-700",
    },
    neutral: {
      border: "border-l-blue-500",
      bg: "bg-blue-50/50",
      label: "text-blue-700",
    },
  };

  const s = styles[insight.status];

  return (
    <Card className={`border-l-4 ${s.border} ${s.bg}`}>
      <CardContent className="px-5 py-4">
        <div className="flex gap-4">
          <div className="mt-0.5 shrink-0">{icons[insight.status]}</div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold leading-snug">{insight.message}</p>
            {insight.cause && (
              <p className="text-[14px] text-muted-foreground">{insight.cause}</p>
            )}
            {insight.recommendation && (
              <p className={`text-[14px] font-semibold ${s.label}`}>
                &rarr; {insight.recommendation}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
