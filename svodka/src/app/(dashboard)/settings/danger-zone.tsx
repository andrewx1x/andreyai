"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { revokeTokenAction, deleteAccountAction } from "./actions";

export function DangerZone() {
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    const result = await revokeTokenAction();
    setRevoking(false);
    if (result?.ok) setRevoked(true);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    await deleteAccountAction();
    // После удаления произойдёт redirect на /login
  }

  return (
    <div className="space-y-4">
      {/* Отзыв токена */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Отключить доступ к Яндексу</div>
          <div className="text-xs text-muted-foreground">
            Токен будет удалён. Данные перестанут обновляться.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevoke}
          disabled={revoking || revoked}
        >
          {revoking && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {revoked ? "Отключено" : "Отключить"}
        </Button>
      </div>

      {/* Удаление аккаунта */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-red-800">Удалить аккаунт</div>
            <div className="text-xs text-red-600">
              Все данные будут удалены без возможности восстановления.
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {confirmDelete ? "Подтвердить удаление" : "Удалить"}
          </Button>
        </div>
        {confirmDelete && !deleting && (
          <p className="mt-2 text-xs text-red-600">
            Нажмите ещё раз для подтверждения. Это действие необратимо.{" "}
            <button
              className="underline hover:no-underline"
              onClick={() => setConfirmDelete(false)}
            >
              Отмена
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
