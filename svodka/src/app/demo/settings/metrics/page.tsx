"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const metrikaKpis = [
  { key: "visits", label: "Визиты", description: "Количество визитов за период" },
  { key: "users", label: "Посетители", description: "Уникальные посетители" },
  { key: "bounceRate", label: "Отказы", description: "Процент отказов" },
  { key: "pageDepth", label: "Глубина просмотра", description: "Среднее кол-во страниц за визит" },
  { key: "avgSessionDuration", label: "Время на сайте", description: "Среднее время сессии" },
  { key: "pageviews", label: "Просмотры страниц", description: "Общее число просмотров" },
];

const directKpis = [
  { key: "cost", label: "Расход", description: "Потрачено на рекламу" },
  { key: "clicks", label: "Клики", description: "Количество кликов по объявлениям" },
  { key: "ctr", label: "Кликабельность", description: "Процент кликов от показов" },
  { key: "costPerConversion", label: "Стоимость заявки", description: "Средняя цена одной конверсии" },
  { key: "conversions", label: "Конверсии", description: "Количество целевых действий" },
  { key: "impressions", label: "Показы", description: "Сколько раз показали объявления" },
];

export default function DemoMetricsPage() {
  const [metrikaSelected, setMetrikaSelected] = useState(["visits", "users", "bounceRate", "pageDepth"]);
  const [directSelected, setDirectSelected] = useState(["cost", "clicks", "ctr", "costPerConversion"]);

  function toggle(current: string[], key: string, setter: (v: string[]) => void) {
    if (current.includes(key)) {
      if (current.length <= 2) return; // min 2
      setter(current.filter((k) => k !== key));
    } else {
      if (current.length >= 6) return; // max 6
      setter([...current, key]);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Показатели</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Выберите какие метрики показывать на дашборде для каждого проекта
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-[16px]">Мой сайт</CardTitle>
            <Badge variant="outline" className="text-[11px]">Яндекс Метрика</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metrikaKpis.map((kpi) => {
              const selected = metrikaSelected.includes(kpi.key);
              return (
                <button
                  key={kpi.key}
                  onClick={() => toggle(metrikaSelected, kpi.key, setMetrikaSelected)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="text-sm font-medium">{kpi.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{kpi.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-[16px]">Яндекс Директ</CardTitle>
            <Badge variant="outline" className="text-[11px]">Яндекс Директ</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {directKpis.map((kpi) => {
              const selected = directSelected.includes(kpi.key);
              return (
                <button
                  key={kpi.key}
                  onClick={() => toggle(directSelected, kpi.key, setDirectSelected)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="text-sm font-medium">{kpi.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{kpi.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
