"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, GripVertical } from "lucide-react";
import { updateVisibleKpis } from "@/app/(dashboard)/settings/metrics/actions";

interface MetricItem {
  key: string;
  label: string;
  description: string;
  invertColors?: boolean;
}

interface MetricPickerFormProps {
  projectId: number;
  projectName: string;
  projectType: "metrika" | "direct";
  catalog: MetricItem[];
  currentSelection: string[];
}

export function MetricPickerForm({
  projectId,
  projectName,
  projectType,
  catalog,
  currentSelection,
}: MetricPickerFormProps) {
  const [selected, setSelected] = useState<string[]>(currentSelection);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateVisibleKpis(projectId, selected);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  const hasChanges =
    JSON.stringify(selected.sort()) !== JSON.stringify(currentSelection.sort());

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((metric) => {
          const isSelected = selected.includes(metric.key);
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => toggle(metric.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all",
                isSelected
                  ? "border-indigo-500 bg-indigo-50/50 shadow-sm"
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  isSelected
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <div>
                <p className="text-[14px] font-semibold">{metric.label}</p>
                <p className="text-[13px] text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending || selected.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isPending ? "Сохраняю..." : "Сохранить"}
        </Button>
        {saved && (
          <span className="text-[13px] font-medium text-emerald-600">
            Сохранено
          </span>
        )}
        {selected.length === 0 && (
          <span className="text-[13px] text-rose-600">
            Выберите хотя бы один показатель
          </span>
        )}
        <span className="ml-auto text-[13px] text-muted-foreground">
          Выбрано: {selected.length} из {catalog.length}
        </span>
      </div>
    </div>
  );
}
