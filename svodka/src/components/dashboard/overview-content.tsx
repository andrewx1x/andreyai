import { StatusHero } from "@/components/dashboard/status-hero";
import { ProblemCard } from "@/components/dashboard/problem-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessStatus, Problem, Action, InsightData } from "@/lib/engine/types";

interface OverviewContentProps {
  status: BusinessStatus;
  problems: Problem[];
  actions: Action[];
  insight: InsightData;
  updatedAt?: string; // ISO timestamp
}

export function OverviewContent({ status, problems, actions, insight, updatedAt }: OverviewContentProps) {
  const criticalCount = problems.filter((p) => p.priority === "critical").length;

  return (
    <div className="space-y-10">
      {/* ── Время обновления ── */}
      {updatedAt && (
        <p className="text-xs text-muted-foreground -mb-6">
          Данные обновлены: {new Date(updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {/* ── Светофор ── */}
      <StatusHero
        status={status}
        problemCount={problems.length}
        criticalCount={criticalCount}
      />

      {/* ── Проблемы ── */}
      {problems.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-rose-400" />
            Что не так
          </h2>
          <div className="space-y-3">
            {problems.map((problem, i) => (
              <ProblemCard key={problem.id} problem={problem} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Действия ── */}
      {actions.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-1 w-4 rounded-full bg-indigo-400" />
            Что делать сегодня
          </h2>
          <div className="space-y-3">
            {actions.map((action, i) => (
              <ActionCard key={action.id} action={action} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Инсайт ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-1 w-4 rounded-full bg-amber-400" />
          Инсайт
        </h2>
        <InsightCard insight={insight} />
      </section>

      {/* ── Всё хорошо ── */}
      {status === "healthy" && problems.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[14px] text-muted-foreground">
              Мы проверяем ваши данные каждые 15 минут. Если что-то изменится — сообщим.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
