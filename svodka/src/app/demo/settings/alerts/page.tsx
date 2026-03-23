"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DemoProject {
  id: number;
  name: string;
  type: "metrika" | "direct";
  alerts: { enabled: boolean; thresholds: Record<string, number> };
}

const demoProjects: DemoProject[] = [
  {
    id: 1,
    name: "Мой сайт",
    type: "metrika",
    alerts: { enabled: true, thresholds: { traffic_drop: 20, bounce_increase: 15, conversion_drop: 15 } },
  },
  {
    id: 2,
    name: "Яндекс Директ",
    type: "direct",
    alerts: { enabled: true, thresholds: { cost_spike: 30, ctr_drop: 20, cpa_spike: 30 } },
  },
];

const metrikaLabels: Record<string, string> = {
  traffic_drop: "Падение трафика",
  bounce_increase: "Рост отказов",
  conversion_drop: "Падение конверсий",
};

const directLabels: Record<string, string> = {
  cost_spike: "Рост расхода",
  ctr_drop: "Падение CTR",
  cpa_spike: "Рост стоимости заявки",
};

const frequencyOptions = [
  { value: "instant", label: "Сразу при обнаружении" },
  { value: "4h", label: "Не чаще 1 раз в 4 часа" },
  { value: "daily", label: "1 раз в день (утром)" },
];

const priorityGoals = [
  { id: 1, name: "Заявка с формы", checked: true },
  { id: 2, name: "Звонок", checked: true },
  { id: 3, name: "Покупка", checked: false },
];

const criticalCampaigns = [
  { id: 1, name: "Поиск — Основная", critical: true },
  { id: 2, name: "РСЯ — Ретаргетинг", critical: true },
  { id: 3, name: "Поиск — Бренд", critical: false },
  { id: 4, name: "РСЯ — Холодная", critical: false },
];

export default function DemoAlertsPage() {
  const [projects, setProjects] = useState(demoProjects);
  const [frequency, setFrequency] = useState("4h");
  const [goals, setGoals] = useState(priorityGoals);
  const [campaigns, setCampaigns] = useState(criticalCampaigns);

  function toggleAlerts(projectId: number) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, alerts: { ...p.alerts, enabled: !p.alerts.enabled } } : p
      )
    );
  }

  function updateThreshold(projectId: number, key: string, val: number) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, alerts: { ...p.alerts, thresholds: { ...p.alerts.thresholds, [key]: val } } }
          : p
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Алерты</h1>
        <p className="text-sm text-muted-foreground">
          Настройте какие сигналы получать, пороги и частоту уведомлений
        </p>
      </div>

      {/* Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Частота уведомлений</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {frequencyOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  value={opt.value}
                  checked={frequency === opt.value}
                  onChange={() => setFrequency(opt.value)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Главные цели</CardTitle>
          <p className="text-xs text-muted-foreground">Какие конверсии считать приоритетными для расчёта стоимости заявки</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {goals.map((goal, i) => (
              <label key={goal.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={goal.checked}
                  onChange={() => {
                    const next = [...goals];
                    next[i] = { ...goal, checked: !goal.checked };
                    setGoals(next);
                  }}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm">{goal.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Критичные кампании</CardTitle>
          <p className="text-xs text-muted-foreground">Для этих кампаний алерты будут приходить при любом отклонении</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaigns.map((c, i) => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.critical}
                  onChange={() => {
                    const next = [...campaigns];
                    next[i] = { ...c, critical: !c.critical };
                    setCampaigns(next);
                  }}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm">{c.name}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thresholds per project */}
      {projects.map((project) => {
        const labels = project.type === "metrika" ? metrikaLabels : directLabels;
        return (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {project.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({project.type === "metrika" ? "Метрика" : "Директ"})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email-уведомления</span>
                <button
                  onClick={() => toggleAlerts(project.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    project.alerts.enabled ? "bg-indigo-600" : "bg-gray-200"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    project.alerts.enabled ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              {project.alerts.enabled && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground">Порог срабатывания — минимальное изменение в %, при котором вы получите алерт</p>
                  {Object.entries(project.alerts.thresholds).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{labels[key] || key}</span>
                        <Badge variant="outline">{value}%</Badge>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={value}
                        onChange={(e) => updateThreshold(project.id, key, Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>5% (чувствительно)</span>
                        <span>50% (только критичное)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Save button */}
      <button className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
        Сохранить настройки
      </button>
    </div>
  );
}
