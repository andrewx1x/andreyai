import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Signal } from "@/lib/engine/types";

interface SignalBadgeProps {
  signal: Signal;
  showCause?: boolean;
}

export function SignalBadge({ signal, showCause }: SignalBadgeProps) {
  const icons = {
    critical: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
    info: <Info className="h-3.5 w-3.5 shrink-0" />,
  };

  const variants = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const channelLabels = { site: "Сайт", ads: "Реклама" };

  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${variants[signal.severity]}`}>
      <div className="flex items-center gap-2">
        {icons[signal.severity]}
        <span className="flex-1">{signal.message}</span>
        {signal.channel && (
          <Badge variant="outline" className="shrink-0 text-xs">
            {channelLabels[signal.channel]}
          </Badge>
        )}
      </div>
      {showCause && signal.cause && (
        <p className="mt-1 pl-5.5 text-xs opacity-80">{signal.cause}</p>
      )}
    </div>
  );
}
