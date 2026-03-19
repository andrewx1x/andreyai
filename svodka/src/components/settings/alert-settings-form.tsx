"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateAlertSettings } from "@/app/(dashboard)/settings/alerts/actions";

interface AlertSettingsFormProps {
  projectId: number;
  projectType: string;
  alerts: {
    enabled: boolean;
    thresholds: Record<string, number>;
  };
}

const metrikaThresholds = [
  { key: "traffic_drop", label: "Падение трафика", suffix: "%" },
  { key: "bounce_increase", label: "Рост отказов", suffix: "%" },
  { key: "conversion_drop", label: "Падение конверсии", suffix: "%" },
];

const directThresholds = [
  { key: "cpa_increase", label: "Рост стоимости заявки", suffix: "%" },
  { key: "ctr_drop", label: "Падение кликабельности", suffix: "%" },
  { key: "spend_limit", label: "Лимит расхода", suffix: "₽" },
];

export function AlertSettingsForm({ projectId, projectType, alerts }: AlertSettingsFormProps) {
  const [enabled, setEnabled] = useState(alerts.enabled);
  const [thresholds, setThresholds] = useState<Record<string, number>>(alerts.thresholds || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const items = projectType === "metrika" ? metrikaThresholds : directThresholds;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateAlertSettings(projectId, { enabled, thresholds });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm">Включить email-алерты</span>
      </label>

      {enabled && (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <label className="min-w-[160px] text-sm text-muted-foreground">
                {item.label}
              </label>
              <input
                type="number"
                value={thresholds[item.key] || 20}
                onChange={(e) =>
                  setThresholds((prev) => ({
                    ...prev,
                    [item.key]: Number(e.target.value),
                  }))
                }
                className="w-20 rounded-md border px-2 py-1 text-sm"
                min={1}
              />
              <span className="text-sm text-muted-foreground">{item.suffix}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>
        {saved && <span className="text-sm text-green-600">Сохранено</span>}
      </div>
    </div>
  );
}
