"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPausa } from "@/lib/actions";

export default function PausarBotToggle({
  telefone,
  pausado,
}: {
  telefone: string;
  pausado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await setPausa(telefone, !pausado);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          pausado
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {isPending ? "..." : pausado ? "Retomar bot" : "Pausar bot"}
      </button>
      {error && (
        <span className="text-[11px] text-red-600">Falha ao atualizar</span>
      )}
    </div>
  );
}
