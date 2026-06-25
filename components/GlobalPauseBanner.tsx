"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPausaGlobal } from "@/lib/actions";

export default function GlobalPauseBanner({ pausado }: { pausado: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!pausado) return null;

  function reativar() {
    setError(null);
    startTransition(async () => {
      const result = await setPausaGlobal(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <p className="text-sm font-medium text-amber-900">
          ⚠️ Bot pausado para <strong>todos</strong> os pacientes — o atendimento
          automático está desligado.
        </p>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={reativar}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Reativando..." : "Reativar bot (todos)"}
          </button>
        </div>
      </div>
    </div>
  );
}
