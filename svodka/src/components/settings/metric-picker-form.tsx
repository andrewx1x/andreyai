"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggle = (key: string) => {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const moveUp = (key: string) => {
    setSaved(false);
    setSelected((prev) => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (key: string) => {
    setSaved(false);
    setSelected((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDrop = (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setSaved(false);
    setSelected((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
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
    JSON.stringify(selected) !== JSON.stringify(currentSelection);

  // Split: selected items (ordered) + unselected items
  const selectedCatalog = selected
    .map((key) => catalog.find((m) => m.key === key))
    .filter(Boolean) as MetricItem[];

  const unselectedCatalog = catalog.filter((m) => !selected.includes(m.key));

  return (
    <div className="space-y-6">
      {/* Selected metrics — reorderable */}
      {selectedCatalog.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Выбранные показатели (перетащите для изменения порядка)
          </p>
          <div className="space-y-1.5">
            {selectedCatalog.map((metric, idx) => (
              <div
                key={metric.key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 border-indigo-500 bg-indigo-50/50 px-3 py-2.5 transition-all",
                  dragIndex === idx && "opacity-40",
                  dragOverIndex === idx && dragIndex !== idx && "ring-2 ring-indigo-300"
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-indigo-500 bg-indigo-500 text-white cursor-pointer"
                  onClick={() => toggle(metric.key)}
                >
                  <Check className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{metric.label}</p>
                  <p className="text-[12px] text-muted-foreground truncate">{metric.description}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveUp(metric.key)}
                    disabled={idx === 0}
                    className="rounded p-0.5 hover:bg-indigo-100 disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(metric.key)}
                    disabled={idx === selectedCatalog.length - 1}
                    className="rounded p-0.5 hover:bg-indigo-100 disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unselected metrics */}
      {unselectedCatalog.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Доступные показатели
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {unselectedCatalog.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => toggle(metric.key)}
                className="flex items-start gap-3 rounded-xl border-2 border-border px-4 py-3 text-left transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground/30" />
                <div>
                  <p className="text-[14px] font-semibold">{metric.label}</p>
                  <p className="text-[13px] text-muted-foreground">{metric.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
