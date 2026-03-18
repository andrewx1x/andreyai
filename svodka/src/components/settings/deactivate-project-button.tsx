"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deactivateProjectAction } from "@/app/(dashboard)/settings/projects/actions";

export function DeactivateProjectButton({ projectId }: { projectId: number }) {
  const [pending, setPending] = useState(false);

  async function handleDeactivate() {
    if (!confirm("Отключить проект? Данные сохранятся, но он перестанет отображаться.")) return;
    setPending(true);
    await deactivateProjectAction(projectId);
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDeactivate}
      disabled={pending}
    >
      {pending ? "..." : "Отключить"}
    </Button>
  );
}
