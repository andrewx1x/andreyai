import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Signal } from "@/lib/engine/types";

interface SignalBadgeProps {
  signal: Signal;
  showCause?: boolean;
}

export function SignalBadge({ signal, showCause }: SignalBadgeProps) {
  const icons = {
    critical: <AlertCircle className="h-4 w-4 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
    info: <Info className="h-4 w-4 shrink-0" />,
  };

  const variants = {
    critical: "bg-rose-50 text-rose-800 border border-rose-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    info: "bg-blue-50 text-blue-800 border border-blue-200",
  };

  const channelLabels = { site: "Сайт", ads: "Реклама" };

  return (
    <div className={`rounded-xl px-4 py-3 text-[14px] ${variants[signal.severity]}`}>
      <div className="flex items-center gap-2.5">
        {icons[signal.severity]}
        <span className="flex-1 font-medium">{signal.message}</span>
        {signal.channel && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {channelLabels[signal.channel]}
          </Badge>
        )}
      </div>
      {showCause && signal.cause && (
        <p className="mt-1.5 pl-[26px] text-[13px] opacity-70">{signal.cause}</p>
      )}
    </div>
  );
}
