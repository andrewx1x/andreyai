import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  suffix?: string;
  invertColors?: boolean; // true for bounce rate (growth = bad)
}

export function KpiCard({ label, value, change, suffix, invertColors }: KpiCardProps) {
  const isPositive = invertColors ? (change ?? 0) < 0 : (change ?? 0) > 0;
  const isNegative = invertColors ? (change ?? 0) > 0 : (change ?? 0) < 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {value}
            {suffix && <span className="text-base font-normal text-muted-foreground">{suffix}</span>}
          </span>
          {change !== undefined && change !== 0 && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-sm font-medium",
                isPositive && "text-green-600",
                isNegative && "text-red-600",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {change > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : change < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {change > 0 ? "+" : ""}
              {change.toFixed(0)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
