"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubscribeButton({
  planId,
  isCurrent,
}: {
  planId: string;
  isCurrent: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }

      // Redirect to YooKassa payment page
      window.location.href = data.confirmationUrl;
    } catch {
      setError("Не удалось создать платёж");
    } finally {
      setLoading(false);
    }
  }

  if (isCurrent) {
    return (
      <Button className="mt-4 w-full" variant="outline" disabled>
        Текущий тариф
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <Button className="w-full" onClick={handleClick} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Выбрать
      </Button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
