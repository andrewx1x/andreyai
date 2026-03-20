"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchUserCounters, setupProjects } from "@/app/onboarding/actions";
import type { MetrikaCounter } from "@/lib/engine/metrika/api";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "select" | "saving">("loading");
  const [counters, setCounters] = useState<MetrikaCounter[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadCounters = useCallback(async () => {
    const result = await fetchUserCounters();
    if (result.error) {
      setError(result.error);
      setStep("select");
      return;
    }
    setCounters(result.counters);
    // Select all by default
    setSelected(new Set(result.counters.map((c) => c.id)));
    setStep("select");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    loadCounters();
  }, [loadCounters]);

  function toggleCounter(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleComplete() {
    setStep("saving");
    const selectedCounters = counters
      .filter((c) => selected.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, site: c.site }));

    const result = await setupProjects(selectedCounters);
    if (result.error) {
      setError(result.error);
      setStep("select");
      return;
    }

    router.push("/overview");
  }

  if (step === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Загрузка ваших данных...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Добро пожаловать в Сводку</CardTitle>
        <p className="text-muted-foreground">
          {counters.length > 0
            ? "Мы нашли ваши счётчики Яндекс.Метрики. Выберите, какие подключить."
            : "Счётчики не найдены. Убедитесь, что у вашего Яндекс-аккаунта есть доступ к Метрике."}
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {counters.length > 0 ? (
          <div className="space-y-3">
            {counters.map((counter) => (
              <button
                key={counter.id}
                onClick={() => toggleCounter(counter.id)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  selected.has(counter.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div>
                  <div className="font-medium">{counter.site || counter.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {counter.id}
                  </div>
                </div>
                <Badge variant={selected.has(counter.id) ? "default" : "outline"}>
                  {selected.has(counter.id) ? "Выбрано" : "Не выбрано"}
                </Badge>
              </button>
            ))}

            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={handleComplete}
              disabled={selected.size === 0 || step === "saving"}
            >
              {step === "saving"
                ? "Настраиваем..."
                : `Подключить ${selected.size} ${selected.size === 1 ? "счётчик" : "счётчиков"}`}
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Попробуйте войти с другим аккаунтом Яндекса.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
