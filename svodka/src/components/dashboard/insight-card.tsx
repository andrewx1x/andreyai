import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import type { InsightData } from "@/lib/engine/types";

interface InsightCardProps {
  insight: InsightData;
}

export function InsightCard({ insight }: InsightCardProps) {
  const icons = {
    positive: <CheckCircle className="h-5 w-5 text-green-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    neutral: <Info className="h-5 w-5 text-blue-600" />,
  };

  const borders = {
    positive: "border-l-green-600",
    warning: "border-l-amber-600",
    neutral: "border-l-blue-600",
  };

  return (
    <Card className={`border-l-4 ${borders[insight.status]}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="mt-0.5">{icons[insight.status]}</div>
          <div className="space-y-1">
            <p className="font-medium">{insight.message}</p>
            {insight.cause && (
              <p className="text-sm text-muted-foreground">{insight.cause}</p>
            )}
            {insight.recommendation && (
              <p className="text-sm font-medium text-primary">
                {insight.recommendation}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
