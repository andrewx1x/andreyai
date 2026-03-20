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

export default function DemoAlertsPage() {
  const [projects, setProjects] = useState(demoProjects);

  function toggleAlerts(projectId: number) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, alerts: { ...p.alerts, enabled: !p.alerts.enabled } } : p
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Алерты</h1>
        <p className="text-sm text-muted-foreground">
          Настройте пороги для email-уведомлений
        </p>
      </div>

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
                <div className="space-y-3 pt-2">
                  {Object.entries(project.alerts.thresholds).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{labels[key] || key}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{value}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
