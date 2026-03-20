import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { BusinessStatus } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

interface StatusHeroProps {
  status: BusinessStatus;
  problemCount: number;
  criticalCount: number;
}

const config = {
  healthy: {
    icon: CheckCircle2,
    bg: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-600",
    textColor: "text-emerald-900",
    message: "Всё в порядке. Проблем не обнаружено.",
  },
  attention: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    textColor: "text-amber-900",
    message: (count: number) => `Есть вопросы. ${count} ${pluralProblems(count)} требу${count === 1 ? "ет" : "ют"} внимания.`,
  },
  critical: {
    icon: ShieldAlert,
    bg: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
    textColor: "text-rose-900",
    message: (count: number) => `Нужно вмешательство. ${count} критическ${count === 1 ? "ая проблема" : "их проблем"}.`,
  },
};

function pluralProblems(n: number): string {
  if (n === 1) return "проблема";
  if (n >= 2 && n <= 4) return "проблемы";
  return "проблем";
}

export function StatusHero({ status, problemCount, criticalCount }: StatusHeroProps) {
  const c = config[status];
  const Icon = c.icon;
  const message =
    status === "healthy"
      ? (c as typeof config.healthy).message
      : status === "attention"
        ? (config.attention.message as (n: number) => string)(problemCount)
        : (config.critical.message as (n: number) => string)(criticalCount);

  return (
    <div className={cn("flex items-center gap-5 rounded-xl border px-6 py-8", c.bg)}>
      <Icon className={cn("h-10 w-10 shrink-0", c.iconColor)} />
      <p className={cn("text-lg font-semibold", c.textColor)}>{message}</p>
    </div>
  );
}
